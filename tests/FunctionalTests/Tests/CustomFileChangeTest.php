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
use Facebook\WebDriver\WebDriverExpectedCondition;
use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase;

class CustomFileChangeTest extends MikoPBXTestsBase
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
    public function testChangeCustomFile($params): void
    {
        // Входим на страницу файлами
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');
        $this->clickSidebarMenuItemByHref("/admin-cabinet/custom-files/index/");


        // Находим строчку с файлом по пути из базы данных
        $this->clickModifyButtonOnRowWithText($params['filePath']);

        $this->changeTextAreaValue('description', $params['description']);

        $this->selectDropdownItem('mode', $params['mode']);

        self::$driver->wait()->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::xpath('id("application-code")//textarea')
            )
        );

        $textAreaACEContent = self::$driver->findElement(WebDriverBy::xpath('id("application-code")//textarea'));
        $textAreaACEContent->click();
        self::$driver->wait(3);
        $textAreaACEContent->clear();
        self::$driver->wait(3);
        $textAreaACEContent->sendKeys($params['fileContents']);

        $this->submitForm('custom-file-form');

        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');

        $this->clickSidebarMenuItemByHref("/admin-cabinet/custom-files/index/");

        $filesList = self::$driver->findElement(WebDriverBy::xpath('id("custom-files-table")'));
        $this->assertStringContainsString($params['description'], $filesList->getText());

        // Находим строчку с файлом по пути из базы данных
        $this->clickModifyButtonOnRowWithText($params['filePath']);

        $this->assertTextAreaValueIsEqual('description', $params['description']);

        // Находим строчку с нужной опцией по значению
        $this->assertMenuItemSelected('mode', $params['mode']);

        $hiddenValue = self::$driver->findElement(WebDriverBy::xpath("//*[@id = 'content']"));
        $this->assertEquals($params['fileContents'], $hiddenValue->getAttribute('value'));
    }

    /**
     * Dataset provider
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params   = [];
        $params[] = [
            [
                'filePath'     => '/var/spool/cron/crontabs/root',
                'mode'         => 'append',
                'fileContents' => "*/1 * * * * /etc/rc/remount-offload-rw > /dev/null 2> /dev/null",
                'description'  => 'Подключаем режим записи для Offload диска',
            ],
        ];

        return $params;
    }
}