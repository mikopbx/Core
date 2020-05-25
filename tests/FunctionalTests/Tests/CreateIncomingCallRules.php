<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\FunctionalTests\Tests;


use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase;

class CreateIncomingCallRules extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateIncomingCallRule($params):void
    {
        if ($params['default']){
            return;
        }
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickDeleteButtonOnRowWithText($params['note']);

        $this->clickAddNewButtonByHref('/admin-cabinet/incoming-routes/modify');
        $this->changeTextAreaValue('note', $params['note']);
        $this->selectDropdownItem('provider', $params['provider']);
        $this->changeInputField('number', $params['number']);
        $this->selectDropdownItem('extension', $params['extension']);
        $this->changeInputField('timeout', $params['timeout']);


        $this->submitForm('incoming-route-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickModifyButtonOnRowWithText($params['note']);

        //Asserts
        $this->assertTextAreaValueIsEqual('note', $params['note']);
        $this->assertMenuItemSelected('provider', $params['provider']);
        $this->assertInputFieldValueEqual('number', $params['number']);
        $this->assertMenuItemSelected('extension', $params['extension']);
        $this->assertInputFieldValueEqual('timeout', $params['timeout']);

    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testChangeDefaultRule($params):void
    {
        if (!$params['default']){
            return;
        }
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        $this->selectDropdownItem('action', $params['action']);
        if ($params['action'] === 'extension'){
            $this->selectDropdownItem('extension', $params['extension']);
        }

        $this->submitForm('default-rule-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        //Asserts
        $this->assertMenuItemSelected('action', $params['action']);
        if ($params['action'] === 'extension'){
            $this->assertMenuItemSelected('extension', $params['extension']);
        }

    }

    public function additionProvider() :array
    {
        $params[] = [[
            'default' => false,
            'note' => 'First rule',
            'provider'        => 'none',
            'number'   => 74952293042,
            'extension'   => 201,
            'timeout'=>14
        ]];

        $params[] = [[
            'default' => false,
            'note' => 'Second rule',
            'provider'        => 'SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43',
            'number'   => 74952293043,
            'extension'   => 202,
            'timeout'=>16
        ]];

        $params[] = [[
            'default' => true,
            'action' => 'busy'
        ]];

        $params[] = [[
            'default' => true,
            'action' => 'hangup'
        ]];

        $params[] = [[
            'default' => true,
            'action' => 'extension',
            'extension'   => 202
        ]];

        return $params;
    }
}