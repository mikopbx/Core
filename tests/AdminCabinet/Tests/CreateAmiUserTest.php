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

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\AmiPermissionsTrait;
use Facebook\WebDriver\WebDriverBy;

/**
 * Base class for AMI user creation tests
 */
abstract class CreateAmiUserTest extends MikoPBXTestsBase
{
    use AmiPermissionsTrait;
    private static bool $isTableCleared = false;

    protected function setUp(): void
    {
        parent::setUp();

        if (!self::$isTableCleared) {
            $this->clearAmiUsersTable();
            self::$isTableCleared = true;
        }

        $this->setSessionName("Test: Create AMI User - " . $this->getAmiUserData()['username']);
    }

    /**
     * Clear AMI users table
     */
    protected function clearAmiUsersTable(): void
    {
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');

        $tableId = 'ami-users-table';
        $this->deleteAllRecordsOnTable($tableId);

        $xpath = "//table[@id='{$tableId}']//a[contains(@href,'delete') and not(contains(@class,'disabled'))]";
        $this->assertElementNotFound(WebDriverBy::xpath($xpath));
    }

    /**
     * Get AMI user data
     */
    abstract protected function getAmiUserData(): array;

    /**
     * Test creating AMI user
     */
    public function testCreateAmiUser(): void
    {
        $params = $this->getAmiUserData();
        self::annotate("Creating AMI user: {$params['username']}");

        try {
            $this->createAmiUser($params);
            $this->verifyAmiUser($params);
            self::annotate("Successfully created AMI user: {$params['username']}", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create AMI user: {$params['username']}", 'error');
            throw $e;
        }
    }

    /**
     * Create AMI user
     */
    protected function createAmiUser(array $params): void
    {
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');
        $this->clickButtonByHref('/admin-cabinet/asterisk-managers/modify');

        $this->fillAmiUserForm($params);
        $this->submitForm('save-ami-form');
    }

    /**
     * Fill AMI user form
     */
    protected function fillAmiUserForm(array $params): void
    {
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('username', $params['username']);
        $this->changeInputField('secret', $params['secret']);
        $this->setPermissions($params['permissions']);
    }

    /**
     * Verify AMI user
     */
    protected function verifyAmiUser(array $params): void
    {
        self::$driver->executeScript('document.getElementById("sidebar-menu").scrollTo(0,document.body.scrollHeight);');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/asterisk-managers/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);

        $this->assertTextAreaValueIsEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('username', $params['username']);
        // AMI user passwords are not masked
        $this->assertInputFieldValueEqual('secret', $params['secret']);
        $this->verifyPermissions($params['permissions']);
    }
}
