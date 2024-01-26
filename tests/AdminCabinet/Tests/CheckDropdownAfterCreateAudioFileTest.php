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

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CheckDropdownAfterCreateAudioFileTest extends MikoPBXTestsBase
{
    /**
     * Test checking the dropdown menu after creating audio files.
     *
     * @dataProvider audioFilesProvider
     *
     * @param array $params The parameters for the audio file.
     */
    public function testCheckDropdownAfterCreateAudioFiles(array $params): void
    {
        // Navigate to the recording settings page
        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/recording");

        // Check if the specified element exists in the dropdown menu
        $elementFound = $this->checkIfElementExistOnDropdownMenu('PBXRecordAnnouncementIn', $params['name']);

        // Asserts
        if (!$elementFound) {
            $this->fail('Not found menuitem ' . $params['name'] . PHP_EOL);
        } else {
            // Increment assertion counter
            $this->assertTrue(true);
        }
    }

    /**
     * Dataset provider that retrieves data from CreateAudioFilesTest.
     *
     * @return array
     */
    public function audioFilesProvider(): array
    {
        // Create an instance of CreateAudioFilesTest to access its dataset provider
        $audioFiles = new CreateAudioFilesTest();

        // Return data from the dataset provider of CreateAudioFilesTest
        return $audioFiles->additionProvider();
    }
}