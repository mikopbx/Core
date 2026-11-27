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

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Call history filters: the period follows the PBX day, and the menu item and F5 keep the filters.
 *
 * Run it with BROWSERSTACK_TIMEZONE set to a zone whose date differs from the PBX one
 * (e.g. far west or east of it) to cover browsers in another timezone.
 * Needs at least one CDR record on the PBX; otherwise the page shows a placeholder and the test is skipped.
 */
class CallDetailRecordsFilterTest extends MikoPBXTestsBase
{
    private const string MENU_HREF = '/admin-cabinet/call-detail-records/index/';
    private const string SEARCH_TEXT = '2';

    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName('Test: Call history period and saved filters');
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        // The browser session is shared with the next tests: do not leave "Today" and the search behind
        try {
            self::$driver->executeScript("sessionStorage.removeItem('cdr_filters_state');");
        } catch (\Throwable) {
            // The page may be gone after a failure; nothing to clean then
        }
    }

    public function testPeriodFollowsPbxDayAndSurvivesMenuClickAndReload(): void
    {
        $this->openCallHistory();
        $pbxToday = $this->getPbxToday();
        if (self::$driver->executeScript("return moment().format('YYYY-MM-DD');") === $pbxToday) {
            self::annotate(
                'Browser and PBX share the date: run with BROWSERSTACK_TIMEZONE set to a zone with another date '
                . 'to check that the period follows the PBX day',
                'warning'
            );
        }

        $this->assertSame(
            $pbxToday,
            $this->getPickerState()['max'],
            'The latest selectable day must be the PBX today'
        );

        $this->chooseTodayPreset();
        $this->assertSame(
            $pbxToday . '..' . $pbxToday,
            $this->getPickerState()['range'],
            '"Today" must be the PBX day'
        );

        $this->fillDataTableSearchInput('cdr-table', 'globalsearch', self::SEARCH_TEXT);
        $this->waitForAjax();

        $this->reloadCallHistory(fn() => $this->clickSidebarMenuItemByHref(self::MENU_HREF));
        $state = $this->getPickerState();
        $this->assertSame($pbxToday . '..' . $pbxToday, $state['range'], 'The menu item must keep the period');
        $this->assertSame(self::SEARCH_TEXT, $state['search'], 'The menu item must keep the search text');

        $this->reloadCallHistory(fn() => self::$driver->navigate()->refresh());
        $this->assertSame(
            $pbxToday . '..' . $pbxToday,
            $this->getPickerState()['range'],
            'Reload must keep the period'
        );
    }

    private function openCallHistory(): void
    {
        $this->clickSidebarMenuItemByHref(self::MENU_HREF);
        $this->waitForTable();
    }

    /**
     * Navigates and waits for the new page, not the one still shown before the navigation.
     */
    private function reloadCallHistory(callable $navigate): void
    {
        self::$driver->executeScript('window.cdrPageBeforeNavigation = true;');
        $navigate();
        self::$driver->wait(20, 300)->until(function () {
            return self::$driver->executeScript('return window.cdrPageBeforeNavigation !== true;');
        });
        $this->waitForTable();
    }

    /**
     * Waits for the date picker and the first table draw, or skips the test on an empty database.
     */
    private function waitForTable(): void
    {
        $this->waitForPageReady();
        self::$driver->wait(20, 300)->until(function () {
            return self::$driver->executeScript(
                "return (typeof callDetailRecords !== 'undefined' && callDetailRecords.isInitialized)"
                . " || $('#cdr-empty-database-placeholder').is(':visible');"
            );
        });
        if (self::$driver->executeScript("return $('#cdr-empty-database-placeholder').is(':visible');")) {
            $this->markTestSkipped('No call history on the PBX under test');
        }
        $this->waitForAjax();
    }

    /**
     * The PBX date from the server time the page itself receives.
     */
    private function getPbxToday(): string
    {
        $today = self::$driver->executeAsyncScript(
            'const done = arguments[arguments.length - 1];'
            . 'CdrAPI.getMetadata({limit: 1}, (data) => {'
            . 'done(data && data._meta ? data._meta.server_now.slice(0, 10) : null);'
            . '});'
        );
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}$/',
            (string)$today,
            'getMetadata must return server_now'
        );
        return (string)$today;
    }

    private function chooseTodayPreset(): void
    {
        self::$driver->executeScript(
            "const picker = $('#date-range-selector').data('daterangepicker');"
            . "picker.show();"
            . "$('.daterangepicker .ranges li[data-range-key=\"' + globalTranslate.cal_Today + '\"]').click();"
        );
        $this->waitForAjax();
    }

    /**
     * @return array{range: string, max: string, search: string}
     */
    private function getPickerState(): array
    {
        return self::$driver->executeScript(
            "const picker = $('#date-range-selector').data('daterangepicker');"
            . "return {"
            . "range: picker.startDate.format('YYYY-MM-DD') + '..' + picker.endDate.format('YYYY-MM-DD'),"
            . "max: picker.maxDate.format('YYYY-MM-DD'),"
            . "search: $('#globalsearch').val()"
            . "};"
        );
    }
}
