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
 * Class CreateAudioFilesTest
 *
 * This class contains tests for creating and managing audio files.
 */
class CreateAudioFilesTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Creating audio files");
    }

    /**
     * Test creating an audio file.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the audio file.
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testCreateAudioFile(array $params): void
    {
        // Navigate to the sound files page and delete any existing files with the same name
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
        $this->clickDeleteButtonOnRowWithText($params['name']);

        // Click the "Add Custom Sound File" button
        $this->clickButtonByHref('/admin-cabinet/sound-files/modify/custom');

        // Upload the audio file
        $this->changeFileField('sound-file', $params['path']);

        // Wait for the form to finish loading
        self::$driver->wait(2);
        self::$driver->wait(30, 500)->until(
            function ($driver) {
                $xpath = '//form[@id="sound-file-form"]';
                $form = $driver->findElement(WebDriverBy::xpath($xpath));
                $class = $form->getAttribute('class');
                return stripos($class, 'loading') === false;
            }
        );

        // Set the name for the audio file
        $this->changeInputField('name', $params['name']);

        // Submit the form to create the audio file
        $this->submitForm('sound-file-form');

        // Navigate back to the sound files page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');

        // Click the "Modify" button on the newly created audio file
        $this->clickModifyButtonOnRowWithText($params['name']);

        // Verify that the name input field matches the expected name
        $this->assertInputFieldValueEqual('name', $params['name']);
    }

    /**
     * Dataset provider for audio file parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['The first audio record 250Hz_44100Hz_16bit_05sec.wav'] = [
            [
                'name' => 'The first audio record',
                'path' => 'C:\Users\hello\Documents\audio\250Hz_44100Hz_16bit_05sec.wav',
                'for_delete' => false,
            ]
        ];
        $params['The second audio record blind_willie.mp3'] = [
            [
                'name' => 'The second audio record',
                'path' => 'C:\Users\hello\Documents\audio\blind_willie.mp3',
                'for_delete' => false,
            ]
        ];

        $params['The third audio record first_noel.mp3'] = [
            [
                'name' => 'The third audio record',
                'path' => 'C:\Users\hello\Documents\audio\first_noel.mp3',
                'for_delete' => false,
            ]
        ];

        $params['The fourth audio record first_noel.mp3'] = [
            [
                'name' => 'The fourth audio record',
                'path' => 'C:\Users\hello\Documents\audio\first_noel.mp3',
                'for_delete' => true,
            ]
        ];

        return $params;
    }
}