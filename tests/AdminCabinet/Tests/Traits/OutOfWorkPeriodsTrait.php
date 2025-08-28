<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Tests\Traits;

use Facebook\WebDriver\WebDriverBy;

trait OutOfWorkPeriodsTrait
{
    /**
     * Clear dates fields
     */
    protected function clearDates(): void
    {
        $this->clickElement('//div[@id="erase-dates"]');
    }

    /**
     * Clear weekdays fields
     */
    protected function clearWeekdays(): void
    {
        $this->clickElement('//div[@id="erase-weekdays"]');
    }

    /**
     * Clear time period fields
     */
    protected function clearTimePeriod(): void
    {
        $this->clickElement('//div[@id="erase-timeperiod"]');
    }

    /**
     * Set date values using JavaScript
     */
    protected function setDateValues(string $dateFrom = '', string $dateTo = ''): void
    {
        if ($dateFrom) {
            self::$driver->executeScript(
                'outOfWorkTimeRecord.$rangeDaysStart.calendar("set date","' . $dateFrom . '")'
            );
        }

        if ($dateTo) {
            self::$driver->executeScript(
                'outOfWorkTimeRecord.$rangeDaysEnd.calendar("set date","' . $dateTo . '")'
            );
        }
    }

    /**
     * Set time values using JavaScript
     */
    protected function setTimeValues(string $timeFrom = '', string $timeTo = ''): void
    {
        if ($timeFrom) {
            self::$driver->executeScript('$("#time_from").val("' . $timeFrom . '")');
        }

        if ($timeTo) {
            self::$driver->executeScript('$("#time_to").val("' . $timeTo . '")');
        }
    }

    /**
     * Configure action settings
     */
    protected function configureAction(array $params): void
    {
        $this->selectDropdownItem('action', $params['action']);

        switch ($params['action']) {
            case 'extension':
                if ($params['extension']) {
                    $this->selectDropdownItem('extension', $params['extension']);
                }
                break;
            case 'playmessage':
                if ($params['audio_message_id']) {
                    $this->selectDropdownItem('audio_message_id', $params['audio_message_id']);
                }
                break;
        }
    }

    /**
     * Configure restrictions
     */
    protected function configureRestrictions(array $params): void
    {
        $this->changeCheckBoxState('allowRestriction', $params['allowRestriction']);

        if ($params['allowRestriction'] && !empty($params['inbound-rules-table'])) {
            $this->navigateToRulesTab();
            foreach ($params['inbound-rules-table'] as $ruleId => $value) {
                $this->changeCheckBoxState("route-{$ruleId}", $value);
            }
        }
    }

    /**
     * Navigate to rules tab
     */
    protected function navigateToRulesTab(): void
    {
        $xpath = "//div[@id='out-time-modify-menu']//ancestor::a[@data-tab='rules']";
        $this->clickElement($xpath);
    }

    /**
     * Click element by xpath
     */
    private function clickElement(string $xpath): void
    {
        $element = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $element->click();
    }

    /**
     * Verify period settings
     */
    protected function verifyPeriodSettings(array $params): void
    {
        $this->assertTextAreaValueIsEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('date_from', $params['date_from']);
        $this->assertInputFieldValueEqual('date_to', $params['date_to']);
        $this->assertMenuItemSelected('weekday_from', $params['weekday_from']);
        $this->assertMenuItemSelected('weekday_to', $params['weekday_to']);
        $this->assertInputFieldValueEqual('time_from', $params['time_from']);
        $this->assertInputFieldValueEqual('time_to', $params['time_to']);
        $this->verifyActionSettings($params);
        $this->verifyRestrictions($params);
    }

    /**
     * Verify action settings
     */
    protected function verifyActionSettings(array $params): void
    {
        $this->assertMenuItemSelected('action', $params['action']);

        switch ($params['action']) {
            case 'extension':
                if ($params['extension']) {
                    $this->assertMenuItemSelected('extension', $params['extension']);
                }
                break;
            case 'playmessage':
                if ($params['audio_message_id']) {
                    $this->assertMenuItemSelected('audio_message_id', $params['audio_message_id']);
                }
                break;
        }
    }

    /**
     * Verify restrictions
     */
    protected function verifyRestrictions(array $params): void
    {
        $this->assertCheckBoxStageIsEqual('allowRestriction', $params['allowRestriction']);

        if ($params['allowRestriction'] && !empty($params['inbound-rules-table'])) {
            $this->navigateToRulesTab();
            foreach ($params['inbound-rules-table'] as $ruleId => $value) {
                $this->assertCheckBoxStageIsEqual("route-{$ruleId}", $value);
            }
        }
    }
}