<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
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
        // Install new

        $xpath = '//a[contains(@data-uniqid,"'.$params['moduleId'].'")]';
        try {
            $tableButtonInstall = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $tableButtonInstall->click();
        } catch (NoSuchElementException $e) {
            echo('Not found row with module =' . $params['moduleId'] . ' to install' . PHP_EOL);
        } catch (Exception $e) {
            echo('Unknown error ' . $e->getMessage() . PHP_EOL);
        }

        // assets
        $xpath = '//tr[@id="'.$params['moduleId'].'"]//a[contains(@href,"delete")]';
        $els = self::$driver->findElements((WebDriverBy::xpath($xpath)));
        if (count($els)===0) {
            $this->fail("Not found element by " .$xpath. PHP_EOL);
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
            'moduleId'=>'ModuleBitrix24Notify',
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