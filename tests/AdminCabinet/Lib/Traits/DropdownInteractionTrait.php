<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;
use Facebook\WebDriver\WebDriverExpectedCondition;
use RuntimeException;

/**
 * Trait DropdownInteractionTrait
 * Simplified dropdown interactions for MikoPBX V5.0 architecture
 *
 * All dropdowns in MikoPBX V5.0 follow consistent patterns:
 * - Hidden input stores the actual value
 * - Dropdown UI created by JavaScript (DynamicDropdownBuilder)
 * - Consistent Semantic UI/Fomantic UI behavior
 */
trait DropdownInteractionTrait
{
    /**
     * Wait timeout for dropdown operations (in seconds)
     */
    private const int DROPDOWN_TIMEOUT = 5;

    /**
     * Delay after dropdown interaction (in milliseconds)
     */
    private const int DROPDOWN_INTERACTION_DELAY = 300;

    /**
     * Finds dropdown element by field name
     * V5.0: All dropdowns have ID pattern: {fieldName}-dropdown
     *
     * @param string $fieldName Field name (matches hidden input name)
     * @return WebDriverElement|null Dropdown element or null
     */
    protected function findDropdown(string $fieldName): ?WebDriverElement
    {
        try {
            // V5.0 pattern: dropdown ID is always {fieldName}-dropdown
            $dropdownId = "{$fieldName}-dropdown";

            // Try direct ID first (fastest)
            return self::$driver->findElement(WebDriverBy::id($dropdownId));
        } catch (NoSuchElementException $e) {
            // Fallback: find by class pattern
            try {
                $xpath = "//div[contains(@class, 'dropdown') and contains(@class, '{$fieldName}-select')]";
                return self::$driver->findElement(WebDriverBy::xpath($xpath));
            } catch (NoSuchElementException $e) {
                $this->annotate("Dropdown not found for field: {$fieldName}", 'debug');
                return null;
            }
        }
    }

    /**
     * Gets current value from dropdown
     * V5.0: Value always stored in hidden input
     *
     * @param string $fieldName Field name
     * @return string|null Current value or null
     */
    protected function getDropdownValue(string $fieldName): ?string
    {
        try {
            // V5.0: Value is in hidden input
            $hiddenInput = self::$driver->findElement(WebDriverBy::id($fieldName));
            return $hiddenInput->getAttribute('value');
        } catch (NoSuchElementException $e) {
            $this->annotate("Hidden input not found for field: {$fieldName}", 'debug');
            return null;
        }
    }

    /**
     * Gets current display text from dropdown
     * V5.0: Text shown in .text div inside dropdown
     *
     * @param string $fieldName Field name
     * @return string|null Display text or null
     */
    protected function getDropdownText(string $fieldName): ?string
    {
        $dropdown = $this->findDropdown($fieldName);
        if (!$dropdown) {
            return null;
        }

        try {
            $textElement = $dropdown->findElement(WebDriverBy::cssSelector('.text'));
            return $textElement->getText();
        } catch (NoSuchElementException $e) {
            $this->annotate("Text element not found in dropdown: {$fieldName}", 'debug');
            return null;
        }
    }

