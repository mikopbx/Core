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
use Facebook\WebDriver\WebDriverExpectedCondition;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

abstract class CreateDialPlanApplicationTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Creating dialplan application");
    }


    /**
     * Create a dialplan application with given parameters
     *
     * @param array $params The parameters for the new application.
     */
    protected function createDialplanApplication(array $params): void
    {
        // Navigate to the dialplan applications page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/dialplan-applications/index/");

        // Delete any existing application with the same extension
        try {
            $this->clickDeleteButtonOnRowWithText($params['extension']);
        } catch (\Exception $e) {
            // Log the error as information instead of failing the test
            self::annotate(
                sprintf('DialplanApplication "%s" not found for deletion (this is expected if DialplanApplication does not exist): %s', $params['extension'], $e->getMessage()),
                'info'
            );
        }

        // Click the button to modify the dialplan application
        $this->clickButtonByHref('/admin-cabinet/dialplan-applications/modify');

        // Fix uniqid to compare reference data in /etc folder for every build
        self::$driver->executeScript(
            "$('#dialplan-application-form').form('set value','uniqid','{$params['uniqid']}');"
        );

        // Set the application's name, description, extension, and type
        $this->changeInputField('name', $params['name']);
        if (isset($params['description'])) {
            $this->changeTextAreaValue('description', $params['description']);
        }
        $this->changeInputField('extension', $params['extension']);
        $this->selectDropdownItem('type', $params['type']);

        // Switch to the 'code' tab and set the application's logic
        $this->changeTabOnCurrentPage('code');
        
        // Wait for ACE editor to be initialized
        self::$driver->wait(5, 100)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::xpath('//div[@id="application-code"]//textarea')
            )
        );
        
        // Set value using ACE editor's JavaScript API
        // This ensures proper synchronization and formatting
        $escapedCode = json_encode($params['applicationlogic']);
        self::$driver->executeScript(
            "ace.edit('application-code').getSession().setValue({$escapedCode});"
        );

        // Save the application
        $this->submitForm('dialplan-application-form');

        // Navigate back to the dialplan applications page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/dialplan-applications/index/");

        // Assert that the application's details match the expected values
        $this->clickModifyButtonOnRowWithText($params['extension']);
        $this->assertInputFieldValueEqual('name', $params['name']);
        if (isset($params['description'])) {
            $this->assertTextAreaValueIsEqual('description', $params['description']);
        }
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        $this->assertMenuItemSelected('type', $params['type']);
        
        // Switch to code tab to check the ACE editor value
        $this->changeTabOnCurrentPage('code');
        $this->assertAceEditorValueEqual('application-code', $params['applicationlogic']);
    }

    /**
     * Test method for individual dialplan application tests
     */
    public function testCreateDialplanApplication(): void
    {
        $this->createDialplanApplication($this->getDialplanApplicationData());
    }

    /**
     * Get dialplan application test data
     * Must be implemented by child classes
     *
     * @return array
     */
    abstract protected function getDialplanApplicationData(): array;

}
