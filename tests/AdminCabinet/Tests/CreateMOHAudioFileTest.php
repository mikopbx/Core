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

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Base class for MOH audio file creation tests
 */
abstract class CreateMOHAudioFileTest extends MikoPBXTestsBase
{
    protected const UPLOAD_WAIT_TIME = 2;
    protected const FORM_READY_TIMEOUT = 30;
    protected const MOH_PREFIX = 'moh_';

    protected function setUp(): void
    {
        parent::setUp();
        $data = $this->getAudioFileData();
        $this->setSessionName("Test: Create MOH File - " . $data['name']);
    }

    /**
     * Get audio file data
     */
    abstract protected function getAudioFileData(): array;

    /**
     * Test creating MOH audio file
     */
    public function testCreateMOHFile(): void
    {
        $params = $this->getAudioFileData();
        self::annotate("Creating MOH audio file: {$params['name']} ({$params['filename']})");

        try {
            $this->createMOHFile($params);
            $this->verifyMOHFile($params);
            self::annotate("Successfully created MOH audio file", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create MOH audio file", 'error');
            throw $e;
        }
    }

    /**
     * Create MOH audio file
     */
    protected function createMOHFile(array $params): void
    {
        $this->navigateToMOHSection();
        $this->deleteExistingFile($params['name']);

        $this->clickButtonByHref('/admin-cabinet/sound-files/modify/moh');

        $this->uploadAndWaitForFile($params);
        $this->setFileName($params['name']);

        $this->submitForm('sound-file-form');
    }

    /**
     * Navigate to MOH section
     */
    protected function navigateToMOHSection(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/sound-files/index/');
        $this->changeTabOnCurrentPage('moh');
    }

    /**
     * Delete existing file if exists
     */
    protected function deleteExistingFile(string $name): void
    {
        $fullName = self::MOH_PREFIX . $name;
        $this->clickDeleteButtonOnRowWithText($fullName);
    }

    /**
     * Upload file and wait for processing
     */
    protected function uploadAndWaitForFile(array $params): void
    {
        $this->changeFileField('sound-file', $params['path']);

        sleep(self::UPLOAD_WAIT_TIME);

        self::$driver->wait(self::FORM_READY_TIMEOUT, 500)->until(
            function ($driver) {
                $form = $driver->findElement(WebDriverBy::xpath('//form[@id="sound-file-form"]'));
                return stripos($form->getAttribute('class'), 'loading') === false;
            }
        );
    }

    /**
     * Set file name
     */
    protected function setFileName(string $name): void
    {
        $fullName = self::MOH_PREFIX . $name;
        $this->changeInputField('name', $fullName);
    }

    /**
     * Verify MOH file creation
     */
    protected function verifyMOHFile(array $params): void
    {
        $this->navigateToMOHSection();

        $fullName = self::MOH_PREFIX . $params['name'];
        $this->clickModifyButtonOnRowWithText($fullName);

        $this->assertInputFieldValueEqual('name', $fullName);
    }
}
