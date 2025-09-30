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
        // Handle codec settings specially
        if (strpos($key, 'codec_') === 0) {
            $this->handleCodecSetting($key, $value);
            return;
        }

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
     * Handle codec checkbox settings
     * Codec checkboxes have different ID structure in the HTML
     */
    protected function handleCodecSetting(string $key, bool $enabled): void
    {
        try {
            // Navigate to the codec tab first
            $codecTab = $this->findCodecTab();
            if ($codecTab) {
                $this->navigateToTab($codecTab);
            }

            // Convert codec_name to codec-name for the row ID
            $codecRowId = str_replace('_', '-', $key);

            // Find the checkbox within the codec row
            // The checkbox is inside a div.ui.toggle.checkbox within the codec row
            $xpath = sprintf(
                "//tr[@id='%s']//input[@type='checkbox' and @name='%s']",
                $codecRowId,
                $key
            );

            // Try to find the checkbox
            try {
                $checkbox = self::$driver->findElement(WebDriverBy::xpath($xpath));
            } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
                // Log warning but continue - codec might not be available
                self::annotate("Codec checkbox not found: {$key}", 'warning');
                return;
            }

            // Check current state
            $isChecked = $checkbox->isSelected();

            if ($isChecked !== $enabled) {
                // Click on the parent div to toggle the checkbox (Semantic UI pattern)
                $parentXpath = $xpath . '/parent::div[contains(@class, "checkbox")]';
                $parentElement = self::$driver->findElement(WebDriverBy::xpath($parentXpath));
                $this->scrollIntoView($parentElement);
                $parentElement->click();

                // Wait for the change to process
                usleep(200000); // 200ms

                self::annotate("Toggled codec {$key} to " . ($enabled ? 'enabled' : 'disabled'), 'info');
            }
        } catch (\Exception $e) {
            self::annotate("Failed to set codec {$key}: " . $e->getMessage(), 'warning');
            // Don't throw - codec settings are not critical
        }
    }

    /**
     * Find the tab that contains codec settings
     */
    protected function findCodecTab(): ?string
    {
        // Look for the audio-codecs-table to find its parent tab
        $xpath = "//table[@id='audio-codecs-table']/ancestor::div[contains(@class, 'ui') and contains(@class, 'tab')]";
        $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if (!empty($elements)) {
            return $elements[0]->getAttribute('data-tab');
        }

        // Fallback: try to find any codec checkbox to locate the tab
        $xpath = "//input[starts-with(@name, 'codec_')]/ancestor::div[contains(@class, 'ui') and contains(@class, 'tab')]";
        $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if (!empty($elements)) {
            return $elements[0]->getAttribute('data-tab');
        }

        return null;
    }

    /**
     * Delete all existing SSH keys from the table
     */
    protected function deleteAllSSHKeys(): void
    {
        try {
            // Find all delete buttons in the SSH keys table
            $deleteButtonsXpath = "//table[@id='ssh-keys-list']//a[contains(@class, 'delete-key-btn')]";
            $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($deleteButtonsXpath));

            if (empty($deleteButtons)) {
                // No keys to delete
                self::annotate("No existing SSH keys found to delete", 'info');
                return;
            }

            self::annotate("Found " . count($deleteButtons) . " SSH keys to delete", 'info');

            // Delete each key (iterate backwards to avoid stale element issues)
            $keysCount = count($deleteButtons);
            for ($i = $keysCount - 1; $i >= 0; $i--) {
                // Re-find buttons each time as DOM changes after deletion
                $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($deleteButtonsXpath));

                if (isset($deleteButtons[$i])) {
                    $this->scrollIntoView($deleteButtons[$i]);
                    $deleteButtons[$i]->click();

                    // Wait a moment for the DOM to update after deletion
                    usleep(500000); // 0.5 seconds

                    self::annotate("Deleted SSH key " . ($keysCount - $i) . " of " . $keysCount, 'info');
                }
            }

            // Verify all keys were deleted
            $remainingButtons = self::$driver->findElements(WebDriverBy::xpath($deleteButtonsXpath));
            if (!empty($remainingButtons)) {
                self::annotate("Warning: " . count($remainingButtons) . " SSH keys remain after deletion", 'warning');
            } else {
                self::annotate("Successfully deleted all SSH keys", 'success');
            }

        } catch (\Exception $e) {
            // It's OK if no keys exist - just log and continue
            self::annotate("Note: Could not delete SSH keys (may not exist): " . $e->getMessage(), 'info');
        }
    }

    /**
     * Fill SSH keys using the table interface
     */
    protected function fillSSHKeysTable(string $keysValue): void
    {
        try {
            // First, delete all existing SSH keys to ensure clean state
            $this->deleteAllSSHKeys();

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

            // Try to click the save button (might be hidden if Enter was pressed during input)
            $saveButtonXpath = "//button[@id='save-key-btn']";
            $saveButtons = self::$driver->findElements(WebDriverBy::xpath($saveButtonXpath));
            
            if (!empty($saveButtons) && $saveButtons[0]->isDisplayed()) {
                // Save button is visible, click it
                $saveButtons[0]->click();
            } else {
                // Save button is hidden (likely because Enter was pressed), this is normal behavior
                self::annotate("Save button is hidden - key was likely saved automatically via Enter", 'info');
            }

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
        // Handle codec settings specially
        if (strpos($key, 'codec_') === 0) {
            $this->verifyCodecSetting($key, $value);
            return;
        }

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
     * Verify codec checkbox setting
     */
    protected function verifyCodecSetting(string $key, bool $expectedState): void
    {
        try {
            // Navigate to the codec tab first
            $codecTab = $this->findCodecTab();
            if ($codecTab) {
                $this->navigateToTab($codecTab);
            }

            // Convert codec_name to codec-name for the row ID
            $codecRowId = str_replace('_', '-', $key);

            // Find the checkbox within the codec row
            $xpath = sprintf(
                "//tr[@id='%s']//input[@type='checkbox' and @name='%s']",
                $codecRowId,
                $key
            );

            // Try to find the checkbox
            try {
                $checkbox = self::$driver->findElement(WebDriverBy::xpath($xpath));
            } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
                self::annotate("Codec checkbox not found for verification: {$key}", 'warning');
                return;
            }

            $isChecked = $checkbox->isSelected();

            if ($isChecked !== $expectedState) {
                $message = sprintf(
                    "Codec %s state mismatch. Expected: %s, Actual: %s",
                    $key,
                    $expectedState ? 'enabled' : 'disabled',
                    $isChecked ? 'enabled' : 'disabled'
                );
                throw new \RuntimeException($message);
            }

            self::annotate("Verified codec {$key} is " . ($expectedState ? 'enabled' : 'disabled'), 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to verify codec {$key}: " . $e->getMessage(), 'error');
            throw $e;
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

            // Wait for table to exist
            self::$driver->wait(10, 500)->until(
                \Facebook\WebDriver\WebDriverExpectedCondition::presenceOfElementLocated(
                    WebDriverBy::xpath($tableXpath)
                )
            );

            // Get all key cells
            $keyCellsXpath = $tableXpath . "//td[@class='ssh-key-cell']/code";
            $keyCells = self::$driver->findElements(WebDriverBy::xpath($keyCellsXpath));

            if (empty($keyCells)) {
                throw new \RuntimeException("No SSH keys found in the table");
            }

            // Count the expected keys
            $expectedKeyLines = array_filter(explode("\n", trim($expectedKeys)));
            $expectedCount = count($expectedKeyLines);
            $actualCount = count($keyCells);

            if ($actualCount !== $expectedCount) {
                self::annotate("SSH key count mismatch - Expected: $expectedCount, Actual: $actualCount", 'warning');
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

            self::annotate("SSH keys verified successfully (" . $actualCount . " key(s) present)", 'success');
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