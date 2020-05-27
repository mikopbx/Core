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

class CreateDefaultIncomingCallRule extends MikoPBXTestsBase
{

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testChangeDefaultRule($params):void
    {
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

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider() :array
    {

        $params[] = [[
            'action' => 'busy'
        ]];

        $params[] = [[
            'action' => 'hangup'
        ]];

        $params[] = [[
            'action' => 'extension',
            'extension'   => 202
        ]];

        return $params;
    }
}