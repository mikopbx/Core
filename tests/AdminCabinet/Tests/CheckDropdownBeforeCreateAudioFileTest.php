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
use RuntimeException;

/**
 * Class CheckDropdownBeforeCreateAudioFileTest
 * Tests the dropdown menu state before audio files are created
 */
class CheckDropdownBeforeCreateAudioFileTest extends MikoPBXTestsBase
{
    /**
     * Path to the recording settings page
     */
    private const string RECORDING_SETTINGS_PATH = '/admin-cabinet/general-settings/modify/#/recording';

    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName('Test: Check file selection dropdown before audio file upload');
    }

    /**
     * Test the dropdown menu state before audio file creation
     *
     * @dataProvider audioFilesProvider
     *
     * @param string $audioKey The key identifier for the audio file
     * @return void
     */
    public function testCheckDropdownBeforeCreateAudioFiles(string $audioKey): void
    {
        try {
            // Get audio file data from factory
            $audioData = AudioFilesDataFactory::getAudioFileData($audioKey);

            // Navigate to the recording settings page
            self::$driver->get($GLOBALS['SERVER_PBX'] . self::RECORDING_SETTINGS_PATH);
            $this->waitForAjax();

            // Check dropdown menu state
            $elementFound = $this->checkIfElementExistOnDropdownMenu(
                PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN,
                $audioData['name']
            );

            // Verify that the audio file is not yet in the dropdown
            if ($elementFound) {
                $this->fail("Audio file '{$audioData['name']}' found in dropdown menu before creation");
            }

            self::annotate("Successfully verified absence of audio file '{$audioData['name']}' before creation");
            $this->assertTrue(true);

        } catch (\Exception $e) {
            $message = sprintf(
                "Failed to test dropdown menu for audio file '%s': %s",
                $audioData['name'] ?? 'unknown',
                $e->getMessage()
            );
            $this->fail($message);
        }
    }

    /**
     * Data provider for audio files test
     *
     * @return array
     */
    public function audioFilesProvider(): array
    {
        $testData = [];

        try {
            // Get all audio file keys to verify none exist before creation
            $audioKeys = AudioFilesDataFactory::getAllAudioFileKeys();

            foreach ($audioKeys as $key) {
                $audioData = AudioFilesDataFactory::getAudioFileData($key);
                $testData["Pre-creation check: {$audioData['name']}"] = [$key];
            }

        } catch (\Exception $e) {
            throw new RuntimeException("Failed to prepare audio files test data: " . $e->getMessage());
        }

        return $testData;
    }
}