<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Browser tests for the Fail2Ban page: security preset slider, the metric
 * panel under it, and the dedicated "Trusted addresses" tab.
 *
 * The Settings tab carries the slider (0–3 presets) and a panel rendering
 * the current preset's maxretry / findtime / bantime / MaxReqSec values.
 * Whitelist management lives on its own tab — the legacy textarea is gone,
 * replaced by a single input that doubles as a live filter and bulk-add
 * field, plus a DataTable with per-row delete buttons. Manual entries are
 * committed through PATCH /fail2ban on every add/remove, so this test
 * deliberately exercises the per-action HTTP round-trip rather than relying
 * on the form's Save button for the whitelist part.
 */
class CreateFail2BanRulesTest extends MikoPBXTestsBase
{
    /**
     * Slider initialization timeout in seconds.
     */
    private const SLIDER_INIT_TIMEOUT = 5;

    /**
     * Security preset definitions matching fail-to-ban-index.js securityPresets.
     * MaxReqSec is auto-disabled (0) when extensionsCount > 200; on a fresh
     * test container we always hit the non-NAT branch shown here.
     */
    private const SECURITY_PRESETS = [
        0 => ['maxretry' => '20', 'findtime' => '600',   'bantime' => '600',     'maxReqSec' => '500'],
        1 => ['maxretry' => '10', 'findtime' => '3600',  'bantime' => '86400',   'maxReqSec' => '300'],
        2 => ['maxretry' => '5',  'findtime' => '21600', 'bantime' => '604800',  'maxReqSec' => '150'],
        3 => ['maxretry' => '3',  'findtime' => '86400', 'bantime' => '2592000', 'maxReqSec' => '100'],
    ];

    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Changing Fail2Ban rules");
    }

    /**
     * Drive the slider, save settings, then exercise the new whitelist UX:
     * bulk add, persistence across reload, single delete.
     *
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the rule.
     */
    public function testRule(array $params): void
    {
        $presetIndex  = $params['presetIndex'];
        $expected     = self::SECURITY_PRESETS[$presetIndex];
        $whitelistIps = preg_split('/\s+/', trim($params['whitelist']), -1, PREG_SPLIT_NO_EMPTY);

        // === Phase 1: drive the slider and verify the metric panel ===
        $this->navigateToFail2BanSettings();

        self::annotate("Setting security preset slider to index {$presetIndex}");
        self::$driver->executeScript(
            "$('#SecurityPresetSlider').slider('set value', {$presetIndex});"
        );
        $this->waitForAjax();
        sleep(1);

        $this->assertHiddenFieldValue('maxretry', $expected['maxretry']);
        $this->assertHiddenFieldValue('findtime', $expected['findtime']);
        $this->assertHiddenFieldValue('bantime',  $expected['bantime']);
        $this->assertPresetPanelMatches($expected);

        // Save the slider state. Whitelist is intentionally NOT in this form
        // anymore — its tab persists changes per-action via PATCH.
        $this->submitForm('fail2ban-settings-form');

        // === Phase 2: reload, confirm preset stuck through the DB ===
        $this->navigateToFail2BanSettings();
        self::annotate("Verifying preset values after save and reload");
        $this->assertHiddenFieldValue('maxretry', $expected['maxretry']);
        $this->assertHiddenFieldValue('findtime', $expected['findtime']);
        $this->assertHiddenFieldValue('bantime',  $expected['bantime']);

        $sliderValue = self::$driver->executeScript(
            "return $('#SecurityPresetSlider').slider('get value');"
        );
        self::assertEquals(
            $presetIndex,
            (int)$sliderValue,
            "Security preset slider should be at index {$presetIndex} after reload, but got {$sliderValue}"
        );

        // === Phase 3: switch tabs, start from an empty manual list ===
        $this->switchToWhitelistTab();
        $this->clearAllManualWhitelist();

        // === Phase 4: bulk add every IP from the data provider in one go ===
        $this->bulkAddWhitelist($params['whitelist']);

        self::annotate("Verifying " . count($whitelistIps) . " whitelist entries are visible");
        foreach ($whitelistIps as $ip) {
            $this->assertWhitelistContains($ip);
        }

        // === Phase 5: reload, switch back, confirm persistence ===
        $this->navigateToFail2BanSettings();
        $this->switchToWhitelistTab();
        self::annotate("Verifying whitelist persists after page reload");
        foreach ($whitelistIps as $ip) {
            $this->assertWhitelistContains($ip);
        }

        // === Phase 6: delete one entry, the rest must survive ===
        $deletedIp = $whitelistIps[0];
        self::annotate("Removing whitelist entry {$deletedIp}");
        $this->deleteWhitelistEntry($deletedIp);
        $this->assertWhitelistMissing($deletedIp);
        foreach (array_slice($whitelistIps, 1) as $ip) {
            $this->assertWhitelistContains($ip);
        }

        // === Phase 7: clean up so repeated runs don't accumulate state ===
        $this->clearAllManualWhitelist();

        self::annotate("Fail2Ban preset + whitelist test completed successfully");
    }

    /**
     * Navigate to Fail2Ban settings page and wait for slider initialization.
     */
    protected function navigateToFail2BanSettings(): void
    {
        self::annotate("Navigating to Fail2Ban settings page");
        $this->clickSidebarMenuItemByHref('/admin-cabinet/fail2-ban/index/');

        self::$driver->wait(10)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::id('SecurityPresetSlider')
            )
        );

        $this->waitForSliderInitialization();
    }

    /**
     * Wait for the security preset slider to be initialized.
     */
    protected function waitForSliderInitialization(): void
    {
        self::annotate("Waiting for security preset slider initialization");

        self::$driver->wait(self::SLIDER_INIT_TIMEOUT)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::cssSelector('#SecurityPresetSlider.ui.slider')
            )
        );

        $this->waitForAjax();
        sleep(1);

        $sliderValue = self::$driver->executeScript(
            "return $('#SecurityPresetSlider').slider('get value');"
        );
        self::assertNotNull($sliderValue, "Security preset slider should be initialized and return a value");
    }

    /**
     * Assert the value of a hidden input field.
     *
     * @param string $name Field name attribute
     * @param string $expectedValue Expected value
     */
    protected function assertHiddenFieldValue(string $name, string $expectedValue): void
    {
        $hiddenInput = self::$driver->findElement(WebDriverBy::name($name));
        $actualValue = $hiddenInput->getAttribute('value');
        self::assertEquals(
            $expectedValue,
            $actualValue,
            "Hidden field '{$name}' should be '{$expectedValue}', but got '{$actualValue}'"
        );
    }

    /**
     * Verify the metric panel under the slider reflects the selected preset.
     * The numeric maxretry/maxReqSec cells are compared exactly; findtime and
     * bantime go through JS formatDuration() (e.g. "1h"/"1d") so we just assert
     * the cell is populated rather than parsing the localised duration.
     */
    protected function assertPresetPanelMatches(array $expected): void
    {
        self::annotate("Verifying preset info panel reflects current preset");

        $maxRetryShown = trim(
            self::$driver->findElement(WebDriverBy::id('preset-maxretry-value'))->getText()
        );
        self::assertSame(
            $expected['maxretry'],
            $maxRetryShown,
            "preset-maxretry-value should be '{$expected['maxretry']}'"
        );

        foreach (['preset-findtime-value', 'preset-bantime-value', 'preset-maxreqsec-value'] as $id) {
            $text = trim(self::$driver->findElement(WebDriverBy::id($id))->getText());
            self::assertNotSame('--', $text, "Panel cell #{$id} should be populated, got '--'");
            self::assertNotSame('', $text, "Panel cell #{$id} should be populated, got empty string");
        }
    }

    /**
     * Click the "Trusted addresses" tab and wait for its DataTable to render.
     * Pagination is then disabled (page.len(-1)) so every row — including
     * read-only auto-trusted rows coming from firewall rules with
     * "Never block" — lives in <tbody> at once. Every downstream assertion
     * walks the rendered DOM, so without this the test would flake on any
     * environment that already has a single auto-trusted firewall rule
     * (auto rows push seeded manual IPs onto page 2 and the XPath misses
     * them).
     */
    protected function switchToWhitelistTab(): void
    {
        self::annotate("Switching to 'Trusted addresses' tab");

        $tab = self::$driver->findElement(
            WebDriverBy::cssSelector('#fail2ban-tab-menu .item[data-tab="whitelist"]')
        );
        $this->scrollIntoView($tab);
        $tab->click();

        self::$driver->wait(10)->until(
            WebDriverExpectedCondition::visibilityOfElementLocated(
                WebDriverBy::id('whitelist-table')
            )
        );

        $this->waitForAjax();
        // Give the DataTable redraw a beat after the API call populates rows.
        sleep(1);

        // Disable DataTable pagination for the test session — see method docblock.
        self::$driver->executeScript(
            "if (window.jQuery && jQuery.fn.DataTable"
            . " && jQuery.fn.DataTable.isDataTable('#whitelist-table')) {"
            . "  jQuery('#whitelist-table').DataTable().page.len(-1).draw();"
            . "}"
        );
        sleep(1);
    }

    /**
     * Iterate over every visible trash button on the whitelist tab and click
     * them one by one. Auto-trusted rows (from firewall rules with
     * "Never block") render a disabled lock button so they are skipped via
     * the :not(.disabled) selector.
     */
    protected function clearAllManualWhitelist(): void
    {
        self::annotate("Clearing existing manual whitelist entries");

        // Guard against runaway loops if something on the page breaks.
        $maxIterations = 200;
        $iteration     = 0;

        while ($iteration++ < $maxIterations) {
            $buttons = self::$driver->findElements(
                WebDriverBy::cssSelector('button.whitelist-delete-btn:not(.disabled)')
            );
            if (empty($buttons)) {
                return;
            }

            $first = $buttons[0];
            $ip    = (string)$first->getAttribute('data-ip');
            $this->scrollIntoView($first);
            $first->click();

            $this->waitForAjax();
            self::$driver->wait(10)->until(function () use ($ip) {
                $rows = self::$driver->findElements(
                    WebDriverBy::cssSelector("button.whitelist-delete-btn[data-ip='{$ip}']")
                );
                return count($rows) === 0;
            });
        }

        self::fail("clearAllManualWhitelist exceeded {$maxIterations} iterations");
    }

    /**
     * Paste the whole address list into the single input and press Add — the
     * JS bulk parser splits by whitespace/comma/semicolon, validates, dedupes
     * and commits the new IPs in one PATCH /fail2ban round trip.
     */
    protected function bulkAddWhitelist(string $spaceSeparated): void
    {
        self::annotate("Bulk-adding whitelist entries");

        $input = self::$driver->findElement(WebDriverBy::id('whitelist-input'));
        $input->clear();
        $input->sendKeys($spaceSeparated);

        $addBtn = self::$driver->findElement(WebDriverBy::id('whitelist-add-btn'));
        $addBtn->click();

        $this->waitForAjax();
        // The success branch of commit() empties the input — wait for that
        // signal rather than racing the DataTable redraw blind.
        self::$driver->wait(15)->until(function () {
            $val = self::$driver
                ->findElement(WebDriverBy::id('whitelist-input'))
                ->getAttribute('value');
            return $val === '' || $val === null;
        });
        sleep(1);
    }

    /**
     * Look for a whitelist row whose visible text contains the IP literal.
     * pageLength=15 in the DataTable matches the size of the seed list, so
     * pagination should not hide expected rows during the test.
     */
    protected function assertWhitelistContains(string $ip): void
    {
        $rows = self::$driver->findElements(
            WebDriverBy::xpath(
                "//table[@id='whitelist-table']/tbody/tr[contains(., " . $this->xpathLiteral($ip) . ")]"
            )
        );
        self::assertNotEmpty(
            $rows,
            "Expected whitelist row for IP '{$ip}', but none was found"
        );
    }

    /**
     * Negative-form assertion: the IP must not appear in any rendered row.
     */
    protected function assertWhitelistMissing(string $ip): void
    {
        $rows = self::$driver->findElements(
            WebDriverBy::xpath(
                "//table[@id='whitelist-table']/tbody/tr[contains(., " . $this->xpathLiteral($ip) . ")]"
            )
        );
        self::assertEmpty(
            $rows,
            "Whitelist row for IP '{$ip}' should be gone, but was still present"
        );
    }

    /**
     * Click the trash button for a given IP. data-ip carries the normalised
     * value; for plain IPv4 host addresses the literal input equals the
     * normalised form.
     */
    protected function deleteWhitelistEntry(string $ip): void
    {
        $button = self::$driver->findElement(
            WebDriverBy::cssSelector("button.whitelist-delete-btn[data-ip='{$ip}']")
        );
        $this->scrollIntoView($button);
        $button->click();

        $this->waitForAjax();
        self::$driver->wait(10)->until(function () use ($ip) {
            $rows = self::$driver->findElements(
                WebDriverBy::xpath(
                    "//table[@id='whitelist-table']/tbody/tr[contains(., " . $this->xpathLiteral($ip) . ")]"
                )
            );
            return count($rows) === 0;
        });
    }

    /**
     * Escape an arbitrary string for embedding in an XPath 1.0 literal.
     * XPath 1.0 has no escape sequences, so values containing both ' and "
     * must use concat() — uncommon for IPv4 but keeps the helper safe for
     * future IPv6/CIDR inputs.
     */
    private function xpathLiteral(string $value): string
    {
        if (!str_contains($value, "'")) {
            return "'{$value}'";
        }
        if (!str_contains($value, '"')) {
            return "\"{$value}\"";
        }
        $parts = explode("'", $value);
        return "concat('" . implode("',\"'\",'", $parts) . "')";
    }

    /**
     * Dataset provider for Fail2Ban rule creation parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'presetIndex' => 2, // Enhanced: maxretry=5, findtime=21600 (6h), bantime=604800 (7d)
                'whitelist' => '93.188.40.99 80.90.117.7 149.11.34.27 149.11.44.91 69.167.178.98 192.99.200.177 38.88.16.66 38.88.16.70 38.88.16.74 38.88.16.78 38.88.16.82 38.88.16.86 38.88.16.90 38.88.16.94 188.120.235.64',
            ]
        ];

        return $params;
    }
}
