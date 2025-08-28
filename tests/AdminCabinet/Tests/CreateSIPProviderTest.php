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
    public function createSIPProvider(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickButtonByHref('/admin-cabinet/providers/modifysip');

        $this->fillBasicFields($params);
        $this->fillAdvancedOptions($params);
        $this->fillDidAndCallerIdFields($params);

        $this->submitForm('save-provider-form');
        
        // Verify provider was created by checking the ID field
        $xpath = "//input[@name = 'id']";
        $input_ProviderID = self::$driver->findElement(\Facebook\WebDriver\WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ProviderID->getAttribute('value'), 'Provider ID should be set after creation');
    }

    /**
     * Fill basic provider fields
     */
    protected function fillBasicFields(array $params): void
    {
        // Fix id (previously uniqid)
        self::$driver->executeScript(
            "$('#save-provider-form').form('set value','id','{$params['uniqid']}');"
        );

        $this->selectDropdownItem('registration_type', $params['registration_type']);
        $this->changeInputField('description', $params['description']);

        if ($params['registration_type'] === 'outbound') {
            $this->changeInputField('host', $params['host']);
            $this->changeInputField('username', $params['username']);
        }
        if ($params['registration_type'] === 'none') {
            $this->changeInputField('host', $params['host']);
        }
        // For inbound registration, username is automatically set to uniqid and is readonly
        // so we skip setting it
        
        if ($params['registration_type'] !== 'none') {
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
        
        // Use safer dropdown selection for DTMF mode to prevent navigation issues
        $this->selectDropdownItemWithFallback('dtmfmode', $params['dtmfmode'], true);
        
        $this->changeTextAreaValue('manualattributes', $params['manualattributes']);
    }

    /**
     * Fill DID and CallerID fields
     */
    protected function fillDidAndCallerIdFields(array $params): void
    {
        // Skip if fields are not present in test data
        if (!isset($params['did_source'])) {
            return;
        }

        // Set DID source
        $this->selectDropdownItem('did-source', $params['did_source']);
        
        // If DID source is custom, fill custom fields
        if ($params['did_source'] === 'custom') {
            $this->changeInputField('did_custom_header', $params['did_custom_header']);
            $this->changeInputField('did_parser_start', $params['did_parser_start']);
            $this->changeInputField('did_parser_end', $params['did_parser_end']);
            $this->changeInputField('did_parser_regex', $params['did_parser_regex']);
        }
        
        // Set CallerID source
        $this->selectDropdownItem('cid_source', $params['cid_source']);
        
        // If CallerID source is custom, fill custom fields
        if ($params['cid_source'] === 'custom') {
            $this->changeInputField('cid_custom_header', $params['cid_custom_header']);
            $this->changeInputField('cid_parser_start', $params['cid_parser_start']);
            $this->changeInputField('cid_parser_end', $params['cid_parser_end']);
            $this->changeInputField('cid_parser_regex', $params['cid_parser_regex']);
        }
        
        // Set debug checkbox
        $this->changeCheckBoxState('cid_did_debug', $params['cid_did_debug']);
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
        $this->verifyDidAndCallerIdFields($params);
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
        if ($params['registration_type'] === 'inbound') {
            // For inbound registration, username should equal uniqid
            $this->assertInputFieldValueEqual('username', $params['uniqid']);
        }
        if ($params['registration_type'] === 'none') {
            $this->assertInputFieldValueEqual('host', $params['host']);
        }
        
        if ($params['registration_type'] !== 'none') {
            // Password is masked only for outbound providers
            if ($params['registration_type'] === 'outbound') {
                $this->assertPasswordFieldIsMasked('secret');
            } else {
                // For inbound providers, password is not masked
                $this->assertInputFieldValueEqual('secret', $params['password']);
            }
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

    /**
     * Verify DID and CallerID fields
     */
    protected function verifyDidAndCallerIdFields(array $params): void
    {
        // Skip verification if fields are not present in test data
        if (!isset($params['did_source'])) {
            return;
        }

        // Verify DID source dropdown
        $this->assertMenuItemSelected('did-source', $params['did_source']);
        
        // If DID source is custom, verify custom fields
        if ($params['did_source'] === 'custom') {
            $this->assertInputFieldValueEqual('did_custom_header', $params['did_custom_header']);
            $this->assertInputFieldValueEqual('did_parser_start', $params['did_parser_start']);
            $this->assertInputFieldValueEqual('did_parser_end', $params['did_parser_end']);
            $this->assertInputFieldValueEqual('did_parser_regex', $params['did_parser_regex']);
        }
        
        // Verify CallerID source dropdown  
        $this->assertMenuItemSelected('cid_source', $params['cid_source']);
        
        // If CallerID source is custom, verify custom fields
        if ($params['cid_source'] === 'custom') {
            $this->assertInputFieldValueEqual('cid_custom_header', $params['cid_custom_header']);
            $this->assertInputFieldValueEqual('cid_parser_start', $params['cid_parser_start']);
            $this->assertInputFieldValueEqual('cid_parser_end', $params['cid_parser_end']);
            $this->assertInputFieldValueEqual('cid_parser_regex', $params['cid_parser_regex']);
        }
        
        // Verify debug checkbox
        $this->assertCheckBoxStageIsEqual('cid_did_debug', $params['cid_did_debug']);
    }
}
