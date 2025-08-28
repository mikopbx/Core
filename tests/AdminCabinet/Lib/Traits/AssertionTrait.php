<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use RuntimeException;

/**
 * Trait AssertionTrait
 * Contains all assertion methods for testing UI elements
 */
trait AssertionTrait
{
    /**
     * Assert that input field has specific value
     *
     * @param string $name Field name
     * @param string $expectedValue Expected value
     * @param bool $skipIfNotExist Skip assertion if field not found
     */
    protected function assertInputFieldValueEqual(
        string $name,
        string $expectedValue,
        bool $skipIfNotExist = false
    ): void {
        $xpath = sprintf(
            '//input[@name="%s" and (@type="text" or @type="number" or @type="password" or @type="hidden")]',
            $name
        );
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if (empty($inputItems) && !$skipIfNotExist) {
            $this->fail("Input field '{$name}' not found");
        }

        foreach ($inputItems as $inputItem) {
            $currentValue = $inputItem->getAttribute('value');
            $this->assertEquals(
                $expectedValue,
                $currentValue,
                "Input field '{$name}' value mismatch. Expected: {$expectedValue}, Got: {$currentValue}"
            );
        }
    }

    /**
     * Assert that password field is masked (shows XXXXXXXX or similar pattern)
     *
     * @param string $name Field name
     * @param bool $skipIfNotExist Skip assertion if field not found
     */
    protected function assertPasswordFieldIsMasked(
        string $name,
        bool $skipIfNotExist = false
    ): void {
        $xpath = sprintf(
            '//input[@name="%s" and (@type="text" or @type="password")]',
            $name
        );
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if (empty($inputItems) && !$skipIfNotExist) {
            $this->fail("Password field '{$name}' not found");
        }

        foreach ($inputItems as $inputItem) {
            $currentValue = $inputItem->getAttribute('value');
            // Check if the value matches the masked pattern (all X's or asterisks)
            $isMasked = preg_match('/^[X*]+$/', $currentValue) === 1;
            $this->assertTrue(
                $isMasked,
                "Password field '{$name}' should be masked but got: {$currentValue}"
            );
        }
    }

    /**
     * Assert that textarea has specific value
     *
     * @param string $name Textarea name
     * @param string $expectedValue Expected value
     * @param bool $skipIfNotExist Skip assertion if not found
     */
    protected function assertTextAreaValueIsEqual(
        string $name,
        string $expectedValue,
        bool $skipIfNotExist = false
    ): void {
        $xpath = sprintf('//textarea[@name="%s"]', $name);
        $textArea = $this->findElementSafely($xpath);

        if (!$textArea && !$skipIfNotExist) {
            $this->fail("Textarea '{$name}' not found");
        }

        if ($textArea) {
            $currentValue = $textArea->getAttribute('value');
            $this->assertEquals(
                $expectedValue,
                $currentValue,
                "Textarea '{$name}' value mismatch. Expected: {$expectedValue}, Got: {$currentValue}"
            );
        }
    }

