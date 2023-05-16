<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class DeleteAudioFileTest extends MikoPBXTestsBase
{
    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     *
     */
    public function testDeleteAudioFile(array $params): void
    {
        if ( ! $params['for_delete']) {
            $this->assertTrue(true);
            return;
        }

        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
        $this->clickModifyButtonOnRowWithText($params['name']);
        // TESTS
        $xpath           = "//input[@name = 'id']";
        $input_elementID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $elementID       = $input_elementID->getAttribute('value');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');

        $this->clickDeleteButtonOnRowWithText($params['name']);
        $this->waitForAjax();

        // Try to find element with ID on page

        $xpath = "//table[@id='custom-sound-files-table']//tr[@id='{$elementID}']";
        $els   = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if (count($els) > 0) {
            $this->fail("Unexpectedly element was found by " . $xpath . PHP_EOL);
        } else {
            // increment assertion counter
            $this->assertTrue(true);
        }
    }


    /**
     * Dataset provider
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $audioFiles = new CreateAudioFilesTest();
        return $audioFiles->additionProvider();
    }
}