    /**
     * Selects value in dropdown using JavaScript API
     * V5.0: Uses Semantic UI dropdown API for reliable selection
     *
     * @param string $fieldName Field name
     * @param string $value Value to select
     * @return bool Success status
     */
    protected function selectDropdownValue(string $fieldName, string $value): bool
    {
        $this->logTestAction("Select dropdown", ['field' => $fieldName, 'value' => $value]);

        try {
            // Use JavaScript for reliable selection (V5.0 best practice)
            $jsCode = <<<JS
            (function() {
                var dropdownId = '{$fieldName}-dropdown';
                var dropdown = document.getElementById(dropdownId);

                if (!dropdown) {
                    // Fallback: find by class
                    dropdown = document.querySelector('.dropdown.{$fieldName}-select');
                }

                if (!dropdown) {
                    return {success: false, error: 'Dropdown not found'};
                }

                // Use Semantic UI API
                if (window.$ && $.fn && $.fn.dropdown) {
                    $(dropdown).dropdown('set selected', '{$value}');

                    // Verify selection
                    var newValue = $(dropdown).dropdown('get value');
                    if (newValue === '{$value}') {
                        return {success: true, message: 'Value selected'};
                    } else {
                        return {success: false, error: 'Value not set correctly'};
                    }
                } else {
                    return {success: false, error: 'Semantic UI not available'};
                }
            })();
JS;

            $result = self::$driver->executeScript($jsCode);

            if (is_array($result) && $result['success']) {
                $this->annotate("Selected '{$value}' in dropdown '{$fieldName}'", 'info');

                // Wait for form to process change
                usleep(self::DROPDOWN_INTERACTION_DELAY * 1000);
                $this->waitForAjax();

                return true;
            } else {
                $error = $result['error'] ?? 'Unknown error';
                $this->annotate("Failed to select dropdown value: {$error}", 'warning');
                return false;
            }
        } catch (\Exception $e) {
            $this->annotate("Error selecting dropdown value: " . $e->getMessage(), 'error');
            return false;
        }
    }

    /**
     * Selects dropdown value with UI interaction (click-based)
     * Fallback method when JavaScript selection doesn't work
     *
     * Supports two selection modes:
     * 1. By data-value attribute (exact match)
     * 2. By text content (substring match) if value not found by data-value
     *
     * @param string $fieldName Field name
     * @param string $value Value to select (data-value or text substring)
     * @param bool $skipIfNotExist Skip if value doesn't exist
     * @return bool Success status
     */
    protected function selectDropdownValueWithUI(string $fieldName, string $value, bool $skipIfNotExist = false): bool
    {
        $this->logTestAction("Select dropdown with UI", ['field' => $fieldName, 'value' => $value]);

        $maxRetries = 3;
        $retryCount = 0;

        while ($retryCount < $maxRetries) {
            try {
                $dropdown = $this->findDropdown($fieldName);
                if (!$dropdown) {
                    if ($skipIfNotExist) {
                        return false;
                    }
                    throw new RuntimeException("Dropdown '{$fieldName}' not found");
                }

                // Check if dropdown is searchable and if already open
                // (may be left open by dropdownHasValue check)
                $classAttribute = $dropdown->getAttribute('class') ?? '';
                $isSearchable = strpos($classAttribute, 'search') !== false;
                $isAlreadyOpen = strpos($classAttribute, 'visible') !== false;

                if (!$isAlreadyOpen) {
                    // Open dropdown
                    $this->scrollIntoView($dropdown);
                    $dropdown->click();

                    // Wait for menu to appear
                    self::$driver->wait(self::DROPDOWN_TIMEOUT)->until(
                        WebDriverExpectedCondition::presenceOfElementLocated(
                            WebDriverBy::cssSelector("#{$fieldName}-dropdown .menu.visible")
                        )
                    );

                    // Wait for AJAX to populate menu items (for API-based dropdowns)
                    // This is crucial for dropdowns that load data dynamically
                    $this->waitForAjax();
                    usleep(300000); // Additional 300ms for DOM rendering after AJAX
                }

                // Use search if available
                if ($isSearchable) {
                    // Re-find dropdown to get fresh reference after opening
                    $dropdown = $this->findDropdown($fieldName);
                    $searchInput = $dropdown->findElement(WebDriverBy::cssSelector('input.search'));
                    $searchInput->clear();
                    $searchInput->sendKeys($value);

                    // Wait for menu to stabilize after filtering
                    // The menu rebuilds on each keystroke, so we need to wait longer
                    $this->waitForAjax();
                    usleep(800000); // 800ms wait for menu to rebuild
                }

                // IMPORTANT: Re-find dropdown to get fresh DOM reference
                // This prevents stale element reference errors
                $dropdown = $this->findDropdown($fieldName);

                // Try to find item by data-value first
                $menuItem = null;
                try {
                    $itemSelector = ".menu.visible .item[data-value='{$value}']";
                    $menuItem = $dropdown->findElement(WebDriverBy::cssSelector($itemSelector));
                    $this->annotate("Found dropdown item by data-value: {$value}", 'debug');
                } catch (NoSuchElementException $e) {
                    // If not found by data-value, try to find by text content
                    $this->annotate("Item not found by data-value, searching by text: {$value}", 'debug');

                    // Get all visible menu items
                    $allItems = $dropdown->findElements(WebDriverBy::cssSelector('.menu.visible .item'));

                    foreach ($allItems as $item) {
                        $itemText = $item->getText();
                        // Check if item text contains the search value (case-insensitive substring match)
                        if (stripos($itemText, $value) !== false) {
                            $menuItem = $item;
                            $itemValue = $item->getAttribute('data-value');
                            $this->annotate("Found dropdown item by text: '{$itemText}' (data-value: {$itemValue})", 'debug');
                            break;
                        }
                    }

                    if ($menuItem === null) {
                        throw new NoSuchElementException("Item not found by data-value or text: {$value}");
                    }
                }

                // Scroll into view and click immediately
                $this->scrollIntoView($menuItem);
                $menuItem->click();

                // Wait for dropdown to close
                usleep(self::DROPDOWN_INTERACTION_DELAY * 1000);
                $this->waitForAjax();

                return true;

            } catch (\Facebook\WebDriver\Exception\StaleElementReferenceException $e) {
                $retryCount++;
                $this->annotate("Stale element reference on attempt {$retryCount}, retrying...", 'warning');

                if ($retryCount >= $maxRetries) {
                    $this->annotate("Failed after {$maxRetries} attempts due to stale elements", 'error');
                    return false;
                }

                // Wait before retry
                usleep(500000);
                continue;

            } catch (NoSuchElementException $e) {
                if ($skipIfNotExist) {
                    $this->annotate("Value '{$value}' not found in dropdown '{$fieldName}'", 'info');
                    return false;
                }
                throw new RuntimeException("Value '{$value}' not found in dropdown '{$fieldName}'");
            } catch (\Exception $e) {
                $this->annotate("Error selecting dropdown with UI: " . $e->getMessage(), 'error');
                return false;
            }
        }

        return false;
    }

