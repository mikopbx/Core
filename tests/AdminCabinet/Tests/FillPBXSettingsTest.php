<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Data\PBXSettingsDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\TabNavigationTrait;

/**
 * Class to test PBX settings configuration
 */
class FillPBXSettingsTest extends MikoPBXTestsBase
{
    use TabNavigationTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Fill general settings");
    }

    /**
     * Test PBX settings configuration
     */
    public function testFillPBXSettings(): void
    {
        $settings = PBXSettingsDataFactory::getSettings();
        self::annotate("Configuring PBX settings");

        try {
            $this->navigateToSettings();
            $this->fillSettings($settings);
            $this->verifySettings($settings);
            self::annotate("Successfully configured PBX settings", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to configure PBX settings", 'error');
            throw $e;
        }
    }

    /**
     * Navigate to settings page
     */
    protected function navigateToSettings(): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/general-settings/modify/");
    }

    /**
     * Fill settings with provided values
     */
    protected function fillSettings(array $settings): void
    {
        foreach ($settings as $key => $value) {
            $this->fillSetting($key, $value);
        }
        $this->submitForm('general-settings-form');
    }

    /**
     * Fill single setting
     */
    protected function fillSetting(string $key, $value): void
    {
        if ($tab = $this->findElementTab($key)) {
            $this->navigateToTab($tab);

            if ($key === 'SSHAuthorizedKeys') {
                // Handle SSH keys table interface
                $this->fillSSHKeysTable($value);
            } elseif (is_bool($value)) {
                $this->changeCheckBoxState($key, $value, true);
            } elseif ($this->isDropdown($key)) {
                $this->selectDropdownItem($key, $value);
            } elseif ($this->isTextArea($key)) {
                $this->changeTextAreaValue($key, $value, true);
            } else {
                $this->changeInputField($key, $value, true);
            }
        }
    }

    /**
     * Fill SSH keys using the table interface
     */
    protected function fillSSHKeysTable(string $keysValue): void
    {
        try {
            // Click the "Add SSH Key" button
            $addButtonXpath = "//button[@id='show-add-key-btn']";
            $addButton = self::$driver->findElement(WebDriverBy::xpath($addButtonXpath));
            $this->scrollIntoView($addButton);
            $addButton->click();
            
            // Wait for the textarea to appear
            $textareaXpath = "//textarea[@id='new-ssh-key']";
            self::$driver->wait(10, 500)->until(
                \Facebook\WebDriver\WebDriverExpectedCondition::visibilityOfElementLocated(
                    WebDriverBy::xpath($textareaXpath)
                )
            );
            
            // Enter the SSH keys
            $textarea = self::$driver->findElement(WebDriverBy::xpath($textareaXpath));
            $textarea->clear();
            $textarea->sendKeys($keysValue);
            
            // Click the save button
            $saveButtonXpath = "//button[@id='save-key-btn']";
            $saveButton = self::$driver->findElement(WebDriverBy::xpath($saveButtonXpath));
            $saveButton->click();
            
            // Wait for the key to be added (add button row should be visible again)
            self::$driver->wait(10, 500)->until(
                \Facebook\WebDriver\WebDriverExpectedCondition::visibilityOfElementLocated(
                    WebDriverBy::xpath($addButtonXpath)
                )
            );
        } catch (\Exception $e) {
            self::annotate("Failed to add SSH keys via table interface: " . $e->getMessage(), 'error');
            throw new \RuntimeException("Failed to add SSH keys: " . $e->getMessage());
        }
    }

    /**
     * Verify settings values
     */
    protected function verifySettings(array $settings): void
    {
        $this->navigateToSettings();

        foreach ($settings as $key => $value) {
            $this->verifySetting($key, $value);
        }
    }

    /**
     * Verify single setting
     */
    protected function verifySetting(string $key, $value): void
    {
        if ($tab = $this->findElementTab($key)) {
            $this->navigateToTab($tab);

            if ($key === 'SSHAuthorizedKeys') {
                // Verify SSH keys in the table
                $this->verifySSHKeysTable($value);
            } elseif (is_bool($value)) {
                $this->assertCheckBoxStageIsEqual($key, $value, true);
            } elseif ($this->isDropdown($key)) {
                $this->assertMenuItemSelected($key, $value);
            } elseif ($this->isTextArea($key)) {
                $this->assertTextAreaValueIsEqual($key, $value);
            } else {
                $this->assertInputFieldValueEqual($key, $value, true);
            }
        }
    }

    /**
     * Verify SSH keys in the table
     */
    protected function verifySSHKeysTable(string $expectedKeys): void
    {
        try {
            // Check if the keys are displayed in the table
            $tableXpath = "//table[@id='ssh-keys-list']";
            $table = self::$driver->findElement(WebDriverBy::xpath($tableXpath));
            
            // Get all key cells
            $keyCellsXpath = $tableXpath . "//td[@class='ssh-key-cell']/code";
            $keyCells = self::$driver->findElements(WebDriverBy::xpath($keyCellsXpath));
            
            if (empty($keyCells)) {
                throw new \RuntimeException("No SSH keys found in the table");
            }
            
            // For verification, we'll check that at least one key row exists
            // The actual key value is truncated in the display, so we can't compare directly
            // Instead, we verify that the hidden field contains the expected value
            $hiddenFieldXpath = "//textarea[@id='SSHAuthorizedKeys']";
            $hiddenField = self::$driver->findElement(WebDriverBy::xpath($hiddenFieldXpath));
            $actualValue = $hiddenField->getAttribute('value');
            
            // Normalize the values for comparison
            $expectedNormalized = trim($expectedKeys);
            $actualNormalized = trim($actualValue);
            
            if ($actualNormalized !== $expectedNormalized) {
                self::annotate("SSH keys mismatch - Expected: $expectedNormalized, Actual: $actualNormalized", 'error');
                throw new \RuntimeException("SSH keys do not match expected value");
            }
            
            self::annotate("SSH keys verified successfully", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to verify SSH keys: " . $e->getMessage(), 'error');
            throw new \RuntimeException("Failed to verify SSH keys: " . $e->getMessage());
        }
    }

    /**
     * Check if element is dropdown
     */
    private function isDropdown(string $key): bool
    {
        $xpath = sprintf('//select[@name="%s"]', $key);
        return count(self::$driver->findElements(WebDriverBy::xpath($xpath))) > 0;
    }

    /**
     * Check if element is textarea
     */
    private function isTextArea(string $key): bool
    {
        $xpath = sprintf('//textarea[@name="%s"]', $key);
        return count(self::$driver->findElements(WebDriverBy::xpath($xpath))) > 0;
    }
}
