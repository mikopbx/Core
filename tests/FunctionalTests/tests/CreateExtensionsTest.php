<?php

/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */
require_once 'LoginTrait.php';

use Facebook\WebDriver\WebDriverBy;


class CreateExtensionsTest extends BrowserStackTest
{
    use  LoginTrait;

    /**
     * @depends testLogin
     */
    public function testCreateExtensions(): void
    {
        $xpath            = '//div[@id="sidebar-menu"]//ancestor::a[contains(@class, "item") and contains(@href ,"/admin-cabinet/extensions/index/")]';
        $a_UsersIndexPage = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $a_UsersIndexPage->click();

        $extensionsList = $this->getExtensionsList();
        foreach ($extensionsList as $extension) {
            $xpath             = "//a[@href = '/admin-cabinet/extensions/modify' and @id = 'add-new-button']";
            $button_AddNewUser = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $button_AddNewUser->click();

            $xpathUserName  = "//input[@type = 'text' and @id = 'user_username' and @name = 'user_username']";
            $input_UserName = self::$driver->findElement(WebDriverBy::xpath($xpathUserName));
            $input_UserName->sendKeys($extension['username']);

            $xpathNumber  = "//input[@type = 'text' and @id = 'number' and @name = 'number']";
            $input_Number = self::$driver->findElement(WebDriverBy::xpath($xpathNumber));
            $input_Number->sendKeys($extension['number']);

            $xpathMobileNumber  = "//input[@type = 'text' and @id = 'mobile_number' and @name = 'mobile_number']";
            $input_MobileNumber = self::$driver->findElement(WebDriverBy::xpath($xpathMobileNumber));
            $input_MobileNumber->sendKeys($extension['mobile']);

            $xpathEmail  = "//input[@type = 'text' and @id = 'user_email' and @name = 'user_email']";
            $input_Email = self::$driver->findElement(WebDriverBy::xpath($xpathEmail));
            $input_Email->sendKeys($extension['email']);

            $xpath           = "//input[@type = 'text' and @id = 'sip_secret' and @name = 'sip_secret']";
            $input_SipSecret = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $input_SipSecret->sendKeys($extension['secret']);

            $xpath              = "//input[@type = 'file' and @name = 'file-select']";
            $input_hiddenAvatar = self::$driver->findElement(WebDriverBy::xpath($xpath));
            //$filePath           =  __DIR__."/../assets/{$extension['number']}.png";
            $filePath = 'C:\Users\hello\Documents\images\person.jpg';
            $input_hiddenAvatar->sendKeys($filePath);

            $xpath         = '//form[@id="extensions-form"]//ancestor::div[@id="submitbutton"]';
            $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
            if ($button_Submit) {
                $button_Submit->click();
                self::$driver->wait(10, 500)->until(
                    function ($driver) {
                        $xpath         = '//form[@id="extensions-form"]//ancestor::div[@id="submitbutton"]';
                        $button_Submit = $driver->findElement(WebDriverBy::xpath($xpath));

                        return $button_Submit->isEnabled();
                    }
                );
            }

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

            $xpath               = "//id('fwd_forwardingonbusy')";
            $input_forwardOnBusy = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertEquals($extension['mobile'], $input_forwardOnBusy->getAttribute('value'));


            $xpath                  = "//id('fwd_forwarding')";
            $input_forwardOnTimeout = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertEquals($extension['mobile'], $input_forwardOnTimeout->getAttribute('value'));

            $xpath                      = "//id('fwd_forwardingonunavailable')";
            $input_forwardOnUnavailable = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertEquals($extension['mobile'], $input_forwardOnUnavailable->getAttribute('value'));

            $xpath                  = "//input[@type = 'text' and @id = 'mobile_dialstring' and @name = 'mobile_dialstring']";
            $input_mobileDialstring = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertEquals($extension['mobile'], $input_mobileDialstring->getAttribute('value'));

            $xpath           = "//input[@type = 'text' and @id = 'sip_secret' and @name = 'sip_secret']";
            $input_sipSecret = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertEquals($extension['secret'], $input_sipSecret->getAttribute('value'));

            $input_Number = self::$driver->findElement(WebDriverBy::xpath($xpathNumber));
            $this->assertEquals($extension['number'], $input_Number->getAttribute('value'));

            $input_UserName = self::$driver->findElement(WebDriverBy::xpath($xpathUserName));
            $this->assertEquals($extension['username'], $input_UserName->getAttribute('value'));

            $input_UserName = self::$driver->findElement(WebDriverBy::xpath($xpathEmail));
            $this->assertEquals($extension['email'], $input_UserName->getAttribute('value'));

            $xpath            = '//div[@id="sidebar-menu"]//ancestor::a[contains(@class, "item") and contains(@href ,"/admin-cabinet/extensions/index/")]';
            $a_UsersIndexPage = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $a_UsersIndexPage->click();

            $filesList = self::$driver->findElement(WebDriverBy::xpath('id("extensions-table")'));
            $this->assertStringContainsString($extension['username'], $filesList->getText());
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