    /**
     * Clears dropdown selection
     * V5.0: Uses Semantic UI clear method
     *
     * @param string $fieldName Field name
     * @return bool Success status
     */
    protected function clearDropdown(string $fieldName): bool
    {
        try {
            $jsCode = "
                var dropdown = document.getElementById('{$fieldName}-dropdown');
                if (dropdown && window.$ && $.fn.dropdown) {
                    $(dropdown).dropdown('clear');
                    return true;
                }
                return false;
            ";

            $result = self::$driver->executeScript($jsCode);

            if ($result) {
                $this->annotate("Cleared dropdown '{$fieldName}'", 'info');
                usleep(self::DROPDOWN_INTERACTION_DELAY * 1000);
                return true;
            }

            return false;
        } catch (\Exception $e) {
            $this->annotate("Error clearing dropdown: " . $e->getMessage(), 'warning');
            return false;
        }
    }

    /**
     * Checks if value exists in dropdown options
     * Supports multiple search strategies:
     * 1. By data-value attribute (exact match with number)
     * 2. By exact text content match
     * 3. By partial text content match (substring)
     *
     * For searchable dropdowns (with class 'search'), triggers search and waits for API results
     *
     * IMPORTANT: This method opens the dropdown to check values and closes it before returning.
     *
     * @param string $fieldName Field name
     * @param string $value Value to check (can be data-value, exact text, or partial text)
     * @return bool True if value exists
     */
    protected function dropdownHasValue(string $fieldName, string $value): bool
    {
        // Helper to close dropdown using Semantic UI API
        $closeDropdown = function() use ($fieldName) {
            try {
                $jsCode = "
                    var dropdown = document.getElementById('{$fieldName}-dropdown');
                    if (dropdown && window.$ && $.fn.dropdown) {
                        $(dropdown).dropdown('hide');
                    }
                ";
                self::$driver->executeScript($jsCode);
                usleep(100000); // 100ms for dropdown to close
            } catch (\Exception $e) {
                // Ignore errors during close
            }
        };

        try {
            // Helper function to check if value exists in dropdown menu items
            $checkValueExists = function() use ($fieldName, $value) {
                try {
                    $dropdown = $this->findDropdown($fieldName);
                    if (!$dropdown) {
                        return false;
                    }

                    // Get all menu items
                    $menuItems = $dropdown->findElements(WebDriverBy::cssSelector('.menu .item'));

                    foreach ($menuItems as $item) {
                        // Strategy 1: Check by data-value attribute (exact match)
                        $dataValue = $item->getAttribute('data-value');
                        if ($dataValue === $value) {
                            $this->annotate("Found by data-value: {$value}", 'debug');
                            return true;
                        }

                        // Strategy 2 & 3: Check by text content
                        $itemText = trim($item->getText());

                        // Exact match
                        if ($itemText === $value) {
                            $this->annotate("Found by exact text match: {$itemText}", 'debug');
                            return true;
                        }

                        // Partial match (case-insensitive)
                        if (stripos($itemText, $value) !== false) {
                            $this->annotate("Found by partial text match: {$itemText}", 'debug');
                            return true;
                        }
                    }

                    return false;
                } catch (NoSuchElementException $e) {
                    return false;
                }
            };

            // Get dropdown element
            $dropdown = $this->findDropdown($fieldName);
            if (!$dropdown) {
                return false;
            }

            // Step 1: Always click dropdown to activate it and trigger AJAX data loading
            try {
                $dropdown->click();

                // Wait for dropdown to open and any initial AJAX requests to complete
                usleep(300000); // 300ms delay for menu animation
                $this->waitForAjax();

                // First check: see if value exists in loaded items
                if ($checkValueExists()) {
                    $closeDropdown();
                    return true;
                }

            } catch (\Exception $e) {
                $this->annotate("Error clicking dropdown '{$fieldName}': " . $e->getMessage(), 'debug');
                $closeDropdown();
                return false;
            }

            // Step 2: If dropdown is searchable, try search functionality
            $classAttribute = $dropdown->getAttribute('class') ?? '';
            $isSearchable = strpos($classAttribute, 'search') !== false;

            if ($isSearchable) {
                try {
                    // Re-find dropdown to avoid stale element reference
                    $dropdown = $this->findDropdown($fieldName);
                    $searchInput = $dropdown->findElement(WebDriverBy::cssSelector('input.search'));

                    // Click to focus on input field
                    $searchInput->click();

                    // Clear any existing value
                    $searchInput->clear();

                    // Type the search value (triggers all keyboard events automatically)
                    $searchInput->sendKeys($value);

                    // Wait for AJAX search request to complete and menu to update
                    $this->waitForAjax();

                    // Small additional delay for DOM to update after AJAX
                    usleep(200000); // 200ms for DOM rendering

                    // Second check: after search results loaded
                    if ($checkValueExists()) {
                        $closeDropdown();
                        return true;
                    }

                } catch (NoSuchElementException $e) {
                    $this->annotate("Search input not found in dropdown '{$fieldName}'", 'debug');
                }
            }

            $closeDropdown();
            return false;

        } catch (\Exception $e) {
            $this->annotate("Error checking dropdown value existence: " . $e->getMessage(), 'debug');
            return false;
        }
    }

