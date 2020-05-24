<?php

/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */
namespace MikoPBX\FunctionalTests\Tests;


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase;

class CreateExtensionsTest extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     */
    public function testCreateExtensions(): void
    {
        $extensionsList = $this->getExtensionsList();
        foreach ($extensionsList as $extension) {
            $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
            $this->clickAddNewButtonByHref('/admin-cabinet/extensions/modify');

            $this->changeInputField('user_username', $extension['username']);
            $this->changeInputField('number', $extension['number']);
            $this->changeInputField('mobile_number', $extension['mobile']);
            $this->changeInputField('user_email', $extension['email']);
            $this->changeInputField('sip_secret', $extension['secret']);

            //$filePath           =  __DIR__."/../assets/{$extension['number']}.png";
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
            $this->clickModifyButtonOnRowWithText($extension['username']);

            $this->assertMenuItemSelected('fwd_forwardingonbusy', $extension['mobile']);
            $this->assertMenuItemSelected('fwd_forwarding', $extension['mobile']);
            $this->assertMenuItemSelected('fwd_forwardingonunavailable', $extension['mobile']);

            $this->assertInputFieldValueEqual('mobile_dialstring',  $extension['mobile']);

            $this->assertInputFieldValueEqual('sip_secret',  $extension['secret']);

            $this->assertInputFieldValueEqual('number',  $extension['number']);
            $this->assertInputFieldValueEqual('username',  $extension['username']);
            $this->assertInputFieldValueEqual('user_email',  $extension['email']);

        }
    }

    private function getExtensionsList(): array
    {
        return [
            [
                'number'   => 229,
                'email'    => 'nuberk@miko.ru',
                'username' => 'Nikolay Beketov',
                'mobile'   => '79265244743',
                'secret'   => 'GAb2o%2B_1Ys.25',
            ],
            [
                'number'   => 223,
                'email'    => 'svlassvlas@miko.ru',
                'username' => 'Svetlana Vlasova',
                'mobile'   => '79269900372',
                'secret'   => 'GAb2o%qwerqwer2354235.25',
            ],
            [
                'number'   => 217,
                'email'    => 'nanabek@miko.ru',
                'username' => 'Natalia Beketova',
                'mobile'   => '79265244743',
                'secret'   => 'GAb2o%2B_1Ys.25',
            ],
            [
                'number'   => 206,
                'email'    => 'bubuh@miko.ru',
                'username' => 'Julia Efimova',
                'mobile'   => '79851417827',
                'secret'   => '23542354wet',
            ],
            [
                'number'   => 231,
                'email'    => 'alish@miko.ru',
                'username' => 'Alisher Usmanov',
                'mobile'   => '79265639989',
                'secret'   => '23542354wet',
            ],
            [
                'number'   => 236,
                'email'    => 'imalll@miko.ru',
                'username' => 'Ivan Maltsev',
                'mobile'   => '79265679989',
                'secret'   => '23542354wet',
            ],
            [
                'number'   => 236,
                'email'    => 'emar@miko.ru',
                'username' => 'Eugeniy Makrchev',
                'mobile'   => '79031454088',
                'secret'   => '23542354wet',
            ],
            [
                'number'   => 214,
                'email'    => 'alex@miko.ru',
                'username' => 'Alexandr Medvedev',
                'mobile'   => '79853059396',
                'secret'   => '235RTWETtre42354wet',
            ],
            [
                'number'   => 212,
                'email'    => 'amzh@miko.ru',
                'username' => 'Anna Mzhelskaya',
                'mobile'   => '79852888742',
                'secret'   => '235RTWETtre42354wet',
            ],
            [
                'number'   => 210,
                'email'    => 'vmit@miko.ru',
                'username' => 'Viktor Mitin',
                'mobile'   => '79251323617',
                'secret'   => '235RTWETtre42354wet',
            ],
            [
                'number'   => 228,
                'email'    => 'apas@miko.ru',
                'username' => 'Anton Pasutin',
                'mobile'   => '79262321957',
                'secret'   => '235RTWETtre42354wet',
            ],
            [
                'number'   => 213,
                'email'    => 'kper@miko.ru',
                'username' => 'Kristina Perfileva',
                'mobile'   => '79256112214',
                'secret'   => '235RTWETtre42354wet',
            ],
            [
                'number'   => 204,
                'email'    => 'apore@miko.ru',
                'username' => 'Alexey Portnov',
                'mobile'   => '79257184255',
                'secret'   => '235RTWETtre42354wet',
            ],
            [
                'number'   => 233,
                'email'    => 'tpora@miko.ru',
                'username' => 'Tatiana Portnova',
                'mobile'   => '79606567153',
                'secret'   => '235RTWETt543re42354wet',
            ],
            [
                'number'   => 254,
                'email'    => 'apushh@miko.ru',
                'username' => 'Alexandra Pushina',
                'mobile'   => '74952293043',
                'secret'   => '235RTWETtre5442354wet',
            ],
            [
                'number'   => 253,
                'email'    => 'dfom@miko.ru',
                'username' => 'Dmitri Fomichev',
                'mobile'   => '79152824438',
                'secret'   => '235RTWETerwtre42354wet',
            ],
            [
                'number'   => 230,
                'email'    => 'dhol@miko.ru',
                'username' => 'Daria Holodova',
                'mobile'   => '79161737472',
                'secret'   => '235RTWETtre42354wet',
            ],
            [
                'number'   => 219,
                'email'    => 'icvetf@miko.ru',
                'username' => 'Ilia Tsvetkov',
                'mobile'   => '79998201098',
                'secret'   => '235RT34WETtre42354wet',
            ],
            [
                'number'   => 240,
                'email'    => 'mcvetfd@miko.ru',
                'username' => 'Maxim Tsvetkov',
                'mobile'   => '79055651617',
                'secret'   => '235RTWETttre42354wet',
            ],
            [
                'number'   => 251,
                'email'    => 'vchen@miko.ru',
                'username' => 'Viktor Chentcov',
                'mobile'   => '79265775288',
                'secret'   => '235RTrWETtre42354wet',
            ],
            [
                'number'   => 234,
                'email'    => 'esam@miko.ru',
                'username' => 'Evgenia Chulkova',
                'mobile'   => '79161237145',
                'secret'   => '235RTWETftre42354wet',
            ],
        ];
    }
}