<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Data\AudioFilesDataFactory;

/**
 * Class CheckDropdownAfterCreateAudioFileTest
 * Tests the dropdown menu functionality after creating audio files
 */
class CheckDropdownAfterCreateAudioFileTest extends MikoPBXTestsBase
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
        $this->setSessionName('Test: Check file selection dropdown after the new one was created');
    }

    /**
     * Test checking the dropdown menu after creating audio files
     *
     * @dataProvider audioFilesProvider
     *
     * @param string $audioKey The key identifier for the audio file
     * @return void
     */
    public function testCheckDropdownAfterCreateAudioFiles(string $audioKey): void
    {
        // Get audio file data from factory
        $audioData = AudioFilesDataFactory::getAudioFileData($audioKey);

        // Skip files marked for deletion in dropdown tests
        if ($audioData['for_delete']) {
            $this->markTestSkipped("Skipping dropdown test for file marked for deletion: {$audioData['name']}");
        }

        try {
            // Navigate to the recording settings page
            self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/recording");
            $this->waitForAjax();

            // Check if the audio file exists in dropdown
            $elementFound = $this->checkIfElementExistOnDropdownMenu(
                PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN,
                $audioData['name']
            );

            if (!$elementFound) {
                $this->fail("Audio file '{$audioData['name']}' not found in dropdown menu");
            }

            $this->assertTrue(true, "Audio file '{$audioData['name']}' found in dropdown menu");

        } catch (\Exception $e) {
            $this->fail("Failed to test dropdown menu for audio file '{$audioData['name']}': " . $e->getMessage());
        }
    }

    /**
     * Data provider for audio files test
     * Returns only non-deletable audio files
     *
     * @return array
     */
    public function audioFilesProvider(): array
    {
        $testData = [];

        // Get only non-delete audio file keys
        $audioKeys = AudioFilesDataFactory::getNonDeleteAudioFileKeys();

        foreach ($audioKeys as $key) {
            $testData["Audio file: {$key}"] = [$key];
        }

        return $testData;
    }
}
