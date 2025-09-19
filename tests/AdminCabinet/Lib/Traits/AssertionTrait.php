<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;

/**
 * Trait AssertionTrait
 * Simplified assertions for MikoPBX V5.0 architecture
 *
 * Focuses on clean, simple assertions that match the actual UI patterns
 */
trait AssertionTrait
{
    /**
     * Assert input field value
     *
     * @param string $fieldName Field name or ID
     * @param string $expectedValue Expected value
     * @param string $message Optional failure message
     */
    protected function assertInputFieldValueEqual(
        string $fieldName,
        string $expectedValue,
        string $message = ''
    ): void {
        $actualValue = $this->getInputFieldValue($fieldName);

        if ($actualValue === null) {
            $this->fail($message ?: "Input field '{$fieldName}' not found");
        }

        $this->assertEquals(
            $expectedValue,
            $actualValue,
            $message ?: "Input field '{$fieldName}' value mismatch"
        );
    }

    /**
     * Assert textarea value
     *
     * @param string $fieldName Textarea name or ID
     * @param string $expectedValue Expected value
     * @param string $message Optional failure message
     */
    protected function assertTextAreaValueEqual(
        string $fieldName,
        string $expectedValue,
        string $message = ''
    ): void {
        $actualValue = $this->getTextAreaValue($fieldName);

        if ($actualValue === null) {
            $this->fail($message ?: "Textarea '{$fieldName}' not found");
        }

        $this->assertEquals(
            $expectedValue,
            $actualValue,
            $message ?: "Textarea '{$fieldName}' value mismatch"
        );
    }

    /**
     * Assert checkbox state
     *
     * @param string $fieldName Checkbox name or ID
     * @param bool $expectedState Expected checked state
     * @param string $message Optional failure message
     */
    protected function assertCheckboxState(
        string $fieldName,
        bool $expectedState,
        string $message = ''
    ): void {
        $isChecked = $this->isCheckboxChecked($fieldName);

        if ($isChecked === null) {
            $this->fail($message ?: "Checkbox '{$fieldName}' not found");
        }

        $this->assertEquals(
            $expectedState,
            $isChecked,
            $message ?: "Checkbox '{$fieldName}' state mismatch"
        );
    }

    /**
     * Assert dropdown value (V5.0 architecture)
     * Uses the simplified dropdown methods from DropdownInteractionTrait
     *
     * @param string $fieldName Field name
     * @param string $expectedValue Expected value
     * @param string $message Optional failure message
     */
    protected function assertDropdownValue(
        string $fieldName,
        string $expectedValue,
        string $message = ''
    ): void {
        // This method is already in DropdownInteractionTrait
        // Just call it directly for consistency
        parent::assertDropdownValue($fieldName, $expectedValue, $message);
    }

    /**
     * Assert dropdown text (V5.0 architecture)
     *
     * @param string $fieldName Field name
     * @param string $expectedText Expected display text
     * @param string $message Optional failure message
     */
    protected function assertDropdownText(
        string $fieldName,
        string $expectedText,
        string $message = ''
    ): void {
        // This method is already in DropdownInteractionTrait
        parent::assertDropdownText($fieldName, $expectedText, $message);
    }

    /**
     * Assert ACE editor value
     *
     * @param string $editorId ACE editor element ID
     * @param string $expectedValue Expected value
     * @param string $message Optional failure message
     */
    protected function assertAceEditorValue(
        string $editorId,
        string $expectedValue,
        string $message = ''
    ): void {
        try {
            // Get value from ACE editor using JavaScript
            $actualValue = self::$driver->executeScript(
                "return ace.edit('{$editorId}').getValue();"
            );

            // Normalize for comparison
            $normalizedExpected = $this->normalizeEditorValue($expectedValue);
            $normalizedActual = $this->normalizeEditorValue($actualValue);

            $this->assertEquals(
                $normalizedExpected,
                $normalizedActual,
                $message ?: "ACE editor '{$editorId}' value mismatch"
            );
        } catch (\Exception $e) {
            $this->fail($message ?: "Failed to get ACE editor value: " . $e->getMessage());
        }
    }

