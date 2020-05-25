<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\FunctionalTests\Tests;


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase;

class CreateAudioFilesTest extends MikoPBXTestsBase
{
    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $soundFile
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testCreateAudioFile($soundFile):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
        $this->clickDeleteButtonOnRowWithText($soundFile['name']);

        $this->clickAddNewButtonByHref('/admin-cabinet/sound-files/modify/custom');

        $this->changeFileField('sound-file', $soundFile['path']);


        self::$driver->wait(30, 500)->until(
            function ($driver) {
                $xpath = '//form[@id="sound-file-form"]';
                $form = $driver->findElement(WebDriverBy::xpath($xpath));
                $class = $form->getAttribute('class');
                return stripos('loading', $class)!==FALSE;
            }
        );

        self::$driver->wait(30, 500)->until(
            function ($driver) {
                $xpath = '//form[@id="sound-file-form"]';
                $form = $driver->findElement(WebDriverBy::xpath($xpath));
                $class = $form->getAttribute('class');
                return stripos('loading', $class)===FALSE;
            }
        );


        $this->changeInputField('name', $soundFile['name']);

        $this->submitForm('sound-file-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');

        $this->clickModifyButtonOnRowWithText($soundFile['name']);
        $this->assertInputFieldValueEqual('name', $soundFile['name']);
    }

    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'name' => 'The first audio record',
            'path'    => 'C:\Users\hello\Documents\audio\250Hz_44100Hz_16bit_05sec.wav',
        ]];
        $params[] = [[
            'name' => 'The second audio record',
            'path'    => 'C:\Users\hello\Documents\audio\blind_willie.mp3',
        ]];
        $params[] = [[
            'name' => 'The third audio record',
            'path'    => 'C:\Users\hello\Documents\audio\first_noel.mp3',
        ]];
        return $params;
    }
}