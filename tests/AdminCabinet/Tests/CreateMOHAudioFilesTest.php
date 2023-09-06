<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

class CreateMOHAudioFilesTest extends MikoPBXTestsBase
{

    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testCreateMohFile($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
        $this->changeTabOnCurrentPage('moh');
        $this->clickDeleteButtonOnRowWithText('moh_'.$params['name']);

        $this->clickButtonByHref('/admin-cabinet/sound-files/modify/moh');

        $this->changeFileField('sound-file', $params['path']);


        self::$driver->wait(2);
        self::$driver->wait(30, 500)->until(
            function ($driver) {
                $xpath = '//form[@id="sound-file-form"]';
                $form = $driver->findElement(WebDriverBy::xpath($xpath));
                $class = $form->getAttribute('class');
                return stripos($class, 'loading')===false;
            }
        );

        $this->changeInputField('name', 'moh_'.$params['name']);

        $this->submitForm('sound-file-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
        $this->changeTabOnCurrentPage('moh');

        $this->clickModifyButtonOnRowWithText('moh_'.$params['name']);
        $this->assertInputFieldValueEqual('name', 'moh_'.$params['name']);
    }


    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'name' => 'The first MOH audio record',
            'path'    => 'C:\Users\hello\Documents\audio\250Hz_44100Hz_16bit_05sec.wav',
        ]];
        $params[] = [[
            'name' => 'The second MOH audio record',
            'path'    => 'C:\Users\hello\Documents\audio\blind_willie.mp3',
        ]];
        $params[] = [[
            'name' => 'The third MOH audio record',
            'path'    => 'C:\Users\hello\Documents\audio\first_noel.mp3',
        ]];
        return $params;
    }
}