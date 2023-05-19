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


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

class CreateAmiUsersTest extends MikoPBXTestsBaseAlias
{

    /**
     * @depends testLogin
     */
    public function testDeleteAmiUsers():void
    {
        self::$driver->executeScript(
            'document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);'
        );
        $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');
        $tableId = 'ami-users-table';
        $this->deleteAllRecordsOnTable($tableId);
        $xpath         = "//table[@id='{$tableId}']//a[contains(@href,'delete') and not(contains(@class,'disabled'))]";
        $this->assertElementNotFound(WebDriverBy::xpath($xpath));
    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testAddAmiUser(array $params): void
    {
            self::$driver->executeScript(
                'document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);'
            );
            $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');

            $this->clickButtonByHref('/admin-cabinet/asterisk-managers/modify');

            $this->changeTextAreaValue('description', $params['description']);
            $this->changeInputField('username', $params['username']);
            $this->changeInputField('secret', $params['secret']);
            $this->findCheckOnPageAndMarkIt('call', $params['call']);
            $this->findCheckOnPageAndMarkIt('originate', $params['originate']);
            $this->findCheckOnPageAndMarkIt('agent', $params['agent']);
            $this->findCheckOnPageAndMarkIt('dialplan', $params['dialplan']);
            $this->findCheckOnPageAndMarkIt('log', $params['log']);
            $this->findCheckOnPageAndMarkIt('user', $params['user']);
            $this->findCheckOnPageAndMarkIt('cdr', $params['cdr']);
            $this->findCheckOnPageAndMarkIt('reporting', $params['reporting']);
            $this->findCheckOnPageAndMarkIt('config', $params['config']);
            $this->findCheckOnPageAndMarkIt('dtmf', $params['dtmf']);
            $this->findCheckOnPageAndMarkIt('system', $params['system']);
            $this->findCheckOnPageAndMarkIt('verbose', $params['verbose']);

            $this->submitForm('save-ami-form');

            self::$driver->executeScript(
                'document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);'
            );
            $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');
            $this->clickModifyButtonOnRowWithText($params['username']);

            // TESTS
            $this->assertTextAreaValueIsEqual('description', $params['description']);
            $this->assertInputFieldValueEqual('username', $params['username']);
            $this->assertInputFieldValueEqual('secret', $params['secret']);
            $this->findCheckOnPageAndCompareCondition('call', $params['call']);
            $this->findCheckOnPageAndCompareCondition('originate', $params['originate']);
            $this->findCheckOnPageAndCompareCondition('agent', $params['agent']);
            $this->findCheckOnPageAndCompareCondition('dialplan', $params['dialplan']);
            $this->findCheckOnPageAndCompareCondition('log', $params['log']);
            $this->findCheckOnPageAndCompareCondition('user', $params['user']);
            $this->findCheckOnPageAndCompareCondition('cdr', $params['cdr']);
            $this->findCheckOnPageAndCompareCondition('reporting', $params['reporting']);
            $this->findCheckOnPageAndCompareCondition('config', $params['config']);
            $this->findCheckOnPageAndCompareCondition('dtmf', $params['dtmf']);
            $this->findCheckOnPageAndCompareCondition('system', $params['system']);
            $this->findCheckOnPageAndCompareCondition('verbose', $params['verbose']);
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'description' => 'The first ami user',
            'username'    => 'firstAmiUser4Test',
            'secret'      => 'theBigBigSecretWith#And%',
            'call'        => 'read',
            'originate'   => 'readwrite',
            'agent'       => 'write',
            'dialplan'    => 'readwrite',
            'log'         => 'read',
            'user'        => 'readwrite',
            'cdr'         => 'read',
            'reporting'   => 'readwrite',
            'config'      => 'readwrite',
            'dtmf'        => 'readwrite',
            'system'      => 'readwrite',
            'verbose'     => 'read',
        ]];

        $params[] = [[
            'description' => 'The second one user',
            'username'    => 'secondAmiUser4Test',
            'secret'      => 'theBigBigSecretWith#And%and$',
            'call'        => '',
            'originate'   => 'readwrite',
            'agent'       => 'write',
            'dialplan'    => 'write',
            'log'         => 'readwrite',
            'user'        => 'read',
            'cdr'         => '',
            'reporting'   => 'read',
            'config'      => 'read',
            'dtmf'        => 'read',
            'system'      => 'read',
            'verbose'     => 'read',
        ]];

        return $params;
    }

    /**
     * Find checkbox by name and mark it if it contains exactly property in $value
     *
     * @param string $key
     * @param string $value
     */
    private function findCheckOnPageAndMarkIt(string $key, string $value): void
    {
        $this->changeCheckBoxState("{$key}_main", false);
        if (strpos($value, 'read') !== false
            && strpos($value, 'write') !== false) {
            $this->changeCheckBoxState("{$key}_main", true);
        } elseif (strpos($value, 'read') !== false) {
            $this->changeCheckBoxState("{$key}_read", true);
        } elseif (strpos($value, 'write') !== false) {
            $this->changeCheckBoxState("{$key}_write", true);
        }
    }

    /**
     * Check checkbox state by name and value
     *
     * @param string $key
     * @param string $value
     */
    private function findCheckOnPageAndCompareCondition(string $key, string $value): void
    {
        if (strpos($value, 'read') !== false) {
            $this->assertCheckBoxStageIsEqual("{$key}_read", true);
        } else {
            $this->assertCheckBoxStageIsEqual("{$key}_read", false);
        }
        if (strpos($value, 'write') !== false) {
            $this->assertCheckBoxStageIsEqual("{$key}_write", true);
        } else {
            $this->assertCheckBoxStageIsEqual("{$key}_write", false);
        }

        if (strpos($value, 'read') === false && strpos($value, 'write') === false) {
            $this->assertCheckBoxStageIsEqual("{$key}_main", false);
        }
    }
}