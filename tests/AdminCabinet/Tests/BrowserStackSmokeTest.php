<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class BrowserStackSmokeTest extends MikoPBXTestsBase
{
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName('Smoke: BrowserStack can open and log in to MikoPBX');
    }

    public function testBrowserStackCanOpenAndLogin(): void
    {
        self::$driver->wait(10, 500)->until(
            WebDriverExpectedCondition::visibilityOfElementLocated(WebDriverBy::cssSelector('#top-menu-search'))
        );

        $this->assertStringContainsString('/admin-cabinet/', self::$driver->getCurrentURL());
    }
}
