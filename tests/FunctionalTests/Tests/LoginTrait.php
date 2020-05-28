<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\FunctionalTests\Tests;
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */
namespace MikoPBX\FunctionalTests\Tests;
use Facebook\WebDriver\WebDriverBy;

trait LoginTrait
{
    /**
     * @dataProvider loginDataProvider
     *
     * @param array $params
     */
    public function testLogin($params): void
    {
        self::$driver->get($GLOBALS['SERVER_PBX']);
        $this->changeInputField('login', $params['login']);
        $this->changeInputField('password', $params['password']);

        $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]';

        $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $button_Submit->click();
        $this->waitForAjax();

        $xpath = '//div[contains(@class,"error") and contains(@class,"message")]';
        $errorMessages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        if(count($errorMessages)>0) {
            foreach ($errorMessages as $errorMessage){
                if ($errorMessage->isDisplayed()){
                    $this->changeInputField('password', $params['password2']);
                    $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]';
                    $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
                    $button_Submit->click();
                }
            }

        }

        self::$driver->wait(10, 500)->until(function($driver) {
            $elements = $driver->findElements(WebDriverBy::id("top-menu-search"));
            return count($elements) > 0;
        });

        $this->assertElementNotFound(WebDriverBy::xpath("//input[@type = 'text' and @id = 'login' and @name = 'login']"));
    }

    /**
     * Dataset provider
     * @return array
     */
    public function loginDataProvider():array
    {
        $params = [];
        $params[] = [[
            'login'=>'admin',
            'password'   => 'admin',
            'password2' => '8635255226'
        ]];

        return $params;
    }


}