    /**
     * Assert element exists
     *
     * @param string $selector CSS selector or element ID
     * @param string $message Optional failure message
     */
    protected function assertElementExists(string $selector, string $message = ''): void
    {
        $element = $this->findElementBySelector($selector);

        if (!$element) {
            $this->fail($message ?: "Element '{$selector}' not found");
        }

        $this->assertNotNull($element);
    }

    /**
     * Assert element not exists
     *
     * @param string $selector CSS selector or element ID
     * @param string $message Optional failure message
     */
    protected function assertElementNotExists(string $selector, string $message = ''): void
    {
        $element = $this->findElementBySelector($selector);

        if ($element) {
            $this->fail($message ?: "Element '{$selector}' should not exist but was found");
        }

        $this->assertNull($element);
    }

    /**
     * Assert element is visible
     *
     * @param string $selector CSS selector or element ID
     * @param string $message Optional failure message
     */
    protected function assertElementVisible(string $selector, string $message = ''): void
    {
        $element = $this->findElementBySelector($selector);

        if (!$element) {
            $this->fail($message ?: "Element '{$selector}' not found");
        }

        $this->assertTrue(
            $element->isDisplayed(),
            $message ?: "Element '{$selector}' is not visible"
        );
    }

    /**
     * Assert element is not visible
     *
     * @param string $selector CSS selector or element ID
     * @param string $message Optional failure message
     */
    protected function assertElementNotVisible(string $selector, string $message = ''): void
    {
        $element = $this->findElementBySelector($selector);

        if (!$element) {
            // Element doesn't exist, so it's not visible - test passes
            $this->assertTrue(true);
            return;
        }

        $this->assertFalse(
            $element->isDisplayed(),
            $message ?: "Element '{$selector}' should not be visible"
        );
    }

    /**
     * Assert element has text
     *
     * @param string $selector CSS selector or element ID
     * @param string $expectedText Expected text
     * @param string $message Optional failure message
     */
    protected function assertElementText(
        string $selector,
        string $expectedText,
        string $message = ''
    ): void {
        $element = $this->findElementBySelector($selector);

        if (!$element) {
            $this->fail($message ?: "Element '{$selector}' not found");
        }

        $actualText = $element->getText();

        $this->assertEquals(
            $expectedText,
            $actualText,
            $message ?: "Element '{$selector}' text mismatch"
        );
    }

    /**
     * Assert element contains text
     *
     * @param string $selector CSS selector or element ID
     * @param string $expectedText Text that should be contained
     * @param string $message Optional failure message
     */
    protected function assertElementContainsText(
        string $selector,
        string $expectedText,
        string $message = ''
    ): void {
        $element = $this->findElementBySelector($selector);

        if (!$element) {
            $this->fail($message ?: "Element '{$selector}' not found");
        }

        $actualText = $element->getText();

        $this->assertStringContainsString(
            $expectedText,
            $actualText,
            $message ?: "Element '{$selector}' does not contain expected text"
        );
    }

    /**
     * Assert page title
     *
     * @param string $expectedTitle Expected page title
     * @param string $message Optional failure message
     */
    protected function assertPageTitle(string $expectedTitle, string $message = ''): void
    {
        $actualTitle = self::$driver->getTitle();

        $this->assertEquals(
            $expectedTitle,
            $actualTitle,
            $message ?: "Page title mismatch"
        );
    }

    /**
     * Assert current URL
     *
     * @param string $expectedUrl Expected URL or URL pattern
     * @param string $message Optional failure message
     */
    protected function assertCurrentUrl(string $expectedUrl, string $message = ''): void
    {
        $actualUrl = self::$driver->getCurrentURL();

        $this->assertEquals(
            $expectedUrl,
            $actualUrl,
            $message ?: "Current URL mismatch"
        );
    }

