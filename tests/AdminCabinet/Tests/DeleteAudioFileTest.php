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
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class to test the deletion of audio files in the admin cabinet.
 */
class DeleteAudioFileTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Delete audio files");
    }

    /**
     * Test to delete an audio file.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for deleting the audio file.
     */
    public function testDeleteAudioFile(array $params): void
    {
        if (!$params['for_delete']) {
            $this->assertTrue(true);
            return;
        }

        // Click on the sound files in the sidebar menu
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
        $this->clickModifyButtonOnRowWithText($params['name']);

        // Get the element ID of the audio file
        $xpath = "//input[@name = 'id']";
        $input_elementID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $elementID = $input_elementID->getAttribute('value');

        // Go back to the sound files page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');

        // Click the delete button on the row with the audio file's name
        $this->clickDeleteButtonOnRowWithText($params['name']);
        $this->waitForAjax();

        // Try to find the element with the ID on the page
        $xpath = "//table[@id='custom-sound-files-table']//tr[@id='{$elementID}']";
        $els = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if (count($els) > 0) {
            $this->fail("Unexpectedly, the element was found by " . $xpath . PHP_EOL);
        } else {
            // Increment the assertion counter
            $this->assertTrue(true);
        }
    }

    /**
     * Dataset provider for audio file deletion parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        // You can replace this with a proper dataset when needed.
        $audioFiles = new CreateAudioFilesTest();
        return $audioFiles->additionProvider();
    }
}
