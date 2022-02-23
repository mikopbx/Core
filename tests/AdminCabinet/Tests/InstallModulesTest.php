<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

class InstallModulesTest extends MikoPBXTestsBaseAlias
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testInstallModule(array $params): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/pbx-extension-modules/index/");

        // Delete old module
        $xpath = '//tr[@id="'.$params['moduleId'].'"]//a[contains(@href,"delete")]';
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

        $xpath = '//a[contains(@data-uniqid,"'.$params['moduleId'].'")]';
        try {
            $tableButtonInstall = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $tableButtonInstall->click();
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            echo('Not found row with module =' . $params['moduleId'] . ' to install' . PHP_EOL);
        } catch (Exception $e) {
            echo('Unknown error ' . $e->getMessage() . PHP_EOL);
        }

        // Wait the installation and test it
        $maximumWaitTime = 120;
        $waitTime = 0;
        $xpath = '//tr[@id="'.$params['moduleId'].'"]//a[contains(@href,"delete")]';
        $found = false;
        while ($waitTime<$maximumWaitTime){
            $els = self::$driver->findElements((WebDriverBy::xpath($xpath)));
            if (count($els)>0) {
                $found = true;
                break;
            }
            sleep(5);
            $waitTime+=5;
        }
        if (!$found){
            $this->fail("Not found element by " .$xpath. PHP_EOL);
        } else {
            // increment assertion counter
            $this->assertTrue(true);
        }

    }

    public function additionProvider(): array
    {
        $params=[];
        $params[] = [[
            'moduleId'=>'ModuleAutoprovision',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleBackup',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleBitrix24Integration',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleCallTracking',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleCTIClient',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleDocker',
        ]];
        $params[] = [[
            'moduleId'=>'ModulePhoneBook',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleSmartIVR',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleTelegramNotify',
        ]];
        $params[] = [[
            'moduleId'=>'ModuleUsersGroups',
        ]];

        return $params;
    }
}