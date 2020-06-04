<?php

/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */
namespace MikoPBX\Tests\AdminCabinet\Tests;


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CreateExtensionsTest extends MikoPBXTestsBase
{
    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param $params
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testCreateExtensions($params): void
    {
            $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

            $this->clickDeleteButtonOnRowWithText($params['username']);

            $this->clickButtonByHref('/admin-cabinet/extensions/modify');

            $this->changeInputField('user_username', $params['username']);
            $this->changeInputField('number', $params['number']);
            $this->changeInputField('mobile_number', $params['mobile']);
            $this->changeInputField('user_email', $params['email']);
            $this->selectDropdownItem('user_language', $params['user_language']);
            $this->changeInputField('sip_secret', $params['secret']);

            // Раскрываем расширенные опции
            $this->openAccordionOnThePage();

            $this->changeInputField('sip_busylevel', $params['sip_busylevel']);
            $this->selectDropdownItem('sip_networkfilterid', $params['sip_networkfilterid']);

           $this->changeInputField('sip_busylevel', $params['sip_busylevel']);
            foreach ($params['codecs'] as $key=>$value){
                $this->changeCheckBoxState('codec_'.$key, $value);
            }
            $this->changeTextAreaValue('sip_manualattributes', $params['manualattributes']);

            //$filePath           =  __DIR__."/../assets/{$params['number']}.png";
            $filePath = 'C:\Users\hello\Documents\images\person.jpg';
            $this->changeFileField('file-select', $filePath);

           $this->submitForm('extensions-form');

            self::$driver->wait(10, 500)->until(
                function () {
                    $xpath         = "//input[@name = 'id']";
                    $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
                    return $input_ExtensionUniqueID->getAttribute('value')!=='';
                }
            );

            // TESTS
            $xpath                   = "//input[@name = 'id']";
            $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

            $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
            $this->clickModifyButtonOnRowWithText($params['username']);
            $this->assertInputFieldValueEqual('username',  $params['username']);
            $this->assertInputFieldValueEqual('number',  $params['number']);
            $this->assertInputFieldValueEqual('user_email',  $params['email']);
            // $this->assertInputFieldValueEqual('mobile_number',  $params['mobile']);

            $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['mobile']);
            $this->assertMenuItemSelected('fwd_forwarding', $params['mobile']);
            $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['mobile']);
            $this->assertMenuItemSelected('user_language', $params['user_language']);
            $this->assertInputFieldValueEqual('sip_secret',  $params['secret']);

            // Раскрываем расширенные опции
            $this->openAccordionOnThePage();
            $this->assertInputFieldValueEqual('mobile_dialstring',  $params['mobile']);
            $this->assertInputFieldValueEqual('sip_busylevel', $params['sip_busylevel']);
            $this->assertMenuItemSelected('sip_networkfilterid', $params['sip_networkfilterid']);

            foreach ($params['codecs'] as $key=>$value){
                $this->assertCheckBoxStageIsEqual('codec_'.$key, $value);
            }
            $this->assertTextAreaValueIsEqual('sip_manualattributes', $params['manualattributes']);
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'number'   => 235,
                'email'    => 'emar@miko.ru',
                'username' => 'Eugeniy Makrchev',
                'mobile'   => '79031454088',
                'secret'   => '23542354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'[endpoint]