    /**
     * Gets all available options from dropdown
     *
     * @param string $fieldName Field name
     * @return array Array of ['value' => x, 'text' => y] options
     */
    protected function getDropdownOptions(string $fieldName): array
    {
        try {
            $jsCode = <<<JS
            (function() {
                var dropdown = document.getElementById('{$fieldName}-dropdown');
                if (!dropdown) return [];

                var options = [];
                var items = dropdown.querySelectorAll('.menu .item');

                items.forEach(function(item) {
                    var value = item.getAttribute('data-value');
                    var text = item.textContent.trim();
                    if (value !== null) {
                        options.push({value: value, text: text});
                    }
                });

                return options;
            })();
JS;

            $result = self::$driver->executeScript($jsCode);
            return is_array($result) ? $result : [];

        } catch (\Exception $e) {
            $this->annotate("Error getting dropdown options: " . $e->getMessage(), 'debug');
            return [];
        }
    }

    /**
     * Waits for dropdown to load options (for API-based dropdowns)
     *
     * @param string $fieldName Field name
     * @param int $timeout Timeout in seconds
     * @return bool True if options loaded
     */
    protected function waitForDropdownOptions(string $fieldName, int $timeout = 5): bool
    {
        try {
            self::$driver->wait($timeout)->until(
                function() use ($fieldName) {
                    $options = $this->getDropdownOptions($fieldName);
                    return count($options) > 0;
                }
            );
            return true;
        } catch (TimeoutException $e) {
            $this->annotate("Timeout waiting for dropdown options: {$fieldName}", 'warning');
            return false;
        }
    }

