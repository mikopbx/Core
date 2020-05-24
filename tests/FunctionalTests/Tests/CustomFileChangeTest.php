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

class CustomFileChangeTest extends MikoPBXTestsBase
{

    /**
     * @depends testLogin
     */
    public function testChangeCustomFile(): void
    {
        // Входим на страницу файлами
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');
        $this->clickSidebarMenuItemByHref("/admin-cabinet/custom-files/index/");

        $filesData = $this->getFilesData();
        foreach ($filesData as $record){
            // Находим строчку с файлом по пути из базы данных
            $this->clickModifyButtonOnRowWithText($record['filePath']);

            $this->changeTextAreaValue('description', $record['description']);

            $this->selectDropdownItem('mode', $record['mode']);

            self::$driver->wait()->until(
                \Facebook\WebDriver\WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath('id("application-code")//textarea'))
            );

            $textAreaACEContent=self::$driver->findElement(WebDriverBy::xpath('id("application-code")//textarea'));
            $textAreaACEContent->clear();
            $textAreaACEContent->sendKeys($record['fileContents']);

            $this->submitForm('custom-file-form');

            self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');

            $this->clickSidebarMenuItemByHref("/admin-cabinet/custom-files/index/");

            $filesList = self::$driver->findElement(WebDriverBy::xpath('id("custom-files-table")'));
            $this->assertStringContainsString($record['description'], $filesList->getText());

            // Находим строчку с файлом по пути из базы данных
            $this->clickModifyButtonOnRowWithText($record['filePath']);

            $this->assertTextAreaValueIsEqual('description', $record['description']);

            // Находим строчку с нужной опцией по значению
            $this->assertMenuItemSelected('mode', $record['mode']);

            $hiddenValue =self::$driver->findElement(WebDriverBy::xpath("//*[@id = 'content']"));
            $this->assertEquals($hiddenValue->getAttribute('value'), $record['fileContents']);
        }
    }

    protected function getFilesData(): array
    {
        return [
            [
                'filePath'=>'/var/spool/cron/crontabs/root',
                'mode'=>'append',
                'fileContents'=>"*/1 * * * * /etc/rc/remount-offload-rw > /dev/null 2> /dev/null",
                'description'=>'Подключаем режим записи для Offload диска'
            ]
        ];
    }
}