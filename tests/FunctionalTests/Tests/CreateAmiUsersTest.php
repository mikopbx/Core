<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\FunctionalTests\Tests;


use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

class CreateAmiUsersTest extends MikoPBXTestsBaseAlias
{

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $amiUser
     */
    public function testAddAmiUser(array $amiUser): void
    {
            self::$driver->executeScript(
                'document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);'
            );
            $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');
            $this->clickDeleteButtonOnRowWithText($amiUser['username']);

            $this->clickAddNewButtonByHref('/admin-cabinet/asterisk-managers/modify');
            $this->changeTextAreaValue('description', $amiUser['description']);
            $this->changeInputField('username', $amiUser['username']);
            $this->changeInputField('secret', $amiUser['secret']);
            $this->findCheckOnPageAndMarkIt('call', $amiUser['call']);
            $this->findCheckOnPageAndMarkIt('originate', $amiUser['originate']);
            $this->findCheckOnPageAndMarkIt('agent', $amiUser['agent']);
            $this->findCheckOnPageAndMarkIt('dialplan', $amiUser['dialplan']);
            $this->findCheckOnPageAndMarkIt('log', $amiUser['log']);
            $this->findCheckOnPageAndMarkIt('user', $amiUser['user']);
            $this->findCheckOnPageAndMarkIt('cdr', $amiUser['cdr']);
            $this->findCheckOnPageAndMarkIt('reporting', $amiUser['reporting']);
            $this->findCheckOnPageAndMarkIt('config', $amiUser['config']);
            $this->findCheckOnPageAndMarkIt('dtmf', $amiUser['dtmf']);
            $this->findCheckOnPageAndMarkIt('system', $amiUser['system']);
            $this->findCheckOnPageAndMarkIt('verbose', $amiUser['verbose']);
            $this->submitForm('save-ami-form');

            self::$driver->executeScript(
                'document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);'
            );
            $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');
            $this->clickModifyButtonOnRowWithText($amiUser['username']);

            // TESTS
            $this->assertTextAreaValueIsEqual('description', $amiUser['description']);
            $this->assertInputFieldValueEqual('username', $amiUser['username']);
            $this->assertInputFieldValueEqual('secret', $amiUser['secret']);
            $this->findCheckOnPageAndCompareCondition('call', $amiUser['call']);
            $this->findCheckOnPageAndCompareCondition('originate', $amiUser['originate']);
            $this->findCheckOnPageAndCompareCondition('agent', $amiUser['agent']);
            $this->findCheckOnPageAndCompareCondition('dialplan', $amiUser['dialplan']);
            $this->findCheckOnPageAndCompareCondition('log', $amiUser['log']);
            $this->findCheckOnPageAndCompareCondition('user', $amiUser['user']);
            $this->findCheckOnPageAndCompareCondition('cdr', $amiUser['cdr']);
            $this->findCheckOnPageAndCompareCondition('reporting', $amiUser['reporting']);
            $this->findCheckOnPageAndCompareCondition('config', $amiUser['config']);
            $this->findCheckOnPageAndCompareCondition('dtmf', $amiUser['dtmf']);
            $this->findCheckOnPageAndCompareCondition('system', $amiUser['system']);
            $this->findCheckOnPageAndCompareCondition('verbose', $amiUser['verbose']);
    }

    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'description' => 'The first ami user',
            'username'    => 'mikoTestAMi',
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
            'username'    => 'mikoTestAMiSecond',
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
            $this->assertCheckBoxStageIsEqual("{$key}read", false);
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