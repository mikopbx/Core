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

/**
 * Base class for SIP provider creation tests
 */
abstract class CreateSIPProviderTest extends MikoPBXTestsBase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Create SIP provider - " . $this->getSIPProviderData()['description']);
    }

    /**
     * Get SIP provider data
     */
    abstract protected function getSIPProviderData(): array;

    /**
     * Test creating SIP provider
     */
    public function testCreateSIPProvider(): void
    {
        $params = $this->getSIPProviderData();
        self::annotate("Creating SIP provider: {$params['description']}");

        try {
            $this->createSIPProvider($params);
            $this->verifySIPProvider($params);
            self::annotate("Successfully created SIP provider: {$params['description']}", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create SIP provider: {$params['description']}", 'error');
            throw $e;
        }
    }

    /**
     * Create SIP provider
     */
    protected function createSIPProvider(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickButtonByHref('/admin-cabinet/providers/modifysip');

        $this->fillBasicFields($params);
        $this->fillAdvancedOptions($params);

        $this->submitForm('save-provider-form');
    }

    /**
     * Fill basic provider fields
     */
    protected function fillBasicFields(array $params): void
    {
        // Fix uniqid
        self::$driver->executeScript(
            "$('#save-provider-form').form('set value','uniqid','{$params['uniqid']}');"
        );

        $this->selectDropdownItem('registration_type', $params['registration_type']);
        $this->changeInputField('description', $params['description']);

        if ($params['registration_type'] === 'outbound') {
            $this->changeInputField('host', $params['host']);
            $this->changeInputField('username', $params['username']);
        }
        if ($params['registration_type'] === 'none') {
            $this->changeInputField('host', $params['host']);
        } else {
            $this->changeInputField('secret', $params['password']);
        }
    }

    /**
     * Fill advanced provider options
     */
    protected function fillAdvancedOptions(array $params): void
    {
        $this->openAccordionOnThePage();

        $this->changeInputField('port', $params['port']);
        $this->changeCheckBoxState('qualify', $params['qualify']);
        if ($params['qualify']) {
            $this->changeInputField('qualifyfreq', $params['qualifyfreq']);
        }

        $this->changeInputField('outbound_proxy', $params['outbound_proxy']);
        if ($params['disablefromuser'] !== false) {
            $this->changeInputField('fromuser', $params['fromuser']);
        }

        $this->changeInputField('fromdomain', $params['fromdomain']);
        $this->changeCheckBoxState('disablefromuser', $params['disablefromuser']);
        $this->selectDropdownItem('dtmfmode', $params['dtmfmode']);
        $this->changeTextAreaValue('manualattributes', $params['manualattributes']);
    }

    /**
     * Verify SIP provider creation
     */
    protected function verifySIPProvider(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickModifyButtonOnRowWithText($params['description']);

        $this->verifyBasicFields($params);
        $this->verifyAdvancedOptions($params);
    }

    /**
     * Verify basic provider fields
     */
    protected function verifyBasicFields(array $params): void
    {
        $this->assertMenuItemSelected('registration_type', $params['registration_type']);
        $this->assertInputFieldValueEqual('description', $params['description']);

        if ($params['registration_type'] === 'outbound') {
            $this->assertInputFieldValueEqual('host', $params['host']);
            $this->assertInputFieldValueEqual('username', $params['username']);
        }
        if ($params['registration_type'] === 'none') {
            $this->assertInputFieldValueEqual('host', $params['host']);
        } else {
            $this->assertInputFieldValueEqual('secret', $params['password']);
        }
    }

    /**
     * Verify advanced provider options
     */
    protected function verifyAdvancedOptions(array $params): void
    {
        $this->openAccordionOnThePage();

        $this->assertInputFieldValueEqual('port', $params['port']);
        $this->assertCheckBoxStageIsEqual('qualify', $params['qualify']);
        if ($params['qualify']) {
            $this->assertInputFieldValueEqual('qualifyfreq', $params['qualifyfreq']);
        }

        $this->assertInputFieldValueEqual('outbound_proxy', $params['outbound_proxy']);
        if ($params['disablefromuser'] !== false) {
            $this->assertInputFieldValueEqual('fromuser', $params['fromuser']);
        }

        $this->assertInputFieldValueEqual('fromdomain', $params['fromdomain']);
        $this->assertCheckBoxStageIsEqual('disablefromuser', $params['disablefromuser']);
        $this->assertMenuItemSelected('dtmfmode', $params['dtmfmode']);
        $this->assertTextAreaValueIsEqual('manualattributes', $params['manualattributes']);
    }
}