    /**
     * Helper method to select dropdown with automatic fallback
     * Tries JavaScript API first, then UI interaction if needed
     *
     * @param string $fieldName Field name
     * @param string $value Value to select
     * @return bool Success status
     */
    protected function selectDropdownItem(string $fieldName, string $value): bool
    {
        // Check if value is already selected - skip if it is
        $currentValue = $this->getDropdownValue($fieldName);
        if ($currentValue === $value) {
            $this->annotate("Value '{$value}' already selected in dropdown '{$fieldName}', skipping selection", 'info');
            return true;
        }

        // Try JavaScript API first (fastest and most reliable)
        if ($this->selectDropdownValue($fieldName, $value)) {
            return true;
        }

        // Fallback to UI interaction
        $this->annotate("JavaScript selection failed, trying UI interaction", 'info');
        return $this->selectDropdownValueWithUI($fieldName, $value);
    }

    /**
     * Asserts dropdown has expected value
     *
     * @param string $fieldName Field name
     * @param string $expectedValue Expected value
     * @param string $message Optional assertion message
     */
    protected function assertDropdownValue(string $fieldName, string $expectedValue, string $message = ''): void
    {
        $actualValue = $this->getDropdownValue($fieldName);

        $message = $message ?: "Dropdown '{$fieldName}' value mismatch.";
        $this->assertEquals($expectedValue, $actualValue, $message);
    }

    /**
     * Asserts dropdown has expected display text
     *
     * @param string $fieldName Field name
     * @param string $expectedText Expected display text
     * @param string $message Optional assertion message
     */
    protected function assertDropdownText(string $fieldName, string $expectedText, string $message = ''): void
    {
        $actualText = $this->getDropdownText($fieldName);

        $message = $message ?: "Dropdown '{$fieldName}' text mismatch.";
        $this->assertEquals($expectedText, $actualText, $message);
    }

    /**
     * Asserts dropdown display text contains expected string
     * Useful for checking HTML content with icons
     *
     * @param string $fieldName Field name
     * @param string $expectedSubstring Expected substring in display text
     * @param string $message Optional assertion message
     */
    protected function assertDropdownTextContains(string $fieldName, string $expectedSubstring, string $message = ''): void
    {
        $actualText = $this->getDropdownText($fieldName);

        if ($actualText === null) {
            $this->fail($message ?: "Dropdown '{$fieldName}' not found");
        }

        $message = $message ?: "Dropdown '{$fieldName}' text does not contain expected substring.";
        $this->assertStringContainsString($expectedSubstring, $actualText, $message);
    }

