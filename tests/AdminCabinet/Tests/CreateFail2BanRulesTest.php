<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
 * Class to test Fail2Ban security preset slider and whitelist settings.
 *
 * The Fail2Ban settings page uses a security preset slider (0-3)
 * that controls hidden fields: maxretry, findtime, bantime.
 * Presets: 0=Weak, 1=Normal, 2=Enhanced, 3=Paranoid.
 */
class CreateFail2BanRulesTest extends MikoPBXTestsBase
{
    /**
     * Slider initialization timeout in seconds
     */
    private const SLIDER_INIT_TIMEOUT = 5;

    /**
     * Security preset definitions matching fail-to-ban-index.js securityPresets.
     */
    private const SECURITY_PRESETS = [
        0 => ['maxretry' => '20', 'findtime' => '600', 'bantime' => '600'],       // Weak
        1 => ['maxretry' => '10', 'findtime' => '3600', 'bantime' => '86400'],     // Normal
        2 => ['maxretry' => '5',  'findtime' => '21600', 'bantime' => '604800'],   // Enhanced
        3 => ['maxretry' => '3',  'findtime' => '86400', 'bantime' => '2592000'],  // Paranoid
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
     * Test the Fail2Ban security preset slider and whitelist.
     *
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the rule.
     */
    public function testRule(array $params): void
    {
        $presetIndex = $params['presetIndex'];
        $expectedValues = self::SECURITY_PRESETS[$presetIndex];

        // Navigate to the Fail2Ban settings page and wait for slider
        $this->navigateToFail2BanSettings();

        // Set security preset slider via JavaScript
        self::annotate("Setting security preset slider to index {$presetIndex}");
        self::$driver->executeScript(
            "$('#SecurityPresetSlider').slider('set value', {$presetIndex});"
        );

        // Wait for slider animation and onChange event to update hidden fields
        $this->waitForAjax();
        sleep(1);

        // Verify hidden field values match the preset before saving
        $this->assertHiddenFieldValue('maxretry', $expectedValues['maxretry']);
        $this->assertHiddenFieldValue('findtime', $expectedValues['findtime']);
        $this->assertHiddenFieldValue('bantime', $expectedValues['bantime']);

        // Set whitelist
        $this->changeTextAreaValue('whitelist', '');
        $this->changeTextAreaValue('whitelist', $params['whitelist']);

        // Save the settings
        $this->submitForm('fail2ban-settings-form');

        // Reload page and verify saved values
        $this->navigateToFail2BanSettings();

        // Verify hidden field values match the preset after reload
        self::annotate("Verifying preset values after save and reload");
        $this->assertHiddenFieldValue('maxretry', $expectedValues['maxretry']);
        $this->assertHiddenFieldValue('findtime', $expectedValues['findtime']);
        $this->assertHiddenFieldValue('bantime', $expectedValues['bantime']);

        // Verify whitelist
        $this->assertTextAreaValueIsEqual('whitelist', $params['whitelist']);

        // Verify slider position
        $sliderValue = self::$driver->executeScript(
            "return $('#SecurityPresetSlider').slider('get value');"
        );
        self::assertEquals(
            $presetIndex,
            (int)$sliderValue,
            "Security preset slider should be at index {$presetIndex} after reload, but got {$sliderValue}"
        );

        self::annotate("Fail2Ban preset slider test completed successfully");
    }

    /**
     * Navigate to Fail2Ban settings page and wait for slider initialization.
     */
    protected function navigateToFail2BanSettings(): void
    {
        self::annotate("Navigating to Fail2Ban settings page");
        $this->clickSidebarMenuItemByHref('/admin-cabinet/fail2-ban/index/');

        // Wait for slider element to appear
        self::$driver->wait(10)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::id('SecurityPresetSlider')
            )
        );

        // Wait for slider to be fully initialized by Fomantic UI
        $this->waitForSliderInitialization();
    }

    /**
     * Wait for the security preset slider to be initialized.
     */
    protected function waitForSliderInitialization(): void
    {
        self::annotate("Waiting for security preset slider initialization");

        // Wait until slider has the .ui.slider class (Fomantic UI initialized)
        self::$driver->wait(self::SLIDER_INIT_TIMEOUT)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::cssSelector('#SecurityPresetSlider.ui.slider')
            )
        );

        // Wait for API data to load and populate the slider
        $this->waitForAjax();
        sleep(1);

        // Verify slider is functional
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
