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

class CreateSIPProviders extends MikoPBXTestsBaseAlias
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateSIPProvider($params):void
    {

        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickDeleteButtonOnRowWithText($params['description']);

        $this->clickButtonByHref('/admin-cabinet/providers/modifysip');
        $this->changeInputField('description', $params['description']);
        $this->changeInputField('host', $params['host']);
        $this->changeInputField('username', $params['username']);
        $this->changeInputField('password', $params['password']);
        $this->selectDropdownItem('dtmfmode', $params['dtmfmode']);
        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->changeInputField('port', $params['port']);
        $this->selectDropdownItem('nat', $params['nat']);
        $this->changeCheckBoxState('qualify', $params['qualify']);
        if ($params['qualify']){
            $this->changeInputField('qualifyfreq', $params['qualifyfreq']);
        }


        foreach ($params['codecs'] as $key=>$value){
            $this->changeCheckBoxState('codec_'.$key, $value);
        }

        $this->changeInputField('defaultuser', $params['defaultuser']);
        $this->changeInputField('fromuser', $params['fromuser']);
        $this->changeInputField('fromdomain', $params['fromdomain']);
        $this->changeInputField('manualregister', $params['manualregister']);
        $this->changeCheckBoxState('disablefromuser', $params['disablefromuser']);
        $this->changeCheckBoxState('noregister', $params['noregister']);
        $this->changeCheckBoxState('receive_calls_without_auth', $params['receive_calls_without_auth']);
        $this->changeTextAreaValue('manualattributes', $params['manualattributes']);

        $this->submitForm('save-provider-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickModifyButtonOnRowWithText($params['description']);

        // Asserts
        $this->assertInputFieldValueEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('host', $params['host']);
        $this->assertInputFieldValueEqual('username', $params['username']);
        $this->assertInputFieldValueEqual('password', $params['password']);
        $this->assertMenuItemSelected('dtmfmode', $params['dtmfmode']);
        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        $this->assertInputFieldValueEqual('port', $params['port']);
        $this->assertMenuItemSelected('nat', $params['nat']);
        $this->assertCheckBoxStageIsEqual('qualify', $params['qualify']);
        if ($params['qualify']){
            $this->assertInputFieldValueEqual('qualifyfreq', $params['qualifyfreq']);
        }
        foreach ($params['codecs'] as $key=>$value){
            $this->assertCheckBoxStageIsEqual('codec_'.$key, $value);
        }

        $this->assertInputFieldValueEqual('defaultuser', $params['defaultuser']);
        $this->assertInputFieldValueEqual('fromuser', $params['fromuser']);
        $this->assertInputFieldValueEqual('fromdomain', $params['fromdomain']);
        $this->assertInputFieldValueEqual('manualregister', $params['manualregister']);
        $this->assertCheckBoxStageIsEqual('disablefromuser', $params['disablefromuser']);
        $this->assertCheckBoxStageIsEqual('noregister', $params['noregister']);
        $this->assertCheckBoxStageIsEqual('receive_calls_without_auth', $params['receive_calls_without_auth']);
        $this->assertTextAreaValueIsEqual('manualattributes', $params['manualattributes']);

    }


    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider():array
    {
        $params = [];
        $params[] = [[
            'type'=>'sip',
            'description' => 'PCTEL',
            'host' => 'pctel.ru',
            'username'        => 'pctel',
            'password'        => 'asdfasdfas',
            'dtmfmode'        => 'auto',
            'port'            => 5062,
            'nat'             => 'auto_force_rport',
            'qualify'         => false,
            'qualifyfreq'     =>62,
            'codecs'     =>[
                'alaw'=>true,
                'ulaw'=>false,
                'g729'=>true,
                'g723.1'=>false,
                'g726'=>true,
                'gsm'=>false,
                'adpcm'=>true,
                'g722'=>false,
                'ilbc'=>true,
                'opus'=>false,
                'h264'=>true,
                'h263'=>false,
                'h263p'=>true
            ],
            'defaultuser'=>'',
            'fromuser'=>'',
            'fromdomain'=>'',
            'manualregister'=>'',
            'disablefromuser'=>false,
            'noregister'=>true,
            'receive_calls_without_auth'=>false,
            'manualattributes'=>'',
            ]];

        $params[] = [[
            'type'=>'sip',
            'description' => 'Mango office',
            'host' => 'mango.office.ru',
            'username'        => 'mango',
            'password'        => 'office',
            'dtmfmode'        => 'inband',
            'port'            => 5061,
            'nat'             => 'force_rport',
            'qualify'         => true,
            'qualifyfreq'     =>61,
            'codecs'     =>[
                'alaw'=>false,
                'ulaw'=>true,
                'g729'=>false,
                'g723.1'=>true,
                'g726'=>false,
                'gsm'=>true,
                'adpcm'=>false,
                'g722'=>true,
                'ilbc'=>false,
                'opus'=>true,
                'h264'=>false,
                'h263'=>true,
                'h263p'=>false
            ],
            'defaultuser'=>'',
            'fromuser'=>'',
            'fromdomain'=>'',
            'manualregister'=>'',
            'disablefromuser'=>true,
            'noregister'=>true,
            'receive_calls_without_auth'=>true,
            'manualattributes'=>'',
        ]];

        return $params;
    }

}