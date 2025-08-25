<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Base class for IAX provider creation tests
 */
abstract class CreateIAXProviderTest extends MikoPBXTestsBase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Create IAX provider - " . $this->getIAXProviderData()['description']);
    }

    /**
     * Get IAX provider data
     */
    abstract protected function getIAXProviderData(): array;

    /**
     * Test creating IAX provider
     */
    public function testCreateIAXProvider(): void
    {
        $params = $this->getIAXProviderData();
        self::annotate("Creating IAX provider: {$params['description']}");

        try {
            $this->createIAXProvider($params);
            $this->verifyIAXProvider($params);
            self::annotate("Successfully created IAX provider: {$params['description']}", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create IAX provider: {$params['description']}", 'error');
            throw $e;
        }
    }

    /**
     * Create IAX provider
     */
    protected function createIAXProvider(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickButtonByHref('/admin-cabinet/providers/modifyiax');

        $this->fillBasicFields($params);
        $this->fillAdvancedOptions($params);

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

        $this->changeInputField('description', $params['description']);
        
        // Set registration type if provided
        if (isset($params['registration_type'])) {
            $this->selectDropdownItem('registration_type', $params['registration_type']);
        }
        
        $this->changeInputField('host', $params['host']);
        
        // For inbound registration, username is automatically set to uniqid and is readonly
        if (!isset($params['registration_type']) || $params['registration_type'] !== 'inbound') {
            $this->changeInputField('username', $params['username']);
        }
        
        $this->changeInputField('secret', $params['password']);
    }

    /**
     * Fill advanced options
     */
    protected function fillAdvancedOptions(array $params): void
    {
        $this->openAccordionOnThePage();

        // Set receive_calls_without_auth if provided
        if (isset($params['receive_calls_without_auth'])) {
            $this->changeCheckBoxState('receive_calls_without_auth', $params['receive_calls_without_auth']);
        }
        
        $this->changeTextAreaValue('manualattributes', $params['manualattributes']);
    }

    /**
     * Verify IAX provider creation
     */
    protected function verifyIAXProvider(array $params): void
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
        $this->assertInputFieldValueEqual('description', $params['description']);
        
        // Verify registration type if provided
        if (isset($params['registration_type'])) {
            $this->assertMenuItemSelected('registration_type', $params['registration_type']);
        }
        
        $this->assertInputFieldValueEqual('host', $params['host']);
        
        // For inbound registration, username should equal uniqid
        if (isset($params['registration_type']) && $params['registration_type'] === 'inbound') {
            $this->assertInputFieldValueEqual('username', $params['uniqid']);
        } else {
            $this->assertInputFieldValueEqual('username', $params['username']);
        }
        
        // Password is masked only for outbound providers
        if (isset($params['registration_type']) && $params['registration_type'] === 'outbound') {
            $this->assertPasswordFieldIsMasked('secret');
        } else {
            // For inbound providers, password is not masked
            $this->assertInputFieldValueEqual('secret', $params['password']);
        }
    }

    /**
     * Verify advanced options
     */
    protected function verifyAdvancedOptions(array $params): void
    {
        $this->openAccordionOnThePage();

        // Verify receive_calls_without_auth if provided
        if (isset($params['receive_calls_without_auth'])) {
            $this->assertCheckBoxStageIsEqual('receive_calls_without_auth', $params['receive_calls_without_auth']);
        }
        
        $this->assertTextAreaValueIsEqual('manualattributes', $params['manualattributes']);
    }
}
