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
use Facebook\WebDriver\WebDriverExpectedCondition;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

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
                WebDriverBy::xpath('id("user-edit-config")/textarea')
            )
        );

        $textAreaACEContent = self::$driver->findElement(WebDriverBy::xpath('id("user-edit-config")/textarea'));
        $textAreaACEContent->getLocationOnScreenOnceScrolledIntoView();
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