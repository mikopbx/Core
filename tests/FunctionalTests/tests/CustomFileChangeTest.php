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

class CustomFileChangeTest extends BrowserStackTest
{
    use  LoginTrait;
    /**
     * @depends testLogin
     */
    public function testChangeCustomFile(): void
    {
        // Входим на страницу файлами
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');
        $xpath                  = '//div[@id="sidebar-menu"]//ancestor::a[contains(@class, "item") and contains(@href ,"/admin-cabinet/custom-files/index/")]';
        $a_CustomFilesIndexPage = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $a_CustomFilesIndexPage->click();

        $filesData = $this->getFilesData();
        foreach ($filesData as $record){
            // Находим строчку с файлом по пути из базы данных
            $xpath = ('//td[contains(text(),"'.$record['filePath'].'")]/ancestor::tr[contains(@class, "row")]//a[contains(@href,"modify")]');
            $newCustomFileTr = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $newCustomFileTr->click();

            $textAreaDescription	= self::$driver->findElement(WebDriverBy::xpath("//textarea[@id = 'description' and @name = 'description']"));
            $textAreaDescription->clear();
            $textAreaDescription->sendKeys($record['description']);

            $dropDownMenuTypeEdit	= self::$driver->findElement(WebDriverBy::xpath("//div[@class = 'ui selection dropdown type-select']"));
            $dropDownMenuTypeEdit->click();
            // Находим строчку с нужной опцией по значению
            $xpath    = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[@data-value="' . $record['mode'] . '"]';
            $menuItem = self::$driver->wait()->until(
                \Facebook\WebDriver\WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
            );
            $menuItem->click();

            self::$driver->wait()->until(
                \Facebook\WebDriver\WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath('id("application-code")//textarea'))
            );
            $textAreaACEContent=self::$driver->findElement(WebDriverBy::xpath('id("application-code")//textarea'));
            $textAreaACEContent->sendKeys($record['fileContents']);

            $buttonSubmit = self::$driver->findElement(WebDriverBy::xpath('id("submitbutton")'));
            $buttonSubmit->click();
            self::$driver->wait(10, 500)->until(
                function ($driver) {
                    $xpath         = 'id("submitbutton")';
                    $button_Submit = $driver->findElement(WebDriverBy::xpath($xpath));
                    return $button_Submit->isEnabled();
                }
            );

            self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');
            $xpath                  = '//div[@id="sidebar-menu"]//ancestor::a[contains(@class, "item") and contains(@href ,"/admin-cabinet/custom-files/index/")]';
            $a_CustomFilesIndexPage = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $a_CustomFilesIndexPage->click();

            $filesList = self::$driver->findElement(WebDriverBy::xpath('id("custom-files-table")'));
            $this->assertStringContainsString($record['description'], $filesList->getText());

            // Находим строчку с файлом по пути из базы данных
            $xpath = ('//td[contains(text(),"'.$record['filePath'].'")]/ancestor::tr[contains(@class, "row")]//a[contains(@href,"modify")]');
            $newCustomFileTr = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $newCustomFileTr->click();

            $textAreaDescription	= self::$driver->findElement(WebDriverBy::xpath("//textarea[@id = 'description' and @name = 'description']"));
            $this->assertEquals($record['description'], $textAreaDescription->getText());

            // Находим строчку с нужной опцией по значению
            $xpath             = '//select[@name="mode"]/option[@selected="selected"]';
            $selectedExtension = self::$driver->findElements(WebDriverBy::xpath($xpath));
            foreach ($selectedExtension as $element) {
                $this->assertEquals($record['mode'], $element->getAttribute('value'));
            }

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
                'fileContents'=>'*/1 * * * * /etc/rc/remount-offload-rw > /dev/null 2> /dev/null',
                'description'=>'Подключаем режим записи для Offload диска'
            ]
        ];
    }
}