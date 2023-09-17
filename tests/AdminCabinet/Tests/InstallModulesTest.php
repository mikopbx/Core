<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use Exception;
use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

/**
 * Class to test the installation of modules in the admin cabinet.
 */
class InstallModulesTest extends MikoPBXTestsBaseAlias
{
    /**
     * Test to install a module.
     *
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test.
     */
    public function testInstallModule(array $params): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/pbx-extension-modules/index/");
        $this->changeTabOnCurrentPage('installed');

        // Delete old module
        $xpath = '//tr[@id="' . $params['moduleId'] . '"]//a[contains(@href,"delete")]';
        try {
            $tableButtonModify = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $tableButtonModify->click();
            sleep(2);
            $tableButtonModify->click();

        } catch (NoSuchElementException $e) {
            echo('Not found row with module =' . $params['moduleId'] . ' on this page' . PHP_EOL);
        } catch (Exception $e) {
            echo('Unknown error ' . $e->getMessage() . PHP_EOL);
        }

        // Install new one
        $this->changeTabOnCurrentPage('marketplace');
        $xpath = '//a[contains(@data-uniqid,"' . $params['moduleId'] . '")]';
        try {
            $tableButtonInstall = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $tableButtonInstall->click();
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            echo('Not found row with module =' . $params['moduleId'] . ' to install' . PHP_EOL);
        } catch (Exception $e) {
            echo('Unknown error ' . $e->getMessage() . PHP_EOL);
        }

        // Wait for the installation and test it
        $this->changeTabOnCurrentPage('installed');
        $maximumWaitTime = 120;
        $waitTime = 0;
        $xpath = '//tr[@id="' . $params['moduleId'] . '"]//a[contains(@href,"delete")]';
        $found = false;
        while ($waitTime < $maximumWaitTime) {
            $els = self::$driver->findElements((WebDriverBy::xpath($xpath)));
            if (count($els) > 0) {
                $found = true;
                break;
            }
            sleep(5);
            $waitTime += 5;
        }
        if (!$found) {
            $this->fail("Not found element by " . $xpath . PHP_EOL);
        } else {
            // Increment assertion counter
            $this->assertTrue(true);
        }

        // Enable the installed module
        $this->changeModuleState($params['moduleId']);

        sleep(10);

        // Enable or disable the module according to the settings
        $this->changeModuleState($params['moduleId'], $params['enable']);
    }

    /**
     * Changes the state of a module (enable or disable).
     *
     * @param string $moduleId The ID of the module.
     * @param bool $enable (Optional) Whether to enable or disable the module. Defaults to true.
     *
     * @return void
     */
    private function changeModuleState(string $moduleId, bool $enable = true): void
    {
        $xpath = '//tr[@id="' . $moduleId . '"]//input[@type="checkbox"]';
        $checkBoxItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($checkBoxItems as $checkBoxItem) {
            if (($enable && !$checkBoxItem->isSelected()) || (!$enable && $checkBoxItem->isSelected())) {
                // Find the checkbox item's parent div and perform necessary actions
                $xpath = '//tr[@id="' . $moduleId . '"]//input[@type="checkbox"]/parent::div';
                $checkBoxItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
                $actions = new WebDriverActions(self::$driver);
                $actions->moveToElement($checkBoxItem);
                $actions->perform();
                $checkBoxItem->click();
            }
        }

        // Assert the result of clicking

        $changed = false;
        // Check if the module is enabled or disabled
        $maximumWaitTime = 45;
        $waitTime = 0;
        while ($waitTime < $maximumWaitTime) {
            $xpath = '//tr[@id="' . $moduleId . '"]//input[@type="checkbox"]';
            $checkBoxItemNew = self::$driver->findElement(WebDriverBy::xpath($xpath));
            if (($enable && $checkBoxItemNew->isSelected()) || (!$enable && !$checkBoxItemNew->isSelected())) {
                $changed = true;
                break;
            }
            sleep(5);
            $waitTime += 5;
        }

        if (!$changed) {
            $this->fail("Module {$moduleId} state was not changed during {$maximumWaitTime} seconds" . PHP_EOL);
        } else {
            // Increment assertion counter
            $this->assertTrue(true);
        }

    }

    /**
     * Provides data for the test.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'moduleId' => 'ModuleAutoprovision',
                'enable' => true,
            ],
        ];
        $params[] = [
            [
                'moduleId' => 'ModuleBackup',
                'enable' => true,
            ],
        ];
        $params[] = [
            [
                'moduleId' => 'ModuleCTIClient',
                'enable' => false,
            ],
        ];
        $params[] = [
            [
                'moduleId' => 'ModuleDocker',
                'enable' => false,
            ],
        ];
        $params[] = [
            [
                'moduleId' => 'ModulePhoneBook',
                'enable' => true,
            ],
        ];
        $params[] = [
            [
                'moduleId' => 'ModuleSmartIVR',
                'enable' => true,
            ],
        ];
        $params[] = [
            [
                'moduleId' => 'ModuleTelegramNotify',
                'enable' => false,
            ],
        ];
        $params[] = [
            [
                'moduleId' => 'ModuleUsersGroups',
                'enable' => true,
            ],
        ];

        return $params;
    }
}
