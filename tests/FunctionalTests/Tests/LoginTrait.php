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
    public function testLogin(): void
    {
        self::$driver->get($GLOBALS['SERVER_PBX']);
        $login = self::$driver->findElement(WebDriverBy::xpath("//input[@type = 'text' and @id = 'login' and @name = 'login']"));
        if($login) {
            $login->sendKeys("admin");
        }

        $password = self::$driver->findElement(WebDriverBy::xpath("//input[@type = 'password' and @id = 'password' and @name = 'password']"));
        if($password) {
            $password->sendKeys("admin");
        }

        $submitButton = self::$driver->findElement(WebDriverBy::id('submitbutton'));
        if($submitButton) {
            $submitButton->click();
            $errorMessages = self::$driver->findElements(WebDriverBy::className("error"));
            if(count($errorMessages)>0) {
                $password->clear();
                $password->sendKeys("8635255226");
                $submitButton->click();
            }

            self::$driver->wait(10, 500)->until(function($driver) {
                $elements = $driver->findElements(WebDriverBy::id("top-menu-search"));
                return count($elements) > 0;
            });
        }
        $this->assertElementNotFound(WebDriverBy::xpath("//input[@type = 'text' and @id = 'login' and @name = 'login']"));
    }
}