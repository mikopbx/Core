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
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;

/**
 * Base class for SIP provider creation tests
 * Simplified and unified version using standard trait methods
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
        // Navigate to providers page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickButtonByHref('/admin-cabinet/providers/modifysip');

        // Fill all provider fields
        $this->fillProviderForm($params);

        // Submit form - scrolling is now automatic in submitForm method
        $this->submitForm('save-provider-form');

        // Verify provider was created by checking the ID field
        $this->waitForElement("//input[@name='id']");
        $providerId = self::$driver->findElement(WebDriverBy::xpath("//input[@name='id']"))->getAttribute('value');
        $this->assertNotEmpty($providerId, 'Provider ID should be set after creation');

        self::annotate("Provider created with ID: {$providerId}", 'info');
    }


    /**
     * Fill provider form with all data
     */
    protected function fillProviderForm(array $params): void
    {
        // Set provider unique ID via JavaScript (readonly field)
        self::$driver->executeScript(
            "$('#save-provider-form').form('set value','id','{$params['uniqid']}');"
        );

        // Basic fields
        $this->fillBasicFields($params);

        // Advanced options (if accordion needs to be opened)
        if ($this->hasAdvancedOptions($params)) {
            $this->openAccordionOnThePage();
            $this->fillAdvancedFields($params);
        }

        // DID and CallerID fields (optional)
        if (isset($params['did_source'])) {
            $this->fillDidCallerIdFields($params);
        }
    }

    /**
     * Fill basic provider fields
     */
    protected function fillBasicFields(array $params): void
    {
        // Registration type dropdown
        $this->selectDropdownItem('registration_type', $params['registration_type']);

        // Description
        $this->changeInputField('description', $params['description']);

        // Fields based on registration type
        switch ($params['registration_type']) {
            case 'outbound':
                $this->changeInputField('host', $params['host']);
                $this->changeInputField('username', $params['username']);
                $this->changeInputField('secret', $params['password']);
                break;

            case 'inbound':
                // Username is auto-set to uniqid for inbound, password is required
                $this->changeInputField('secret', $params['password']);
                break;

            case 'none':
                $this->changeInputField('host', $params['host']);
                break;
        }
    }

    /**
     * Check if provider has advanced options to fill
     */
    protected function hasAdvancedOptions(array $params): bool
    {
        return isset($params['port']) ||
               isset($params['qualify']) ||
               isset($params['outbound_proxy']) ||
               isset($params['fromdomain']) ||
               isset($params['dtmfmode']) ||
               isset($params['manualattributes']);
    }

    /**
     * Fill advanced provider fields
     */
    protected function fillAdvancedFields(array $params): void
    {
        // Port
        if (isset($params['port'])) {
            $this->changeInputField('port', $params['port']);
        }

        // Qualify settings
        if (isset($params['qualify'])) {
            $this->changeCheckBoxState('qualify', $params['qualify']);
            if ($params['qualify'] && isset($params['qualifyfreq'])) {
                $this->changeInputField('qualifyfreq', $params['qualifyfreq']);
            }
        }

        // Outbound proxy
        if (isset($params['outbound_proxy'])) {
            $this->changeInputField('outbound_proxy', $params['outbound_proxy']);
        }

        // From user settings
        if (isset($params['disablefromuser'])) {
            $this->changeCheckBoxState('disablefromuser', $params['disablefromuser']);
            if (!$params['disablefromuser'] && isset($params['fromuser'])) {
                $this->changeInputField('fromuser', $params['fromuser']);
            }
        }

        // From domain
        if (isset($params['fromdomain'])) {
            $this->changeInputField('fromdomain', $params['fromdomain']);
        }

        // DTMF mode
        if (isset($params['dtmfmode'])) {
            $this->selectDropdownItem('dtmfmode', $params['dtmfmode']);
        }

        // Manual attributes
        if (isset($params['manualattributes'])) {
            $this->changeTextAreaValue('manualattributes', $params['manualattributes']);
        }
    }

    /**
     * Fill DID and CallerID fields
     */
    protected function fillDidCallerIdFields(array $params): void
    {
        // DID source settings
        if (isset($params['did_source'])) {
            $this->selectDropdownItem('did_source', $params['did_source']);

            // Custom DID parser fields
            if ($params['did_source'] === 'custom') {
                $this->fillCustomParserFields('did', $params);
            }
        }

        // CallerID source settings
        if (isset($params['cid_source'])) {
            $this->selectDropdownItem('cid_source', $params['cid_source']);

            // Custom CallerID parser fields
            if ($params['cid_source'] === 'custom') {
                $this->fillCustomParserFields('cid', $params);
            }
        }

        // Debug checkbox
        if (isset($params['cid_did_debug'])) {
            $this->changeCheckBoxState('cid_did_debug', $params['cid_did_debug']);
        }
    }

    /**
     * Fill custom parser fields for DID or CallerID
     */
    protected function fillCustomParserFields(string $prefix, array $params): void
    {
        $fields = ['custom_header', 'parser_start', 'parser_end', 'parser_regex'];

        foreach ($fields as $field) {
            $key = "{$prefix}_{$field}";
            if (isset($params[$key])) {
                $this->changeInputField($key, $params[$key]);
            }
        }
    }

    /**
     * Verify SIP provider was created correctly
     */
    protected function verifySIPProvider(array $params): void
    {
        // Navigate back to providers list
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');

        // Open the created provider for editing
        $this->clickModifyButtonOnRowWithText($params['description']);

        // Verify all fields
        $this->verifyProviderForm($params);
    }

    /**
     * Verify provider form contains correct data
     */
    protected function verifyProviderForm(array $params): void
    {
        // Verify basic fields
        $this->verifyBasicFields($params);

        // Verify advanced fields (if present)
        if ($this->hasAdvancedOptions($params)) {
            $this->openAccordionOnThePage();
            $this->verifyAdvancedFields($params);
        }

        // Verify DID and CallerID fields (if present)
        if (isset($params['did_source'])) {
            $this->verifyDidCallerIdFields($params);
        }
    }

    /**
     * Verify basic provider fields
     */
    protected function verifyBasicFields(array $params): void
    {
        // Registration type
        $this->assertMenuItemSelected('registration_type', $params['registration_type']);

        // Description
        $this->assertInputFieldValueEqual('description', $params['description']);

        // Fields based on registration type
        switch ($params['registration_type']) {
            case 'outbound':
                $this->assertInputFieldValueEqual('host', $params['host']);
                $this->assertInputFieldValueEqual('username', $params['username']);
                // Password should be masked for outbound
                $this->assertPasswordFieldIsMasked('secret');
                break;

            case 'inbound':
                // Username should equal uniqid for inbound
                $this->assertInputFieldValueEqual('username', $params['uniqid']);
                // Password is visible for inbound
                $this->assertInputFieldValueEqual('secret', $params['password']);
                break;

            case 'none':
                $this->assertInputFieldValueEqual('host', $params['host']);
                break;
        }
    }

    /**
     * Verify advanced provider fields
     */
    protected function verifyAdvancedFields(array $params): void
    {
        // Port
        if (isset($params['port'])) {
            $this->assertInputFieldValueEqual('port', $params['port']);
        }

        // Qualify settings
        if (isset($params['qualify'])) {
            $this->assertCheckBoxStageIsEqual('qualify', $params['qualify']);
            if ($params['qualify'] && isset($params['qualifyfreq'])) {
                $this->assertInputFieldValueEqual('qualifyfreq', $params['qualifyfreq']);
            }
        }

        // Outbound proxy
        if (isset($params['outbound_proxy'])) {
            $this->assertInputFieldValueEqual('outbound_proxy', $params['outbound_proxy']);
        }

        // From user settings
        if (isset($params['disablefromuser'])) {
            $this->assertCheckBoxStageIsEqual('disablefromuser', $params['disablefromuser']);
            if (!$params['disablefromuser'] && isset($params['fromuser'])) {
                $this->assertInputFieldValueEqual('fromuser', $params['fromuser']);
            }
        }

        // From domain
        if (isset($params['fromdomain'])) {
            $this->assertInputFieldValueEqual('fromdomain', $params['fromdomain']);
        }

        // DTMF mode
        if (isset($params['dtmfmode'])) {
            $this->assertMenuItemSelected('dtmfmode', $params['dtmfmode']);
        }

        // Manual attributes
        if (isset($params['manualattributes'])) {
            $this->assertTextAreaValueIsEqual('manualattributes', $params['manualattributes']);
        }
    }

    /**
     * Verify DID and CallerID fields
     */
    protected function verifyDidCallerIdFields(array $params): void
    {
        // DID source settings
        if (isset($params['did_source'])) {
            $this->assertMenuItemSelected('did_source', $params['did_source']);

            // Custom DID parser fields
            if ($params['did_source'] === 'custom') {
                $this->verifyCustomParserFields('did', $params);
            }
        }

        // CallerID source settings
        if (isset($params['cid_source'])) {
            $this->assertMenuItemSelected('cid_source', $params['cid_source']);

            // Custom CallerID parser fields
            if ($params['cid_source'] === 'custom') {
                $this->verifyCustomParserFields('cid', $params);
            }
        }

        // Debug checkbox
        if (isset($params['cid_did_debug'])) {
            $this->assertCheckBoxStageIsEqual('cid_did_debug', $params['cid_did_debug']);
        }
    }

    /**
     * Verify custom parser fields for DID or CallerID
     */
    protected function verifyCustomParserFields(string $prefix, array $params): void
    {
        $fields = ['custom_header', 'parser_start', 'parser_end', 'parser_regex'];

        foreach ($fields as $field) {
            $key = "{$prefix}_{$field}";
            if (isset($params[$key])) {
                $this->assertInputFieldValueEqual($key, $params[$key]);
            }
        }
    }

}