    /**
     * Sets both value and display text in dropdown
     * V5.0: Helper for cases when both value and text need to be set
     *
     * @param string $fieldName Field name
     * @param string $value Value to set
     * @param string $text Display text to set
     * @return bool Success status
     */
    protected function setDropdownTextAndValue(string $fieldName, string $value, string $text): bool
    {
        $this->logTestAction("Set dropdown text and value", [
            'field' => $fieldName,
            'value' => $value,
            'text' => $text
        ]);

        try {
            // Use JavaScript to set both value and text
            $jsCode = <<<JS
            (function() {
                var dropdownId = '{$fieldName}-dropdown';
                var dropdown = document.getElementById(dropdownId);
                var hiddenInput = document.getElementById('{$fieldName}');

                if (!dropdown || !hiddenInput) {
                    return {success: false, error: 'Dropdown or hidden input not found'};
                }

                // Update hidden input
                hiddenInput.value = '{$value}';

                // Check if item exists in menu
                var menuItem = dropdown.querySelector('.menu .item[data-value="{$value}"]');

                // Add temporary item if it doesn't exist (for dynamic values like mobile numbers)
                if (!menuItem && '{$value}' !== '') {
                    var menu = dropdown.querySelector('.menu');
                    if (menu) {
                        var tempItem = document.createElement('div');
                        tempItem.className = 'item';
                        tempItem.setAttribute('data-value', '{$value}');
                        tempItem.setAttribute('data-text', '{$text}');
                        tempItem.innerHTML = '{$text}';
                        menu.appendChild(tempItem);
                    }
                }

                // Use Semantic UI API to set value
                if (window.$ && $.fn && $.fn.dropdown) {
                    $(dropdown).dropdown('set selected', '{$value}');

                    // Force text update
                    var textElement = dropdown.querySelector('.text');
                    if (textElement) {
                        textElement.innerHTML = '{$text}';
                    }

                    // Trigger change event
                    $(hiddenInput).trigger('change');

                    return {success: true, message: 'Value and text set successfully'};
                } else {
                    return {success: false, error: 'Semantic UI not available'};
                }
            })();
JS;

            $result = self::$driver->executeScript($jsCode);

            if (is_array($result) && $result['success']) {
                $this->annotate("Set '{$value}' with text '{$text}' in dropdown '{$fieldName}'", 'info');
                usleep(self::DROPDOWN_INTERACTION_DELAY * 1000);
                $this->waitForAjax();
                return true;
            } else {
                $error = $result['error'] ?? 'Unknown error';
                $this->annotate("Failed to set dropdown text and value: {$error}", 'warning');
                return false;
            }
        } catch (\Exception $e) {
            $this->annotate("Error setting dropdown text and value: " . $e->getMessage(), 'error');
            return false;
        }
    }

    /**
     * Check if element exists in dropdown menu options
     * Legacy method for backward compatibility with existing tests
     *
     * @param string $fieldName Field name of the dropdown
     * @param string $value Value to search for in dropdown
     * @return bool True if element exists in dropdown
     */
    protected function checkIfElementExistOnDropdownMenu(string $fieldName, string $value): bool
    {
        return $this->dropdownHasValue($fieldName, $value);
    }

    /**
     * Check if element does NOT exist in dropdown menu options
     * Legacy method for backward compatibility with existing tests
     *
     * @param string $fieldName Field name of the dropdown
     * @param string $value Value to search for in dropdown
     * @return bool True if element does NOT exist in dropdown
     */
    protected function checkIfElementNotExistOnDropdownMenu(string $fieldName, string $value): bool
    {
        return !$this->dropdownHasValue($fieldName, $value);
    }
}