callerid=2546456<240>',
                'codecs'     =>[
                    'alaw'=>true,
                    'ulaw'=>false,
                    'g729'=>true,
                    'g723.1'=>true,
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
            ]];
        $params[] = [
            [
                'number'   => 229,
                'email'    => 'nuberk@miko.ru',
                'username' => 'Nikolay Beketov',
                'mobile'   => '79265244743',
                'secret'   => 'GAb2o%2B_1Ys.25',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'inband',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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

                ]]];

        $params[] = [
            [
                'number'   => 223,
                'email'    => 'svlassvlas@miko.ru',
                'username' => 'Svetlana Vlasova',
                'mobile'   => '79269900372',
                'secret'   => 'GAb2o%qwerqwer2354235.25',
                'sip_busylevel'=>1,
                'user_language'=>'en-en',
                'sip_dtmfmode'=>'info',
                'sip_networkfilterid'=>'4',
                'manualattributes'=>'',
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
                ]]];
        $params[] = [
            [
                'number'   => 217,
                'email'    => 'nanabek@miko.ru',
                'username' => 'Natalia Beketova',
                'mobile'   => '79265244843',
                'secret'   => 'GAb2o%2B_1Ys.25',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
                ]];
        $params[] = [
            [
                'number'   => 206,
                'email'    => 'bubuh@miko.ru',
                'username' => 'Julia Efimova',
                'mobile'   => '79851417827',
                'secret'   => '23542354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'rfc4733',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 231,
                'email'    => 'alish@miko.ru',
                'username' => 'Alisher Usmanov',
                'mobile'   => '79265639989',
                'secret'   => '23542354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 236,
                'email'    => 'imalll@miko.ru',
                'username' => 'Ivan Maltsev',
                'mobile'   => '79265679989',
                'secret'   => '23542354wet',
                'sip_busylevel'=>1,
                'user_language'=>'en-en',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];

        $params[] = [
            [
                'number'   => 214,
                'email'    => 'alex@miko.ru',
                'username' => 'Alexandr Medvedev',
                'mobile'   => '79853059396',
                'secret'   => '235RTWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 212,
                'email'    => 'amzh@miko.ru',
                'username' => 'Anna Mzhelskaya',
                'mobile'   => '79852888742',
                'secret'   => '235RTWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 210,
                'email'    => 'vmit@miko.ru',
                'username' => 'Viktor Mitin',
                'mobile'   => '79251323617',
                'secret'   => '235RTWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 228,
                'email'    => 'apas@miko.ru',
                'username' => 'Anton Pasutin',
                'mobile'   => '79262321957',
                'secret'   => '235RTWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 213,
                'email'    => 'kper@miko.ru',
                'username' => 'Kristina Perfileva',
                'mobile'   => '79256112214',
                'secret'   => '235RTWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 204,
                'email'    => 'apore@miko.ru',
                'username' => 'Alexey Portnov',
                'mobile'   => '79257184255',
                'secret'   => '235RTWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 233,
                'email'    => 'tpora@miko.ru',
                'username' => 'Tatiana Portnova',
                'mobile'   => '79606567153',
                'secret'   => '235RTWETt543re42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 254,
                'email'    => 'apushh@miko.ru',
                'username' => 'Alexandra Pushina',
                'mobile'   => '74952293043',
                'secret'   => '235RTWETtre5442354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 253,
                'email'    => 'dfom@miko.ru',
                'username' => 'Dmitri Fomichev',
                'mobile'   => '79152824438',
                'secret'   => '235RTWETerwtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 230,
                'email'    => 'dhol@miko.ru',
                'username' => 'Daria Holodova',
                'mobile'   => '79161737472',
                'secret'   => '235RTWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ru-ru',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'',
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
            ]];
        $params[] = [
            [
                'number'   => 219,
                'email'    => 'icvetf@miko.ru',
                'username' => 'Ilia Tsvetkov',
                'mobile'   => '79998201098',
                'secret'   => '235RT34WETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'ja-jp',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'[endpoint]
callerid=2546456<240>',
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
            ]];
        $params[] = [
            [
                'number'   => 240,
                'email'    => 'mcvetfd@miko.ru',
                'username' => 'Maxim Tsvetkov',
                'mobile'   => '79055651617',
                'secret'   => '235RTWETttre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'de-de',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'[endpoint]
callerid=2546456<240>',
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
            ]];
        $params[] = [
            [
                'number'   => 251,
                'email'    => 'vchen@miko.ru',
                'username' => 'Viktor Chentcov',
                'mobile'   => '79265775288',
                'secret'   => '235RTrWETtre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'pl-pl',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'[endpoint]
callerid=2546456<251>',
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
            ]];
        $params[] = [
            [
                'number'   => 234,
                'email'    => 'esam@miko.ru',
                'username' => 'Evgenia Chulkova',
                'mobile'   => '79161237145',
                'secret'   => '235RTWETftre42354wet',
                'sip_busylevel'=>1,
                'user_language'=>'it-it',
                'sip_dtmfmode'=>'auto_info',
                'sip_networkfilterid'=>'none',
                'manualattributes'=>'[endpoint]
callerid=2546456<234>',
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
                ]
            ]
        ];
        return $params;
    }
}