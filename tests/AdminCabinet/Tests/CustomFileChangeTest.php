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
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class to test custom file changes in the admin cabinet.
 */
class CustomFileChangeTest extends MikoPBXTestsBase
{

    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Make custom files changes");
    }

    /**
     * Test to change a custom file.
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for changing the custom file.
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testChangeCustomFile(array $params): void
    {
        // Scroll to the bottom of the sidebar menu to access the files page
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');
        $this->clickSidebarMenuItemByHref("/admin-cabinet/custom-files/index/");

        // Click the modify button on the row with the specified file path
        $this->clickModifyButtonOnRowWithText($params['filePath']);

        // Change the description
        $this->changeTextAreaValue('description', $params['description']);

        // Select the mode
        $this->selectDropdownItem('mode', $params['mode']);

        // Wait for the text area to be present
        self::$driver->wait()->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::xpath('id("user-edit-config")/textarea')
            )
        );

        // Find and clear the ACE editor content, then enter new content
        $textAreaACEContent = self::$driver->findElement(WebDriverBy::xpath('id("user-edit-config")/textarea'));
        $textAreaACEContent->getLocationOnScreenOnceScrolledIntoView();
        self::$driver->wait(3);
        $textAreaACEContent->clear();
        self::$driver->wait(3);
        $textAreaACEContent->sendKeys($params['fileContents']);

        // Submit the form
        $this->submitForm('custom-file-form');

        // Scroll to the bottom of the sidebar menu
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');

        // Navigate back to the custom files page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/custom-files/index/");

        // Find the files list and assert that the description is present
        $filesList = self::$driver->findElement(WebDriverBy::xpath('id("custom-files-table")'));
        $this->assertStringContainsString($params['description'], $filesList->getText());

        // Click the modify button on the row with the specified file path again
        $this->clickModifyButtonOnRowWithText($params['filePath']);

        // Assert that the description matches
        $this->assertTextAreaValueIsEqual('description', $params['description']);

        // Assert that the selected mode matches
        $this->assertMenuItemSelected('mode', $params['mode']);

        // Find the hidden value and assert that it matches the file contents
        $hiddenValue = self::$driver->findElement(WebDriverBy::xpath("//*[@id = 'content']"));
        $this->assertEquals($params['fileContents'], $hiddenValue->getAttribute('value'));
    }

    /**
     * Dataset provider for custom file change parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['crontabs'] = [
            [
                'filePath' => '/var/spool/cron/crontabs/root',
                'mode' => 'append',
                'fileContents' => "*/1 * * * * /etc/rc/remount-offload-rw > /dev/null 2> /dev/null",
                'description' => 'Подключаем режим записи для Offload диска',
            ],
        ];

        return $params;
    }
}