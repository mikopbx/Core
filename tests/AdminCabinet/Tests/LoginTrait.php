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
            'password'  => '123456789MikoPBX#1',
            'password2' => 'admin',
        ]];

        return $params;
    }


}