    /**
     * Assert that ACE editor has specific value
     *
     * @param string $editorId ACE editor element ID
     * @param string $expectedValue Expected value
     */
    protected function assertAceEditorValueEqual(
        string $editorId,
        string $expectedValue
    ): void {
        // Wait for the editor to be initialized
        self::$driver->wait(5, 100)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::xpath("//div[@id='{$editorId}']//textarea")
            )
        );
        
        // Get the actual value from ACE editor using JavaScript
        $actualValue = self::$driver->executeScript(
            "return ace.edit('{$editorId}').getValue();"
        );
        
        // Normalize both values for comparison
        // Remove potential formatting differences
        $normalizedExpected = $this->normalizeAceEditorValue($expectedValue);
        $normalizedActual = $this->normalizeAceEditorValue($actualValue);
        
        // Compare normalized values
        $this->assertEquals(
            $normalizedExpected,
            $normalizedActual,
            "ACE editor '{$editorId}' value mismatch.\nExpected:\n{$expectedValue}\n\nActual:\n{$actualValue}"
        );
    }
    
    /**
     * Normalize ACE editor value for comparison
     *
     * @param string $value Value to normalize
     * @return string Normalized value
     */
    private function normalizeAceEditorValue(string $value): string
    {
        // Trim whitespace from beginning and end
        $value = trim($value);
        
        // Normalize line endings to \n
        $value = str_replace("\r\n", "\n", $value);
        $value = str_replace("\r", "\n", $value);
        
        // Remove trailing whitespace from each line
        $lines = explode("\n", $value);
        $lines = array_map('rtrim', $lines);
        $value = implode("\n", $lines);
        
        return $value;
    }

    /**
     * Assert that checkbox has specific state
     *
     * @param string $name Checkbox name
     * @param bool $expectedState Expected state
     * @param bool $skipIfNotExist Skip assertion if not found
     */
    protected function assertCheckBoxStageIsEqual(
        string $name,
        bool $expectedState,
        bool $skipIfNotExist = false
    ): void {
        $xpath = sprintf('//input[@name="%s" and @type="checkbox"]', $name);
        $checkbox = $this->findElementSafely($xpath);

        if (!$checkbox && !$skipIfNotExist) {
            $this->fail("Checkbox '{$name}' not found");
        }

        if ($checkbox) {
            $isChecked = $checkbox->isSelected();
            $stateText = $expectedState ? 'checked' : 'unchecked';
            $this->assertEquals(
                $expectedState,
                $isChecked,
                "Checkbox '{$name}' should be {$stateText}"
            );
        }
    }

    /**
     * Assert that menu item is selected
     *
     * @param string $name Menu name
     * @param string $expectedValue Expected selected value
     * @param bool $skipIfNotExist Skip assertion if not found
     */
    protected function assertMenuItemSelected(
        string $name,
        string $expectedValue,
        bool $skipIfNotExist = false
    ): void {
        $this->assertDropdownSelection($name, $expectedValue, true, $skipIfNotExist);
    }

    /**
     * Assert that menu item is not selected
     *
     * @param string $name Menu name
     * @param string $expectedValue Value that should not be selected
     * @param bool $skipIfNotExist Skip assertion if not found
     */
    protected function assertMenuItemNotSelected(
        string $name,
        string $expectedValue = '',
        bool $skipIfNotExist = false
    ): void {
        $this->assertDropdownSelection($name, $expectedValue, false, $skipIfNotExist);
    }

    /**
     * Assert dropdown selection state with improved Semantic UI support
     *
     * @param string $name Dropdown name
     * @param string $expectedValue Value to check
     * @param bool $shouldBeSelected Whether the value should be selected
     * @param bool $skipIfNotExist Skip assertion if dropdown doesn't exist
     */
    protected function assertDropdownSelection(
        string $name,
        string $expectedValue,
        bool $shouldBeSelected = true,
        bool $skipIfNotExist = false
    ): void {
        try {
            // XPath for both standard select and Semantic UI dropdown
            $xpath = sprintf(
                '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//div[contains(@class, "dropdown")][@id="%1$s"] | ' .
                '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]',
                $name
            );

            // Check for hidden input field value first
            $hiddenInputXpath = sprintf('//input[@name="%s" and @type="hidden"]', $name);
            $hiddenInput = $this->findElementSafely($hiddenInputXpath);
            
            if ($hiddenInput) {
                $hiddenValue = $hiddenInput->getAttribute('value');
                
                if ($shouldBeSelected) {
                    $isMatch = $hiddenValue === $expectedValue;
                    $this->assertTrue(
                        $isMatch,
                        "Expected '{$expectedValue}' to be selected in dropdown '{$name}', but hidden input has value '{$hiddenValue}'"
                    );
                    if ($isMatch) {
                        return; // Success, no need to check further
                    }
                } else {
                    $isMatch = $hiddenValue === $expectedValue;
                    $this->assertFalse(
                        $isMatch,
                        "Expected '{$expectedValue}' NOT to be selected in dropdown '{$name}', but hidden input has this value"
                    );
                    if (!$isMatch) {
                        return; // Success, no need to check further
                    }
                }
            }

            // Also check for traditional select element selection
            $optionXpath = sprintf('//select[@name="%s"]/option[@selected="selected"]', $name);
            $selectedOption = $this->findElementSafely($optionXpath);
            
            if ($selectedOption) {
                $currentSelection = $selectedOption->getAttribute('value');
                $currentText = $selectedOption->getText();
                
                if ($shouldBeSelected) {
                    $isMatch = $currentSelection === $expectedValue || $currentText === $expectedValue;
                    $this->assertTrue(
                        $isMatch,
                        "Expected '{$expectedValue}' to be selected in dropdown '{$name}', but found value '{$currentSelection}' with text '{$currentText}'"
                    );
                    return;
                } else {
                    $isMatch = $currentSelection === $expectedValue || $currentText === $expectedValue;
                    $this->assertFalse(
                        $isMatch,
                        "Expected '{$expectedValue}' NOT to be selected in dropdown '{$name}', but it was found"
                    );
                    return;
                }
            }

            // Continue with Semantic UI dropdown check
            $dropdown = $this->findElementSafely($xpath);

            if (!$dropdown && !$skipIfNotExist) {
                $this->fail("Dropdown '{$name}' not found");
                return;
            }

            if (!$dropdown) {
                return;
            }

            // Check current selection
            $selectionXpath = './/div[contains(@class, "item") and contains(@class, "active selected")]';
            $currentSelection = null;
            $currentText = null;
            
            try {
                $selectedItem = $dropdown->findElement(WebDriverBy::xpath($selectionXpath));
                $currentSelection = $selectedItem->getAttribute('data-value');
                $currentText = $selectedItem->getText();
            } catch (\Exception $e) {
                // No selection found
                $currentSelection = null;
                $currentText = null;
            }

            // Also check for div with class "text" which often contains the selected text
            if ($currentSelection === null && $currentText === null) {
                try {
                    $textDiv = $dropdown->findElement(WebDriverBy::xpath('.//div[contains(@class, "text")]'));
                    $currentText = $textDiv->getText();
                    // If text div has content, treat it as a selection
                    if (trim($currentText) !== '') {
                        $currentSelection = $currentText; // Use text as fallback value
                    }
                } catch (\Exception $e) {
                    // No text div found or it's empty
                }
            }

            if ($shouldBeSelected) {
                if ($currentSelection === null && $currentText === null) {
                    // If no selection, try clicking to check if the value is in the dropdown
                    $dropdown->click();
                    $this->waitForElement('//div[contains(@class, "menu") and contains(@class, "visible")]');
                    
                    // Try using search field if available
                    $searchXpath = sprintf(
                        '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")]/input[contains(@class,"search")] | ' .
                        '//div[@id="%1$s" and contains(@class, "dropdown")]/input[contains(@class,"search")]',
                        $name
                    );
                    
                    $searchInput = $this->findElementSafely($searchXpath);
                    if ($searchInput) {
                        $searchInput->click();
                        $searchInput->clear();
                        $searchInput->sendKeys($expectedValue);
                    }
                    
                    // Now check if the item exists
                    $menuItemXpath = sprintf(
                        '//div[contains(@class, "menu") and contains(@class, "visible")]' .
                        '//div[contains(@class, "item") and (contains(text(), "%1$s") or @data-value="%1$s")]',
                        $expectedValue
                    );
                    
                    $menuItem = $this->findElementSafely($menuItemXpath);
                    
                    // Close dropdown regardless of result
                    try {
                        $dropdown->click();
                    } catch (\Exception $e) {
                        // Ignore errors on closing
                    }
                    
                    if (!$menuItem) {
                        $this->fail("Value '{$expectedValue}' not found in dropdown '{$name}'");
                    }
                    
                    // Since we didn't actually select the item but just verified it exists,
                    // we should fail because it should be selected but isn't
                    $this->fail("Expected '{$expectedValue}' to be selected in dropdown '{$name}', but no selection was found");
                } else {
                    $isMatch = $currentSelection === $expectedValue || 
                               $currentText === $expectedValue ||
                               stripos($currentText, $expectedValue) !== false;
                               
                    $this->assertTrue(
                        $isMatch,
                        "Expected '{$expectedValue}' to be selected in dropdown '{$name}', but found value '{$currentSelection}' with text '{$currentText}'"
                    );
                }
            } else {
                if ($expectedValue === '') {
                    $this->assertNull(
                        $currentSelection,
                        "Expected no selection in dropdown '{$name}', but found '{$currentText}'"
                    );
                } else {
                    $isMatch = $currentSelection === $expectedValue || 
                               ($currentText !== null && (
                                   $currentText === $expectedValue ||
                                   stripos($currentText, $expectedValue) !== false
                               ));
                               
                    $this->assertFalse(
                        $isMatch,
                        "Expected '{$expectedValue}' NOT to be selected in dropdown '{$name}', but it was found"
                    );
                }
            }
        } catch (\Exception $e) {
            if (!$skipIfNotExist) {
                $this->fail("Assertion failed for dropdown '{$name}': " . $e->getMessage());
            }
        }
    }

    /**
     * Assert that element not exists
     *
     * @param WebDriverBy $by Element locator
     * @param string $message Custom failure message
     */
    protected function assertElementNotFound(WebDriverBy $by, string $message = ''): void
    {
        $elements = self::$driver->findElements($by);
        if (!empty($elements)) {
            $this->fail($message ?: "Unexpectedly found element: " . $by->getValue());
        }
        $this->assertTrue(true);
    }

}