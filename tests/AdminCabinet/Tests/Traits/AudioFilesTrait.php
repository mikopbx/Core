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

namespace MikoPBX\Tests\AdminCabinet\Tests\Traits;

use Facebook\WebDriver\WebDriverBy;

trait AudioFilesTrait
{
    protected const UPLOAD_WAIT_TIME = 2;
    protected const FORM_READY_TIMEOUT = 30;

    /**
     * Upload and process audio file
     */
    protected function uploadAndProcessFile(string $filePath): void
    {
        $this->changeFileField('sound-file', $filePath);

        sleep(self::UPLOAD_WAIT_TIME);

        // Wait for form to finish processing
        self::$driver->wait(self::FORM_READY_TIMEOUT, 500)->until(
            function ($driver) {
                $form = $driver->findElement(WebDriverBy::xpath('//form[@id="sound-file-form"]'));
                return stripos($form->getAttribute('class'), 'loading') === false;
            }
        );
    }

    /**
     * Navigate to audio files section
     */
    protected function navigateToAudioFiles(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
    }

    /**
     * Clear existing file with same name
     */
    protected function clearExistingFile(string $name): void
    {
        $this->clickDeleteButtonOnRowWithText($name);
    }

    /**
     * Create new audio file
     */
    protected function createNewAudioFile(array $params): void
    {
        $this->clickButtonByHref('/admin-cabinet/sound-files/modify/' . $params['type']);
        $this->uploadAndProcessFile($params['path']);
        $this->changeInputField('name', $params['name']);
        $this->submitForm('sound-file-form');
    }

    /**
     * Verify audio file creation
     */
    protected function verifyAudioFile(string $name): void
    {
        $this->navigateToAudioFiles();
        $this->clickModifyButtonOnRowWithText($name);
        $this->assertInputFieldValueEqual('name', $name);
    }
}
