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
 * Class CheckDropdownAfterDeleteAudioFileTest
 * Tests the dropdown menu state after audio file deletion
 */
class CheckDropdownAfterDeleteAudioFileTest extends MikoPBXTestsBase
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
        $this->setSessionName('Test: Check file selection dropdown after audio file deletion');
    }

    /**
     * Test the dropdown menu state after audio file deletion
     *
     * @dataProvider audioFilesProvider
     *
     * @param string $audioKey The key identifier for the audio file
     * @return void
     */
    public function testCheckDropdownAfterDeleteAudioFile(string $audioKey): void
    {
        try {
            // Get audio file data from factory
            $audioData = AudioFilesDataFactory::getAudioFileData($audioKey);

            // Navigate to the recording settings page
            self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/recording");
            $this->waitForAjax();

            // Check dropdown menu state
            $elementFound = $this->checkIfElementExistOnDropdownMenu(
                PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN,
                $audioData['name']
            );

            // Verify the expected state based on the file's deletion status
            if ($audioData['for_delete']) {
                // File marked for deletion should not be in dropdown
                if ($elementFound) {
                    $this->fail("Audio file '{$audioData['name']}' was found in dropdown menu but should have been deleted");
                }
                $this->assertTrue(true, "Audio file '{$audioData['name']}' correctly not found after deletion");
            } else {
                // File not marked for deletion should still be in dropdown
                if (!$elementFound) {
                    $this->fail("Audio file '{$audioData['name']}' not found in dropdown menu but should exist");
                }
                $this->assertTrue(true, "Audio file '{$audioData['name']}' correctly found in dropdown");
            }

        } catch (\Exception $e) {
            $this->fail("Failed to test dropdown menu for audio file '{$audioData['name']}': " . $e->getMessage());
        }
    }

    /**
     * Data provider for audio files test
     * Returns all audio files to verify both deleted and non-deleted states
     *
     * @return array
     */
    public function audioFilesProvider(): array
    {
        $testData = [];

        // Get all audio file keys to test both deleted and non-deleted files
        $audioKeys = AudioFilesDataFactory::getAllAudioFileKeys();

        foreach ($audioKeys as $key) {
            $audioData = AudioFilesDataFactory::getAudioFileData($key);
            $testName = $audioData['for_delete']
                ? "Deleted audio file: {$key}"
                : "Existing audio file: {$key}";

            $testData[$testName] = [$key];
        }

        return $testData;
    }
}
