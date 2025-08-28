<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Base class for IVR menu creation tests
 */
abstract class CreateIVRMenuTest extends MikoPBXTestsBase
{

    /**
     * Set up before each test
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Create IVR menu - " . $this->getIVRMenuData()['name']);
    }

    /**
     * Get IVR menu data
     *
     * @return array
     */
    abstract protected function getIVRMenuData(): array;

    /**
     * Test creating IVR menu
     */
    public function testCreateIVRMenu(): void
    {
        $params = $this->getIVRMenuData();
        self::annotate("Creating IVR menu: {$params['name']}");

        try {
            $this->createIVRMenu($params);
            $this->verifyIVRMenu($params);
            self::annotate("Successfully created IVR menu: {$params['name']}", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create IVR menu: {$params['name']}", 'error');
            throw $e;
        }
    }

    /**
     * Create IVR menu
     */
    protected function createIVRMenu(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/ivr-menu/index/');

        try {
            $this->clickDeleteButtonOnRowWithText($params['name']);
        } catch (\Exception $e) {
            // Log the error as information instead of failing the test
            self::annotate(
                sprintf('IVRMenu "%s" not found for deletion (this is expected if IVRMenu does not exist): %s', $params['name'], $e->getMessage()),
                'info'
            );
        }

        $this->clickButtonByHref('/admin-cabinet/ivr-menu/modify');
        $this->fillIVRMenuForm($params);
        $this->submitForm('ivr-menu-form');
    }

    /**
     * Fill IVR menu form
     */
    protected function fillIVRMenuForm(array $params): void
    {
        // Basic fields
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('name', $params['name']);
        $this->selectDropdownItem('audio_message_id', $params['audio_message_id']);

        // Menu items
        $this->fillMenuItems($params['menuItems']);

        // Advanced options
        $this->fillAdvancedOptions($params);
    }

    /**
     * Fill menu items
     */
    protected function fillMenuItems(array $menuItems): void
    {
        $currentMenuItem = 0;
        foreach ($menuItems as $key => $value) {
            if ($currentMenuItem > 0) {
                $addNewMenuItem = self::$driver->findElement(
                    WebDriverBy::xpath('//button[@id="add-new-ivr-action"]')
                );
                $addNewMenuItem->click();
            }
            $currentMenuItem++;
            $this->changeInputField("digits-{$currentMenuItem}", $key);
            $this->selectDropdownItem("extension-{$currentMenuItem}", $value);
        }
    }

    /**
     * Fill advanced options
     */
    protected function fillAdvancedOptions(array $params): void
    {
        $this->changeInputField('number_of_repeat', $params['number_of_repeat']);
        $this->changeInputField('timeout', $params['timeout']);
        $this->selectDropdownItem('timeout_extension', $params['timeout_extension']);
        $this->changeInputField('extension', $params['extension']);
        $this->changeCheckBoxState(
            'allow_enter_any_internal_extension',
            $params['allow_enter_any_internal_extension']
        );
    }

    /**
     * Verify IVR menu creation
     */
    protected function verifyIVRMenu(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/ivr-menu/index/');
        $this->clickModifyButtonOnRowWithText($params['name']);

        // Verify basic fields
        $this->assertTextAreaValueIsEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertMenuItemSelected('audio_message_id', $params['audio_message_id']);

        // Verify menu items
        $this->verifyMenuItems($params['menuItems']);

        // Verify advanced options
        $this->verifyAdvancedOptions($params);
    }

    /**
     * Verify menu items
     */
    protected function verifyMenuItems(array $menuItems): void
    {
        $currentMenuItem = 0;
        foreach ($menuItems as $key => $value) {
            $currentMenuItem++;
            $this->assertInputFieldValueEqual("digits-{$currentMenuItem}", $key);
            $this->assertMenuItemSelected("extension-{$currentMenuItem}", $value);
        }
    }

    /**
     * Verify advanced options
     */
    protected function verifyAdvancedOptions(array $params): void
    {
        $this->assertInputFieldValueEqual('number_of_repeat', $params['number_of_repeat']);
        $this->assertInputFieldValueEqual('timeout', $params['timeout']);
        $this->assertMenuItemSelected('timeout_extension', $params['timeout_extension']);
        $this->assertCheckBoxStageIsEqual(
            'allow_enter_any_internal_extension',
            $params['allow_enter_any_internal_extension']
        );
        $this->assertInputFieldValueEqual('extension', $params['extension']);
    }
}