    /**
     * Assert current URL contains
     *
     * @param string $expectedPart Expected URL part
     * @param string $message Optional failure message
     */
    protected function assertUrlContains(string $expectedPart, string $message = ''): void
    {
        $actualUrl = self::$driver->getCurrentURL();

        $this->assertStringContainsString(
            $expectedPart,
            $actualUrl,
            $message ?: "Current URL does not contain expected part"
        );
    }

    // ========== Helper Methods ==========

    /**
     * Get input field value
     *
     * @param string $fieldName Field name or ID
     * @return string|null Value or null if not found
     */
    private function getInputFieldValue(string $fieldName): ?string
    {
        try {
            // Try by ID first
            $element = self::$driver->findElement(WebDriverBy::id($fieldName));
            return $element->getAttribute('value');
        } catch (NoSuchElementException $e) {
            // Try by name
            try {
                $element = self::$driver->findElement(WebDriverBy::name($fieldName));
                return $element->getAttribute('value');
            } catch (NoSuchElementException $e) {
                return null;
            }
        }
    }

    /**
     * Get textarea value
     *
     * @param string $fieldName Textarea name or ID
     * @return string|null Value or null if not found
     */
    private function getTextAreaValue(string $fieldName): ?string
    {
        try {
            // Try by ID first
            $element = self::$driver->findElement(WebDriverBy::id($fieldName));
            if ($element->getTagName() === 'textarea') {
                return $element->getAttribute('value');
            }
        } catch (NoSuchElementException $e) {
            // Continue to try by name
        }

        try {
            // Try by name
            $element = self::$driver->findElement(WebDriverBy::name($fieldName));
            if ($element->getTagName() === 'textarea') {
                return $element->getAttribute('value');
            }
        } catch (NoSuchElementException $e) {
            return null;
        }

        return null;
    }

    /**
     * Check if checkbox is checked
     *
     * @param string $fieldName Checkbox name or ID
     * @return bool|null True if checked, false if unchecked, null if not found
     */
    private function isCheckboxChecked(string $fieldName): ?bool
    {
        try {
            // Try by ID first
            $element = self::$driver->findElement(WebDriverBy::id($fieldName));
            if ($element->getAttribute('type') === 'checkbox') {
                return $element->isSelected();
            }
        } catch (NoSuchElementException $e) {
            // Continue to try by name
        }

        try {
            // Try by name
            $element = self::$driver->findElement(WebDriverBy::name($fieldName));
            if ($element->getAttribute('type') === 'checkbox') {
                return $element->isSelected();
            }
        } catch (NoSuchElementException $e) {
            return null;
        }

        return null;
    }

    /**
     * Find element by flexible selector
     *
     * @param string $selector CSS selector, ID (with #), or class (with .)
     * @return WebDriverElement|null Element or null if not found
     */
    private function findElementBySelector(string $selector): ?WebDriverElement
    {
        try {
            // If selector starts with #, treat as ID
            if (strpos($selector, '#') === 0) {
                $id = substr($selector, 1);
                return self::$driver->findElement(WebDriverBy::id($id));
            }

            // Otherwise use as CSS selector
            return self::$driver->findElement(WebDriverBy::cssSelector($selector));
        } catch (NoSuchElementException $e) {
            return null;
        }
    }

    /**
     * Normalize editor value for comparison
     *
     * @param string $value Value to normalize
     * @return string Normalized value
     */
    private function normalizeEditorValue(string $value): string
    {
        // Trim whitespace
        $value = trim($value);

        // Normalize line endings
        $value = str_replace("\r\n", "\n", $value);
        $value = str_replace("\r", "\n", $value);

        // Remove trailing whitespace from lines
        $lines = explode("\n", $value);
        $lines = array_map('rtrim', $lines);

        return implode("\n", $lines);
    }
}