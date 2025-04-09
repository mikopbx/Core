<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;
use Facebook\WebDriver\WebDriverExpectedCondition;
use RuntimeException;

/**
 * Trait FormInteractionTrait
 * Handles all form-related interactions in Selenium tests
 */
trait FormInteractionTrait
{
    /**
     * Wait timeout for dropdown menu to become visible (in seconds)
     */
    private const int DROPDOWN_MENU_TIMEOUT = 10;

    /**
     * Additional delay after dropdown click before continuing (in milliseconds)
     */
    private const int DROPDOWN_CLICK_DELAY = 500;

    /**
     * Form field types mapping
     */
    private const FIELD_TYPES = [
        'input' => [
            'text' => '@type="text"',
            'number' => '@type="number"',
            'password' => '@type="password"',
            'hidden' => '@type="hidden"',
            'search' => '@type="search"'
        ]
    ];

    /**
     * Fill complete form with data using dynamic field detection
     *
     * @param array $data Key-value pairs of form data
     * @param bool $validateFields Whether to validate field existence
     * @throws RuntimeException If field validation fails
     */
    protected function fillForm(array $data, bool $validateFields = true): void
    {
        $this->logTestAction("Fill form", $data);

        foreach ($data as $field => $value) {
            $fieldType = $this->detectFieldType($field);

            if (!$fieldType && $validateFields) {
                throw new RuntimeException("Unknown field type for: $field");
            }

            $this->fillField($field, $value, $fieldType);
        }

        $this->waitForAjax();
    }

    /**
     * Get form data for specified fields
     *
     * @param array $fields List of field names to get values for
     * @return array Associative array of field values
     */
    protected function getFormData(array $fields): array
    {
        $data = [];
        foreach ($fields as $field) {
            $fieldType = $this->detectFieldType($field);
            if ($fieldType) {
                $data[$field] = $this->getFieldValue($field, $fieldType);
            }
        }
        return $data;
    }

    /**
     * Change input field value
     *
     * @param string $name Field name
     * @param string $value New value
     * @param bool $skipIfNotExist Skip if field doesn't exist
     */
    protected function changeInputField(string $name, string $value, bool $skipIfNotExist = false): void
    {
        $this->logTestAction("Change input field", ['name' => $name, 'value' => $value]);

        try {
            // Создаем условие для типов input
            $typeConditions = [];
            foreach (self::FIELD_TYPES['input'] as $type) {
                $typeConditions[] = $type;
            }

            // Формируем xpath для поиска input поля
            $xpath = sprintf(
                '//input[@name="%s" and (%s)]',
                $name,
                implode(' or ', $typeConditions)
            );

            $input = $this->findElementSafely($xpath);
            if (!$input && !$skipIfNotExist) {
                throw new RuntimeException("Input field $name not found");
            }

            if ($input) {
                $type = $input->getAttribute('type');
                $id = $input->getAttribute('id');

                if ($type === 'hidden' && $id) {
                    self::$driver->executeScript(
                        sprintf(
                            "document.getElementById('%s').value='%s'",
                            $id,
                            addslashes($value)
                        )
                    );
                } else {
                    $this->scrollIntoView($input);
                    $input->click();
                    $input->clear();
                    $input->sendKeys($value);
                }
            }
        } catch (\Exception $e) {
            $this->handleActionError('change input field', $name, $e);
        }
    }

    /**
     * Change textarea value
     *
     * @param string $name Textarea name
     * @param string $value New value
     * @param bool $skipIfNotExist Skip if field doesn't exist
     */
    protected function changeTextAreaValue(string $name, string $value, bool $skipIfNotExist = false): void
    {
        $this->logTestAction("Change textarea", ['name' => $name, 'value' => $value]);

        try {
            $xpath = sprintf('//textarea[@name="%s"]', $name);
            $textArea = $this->findElementSafely($xpath);

            if (!$textArea && !$skipIfNotExist) {
                throw new RuntimeException("Textarea $name not found");
            }

            if ($textArea) {
                $this->scrollIntoView($textArea);
                $textArea->click();
                $textArea->clear();
                $textArea->sendKeys($value);
            }
        } catch (\Exception $e) {
            $this->handleActionError('change textarea value', $name, $e);
        }
    }

    /**
     * Change checkbox state
     *
     * @param string $name Checkbox name
     * @param bool $enabled Desired state
     * @param bool $skipIfNotExist Skip if checkbox doesn't exist
     */
    protected function changeCheckBoxState(string $name, bool $enabled, bool $skipIfNotExist = false): void
    {
        $this->logTestAction("Change checkbox", ['name' => $name, 'enabled' => $enabled]);

        try {
            $xpath = sprintf('//input[@name="%s" and @type="checkbox"]', $name);
            $checkbox = $this->findElementSafely($xpath);

            if (!$checkbox && !$skipIfNotExist) {
                throw new RuntimeException("Checkbox $name not found");
            }

            if ($checkbox && $checkbox->isSelected() !== $enabled) {
                $parentXpath = $xpath . '/parent::div';
                $parentElement = self::$driver->findElement(WebDriverBy::xpath($parentXpath));
                $this->scrollIntoView($parentElement);
                $parentElement->click();
            }
        } catch (\Exception $e) {
            $this->handleActionError('change checkbox state', $name, $e);
        }
    }


    /**
     * Change file input value
     *
     * @param string $name File input name
     * @param string $filePath Path to file
     * @param bool $skipIfNotExist Skip if field doesn't exist
     * @throws \Exception
     */
    protected function changeFileField(string $name, string $filePath, bool $skipIfNotExist = false): void
    {
        $this->logTestAction("Change file field", ['name' => $name, 'file' => $filePath]);

        try {
            $xpath = sprintf('//input[@name="%s" and @type="file"]', $name);
            $fileInput = $this->findElementSafely($xpath);

            if (!$fileInput && !$skipIfNotExist) {
                throw new RuntimeException("File input $name not found");
            }
            $fileInput?->sendKeys($filePath);
        } catch (\Exception $e) {
            $this->handleActionError('change file field', $name, $e);
        }
    }

    /**
     * Submit form
     *
     * @param string $formId Form identifier
     * @throws \Exception
     */
    protected function submitForm(string $formId): void
    {
        $this->logTestAction("Submit form", ['id' => $formId]);

        try {
            $this->executeWithRetry(function () use ($formId) {
                $xpath = sprintf('//form[@id="%s"]//ancestor::div[@id="submitbutton"]', $formId);
                $button = $this->waitForElement($xpath);
                $this->scrollIntoView($button);
                $button->click();
                $this->waitForAjax();

                // Wait for button to be enabled again
                self::$driver->wait(self::WAIT_TIMEOUT, self::NAVIGATION['wait_intervals']['default'])->until(
                    function () use ($xpath) {
                        return self::$driver->findElement(WebDriverBy::xpath($xpath))->isEnabled();
                    }
                );
            });
        } catch (\Exception $e) {
            $this->handleActionError('submit form', $formId, $e);
        }
    }

    /**
     * Assert input field value
     *
     * @param string $name Field name
     * @param string $expectedValue Expected value
     * @param bool $skipIfNotExist Skip if field doesn't exist
     */
    protected function assertInputFieldValue(string $name, string $expectedValue, bool $skipIfNotExist = false): void
    {
        $xpath = sprintf('//input[@name="%s"]', $name);
        $input = $this->findElementSafely($xpath);

        if (!$input && !$skipIfNotExist) {
            $this->fail("Input field $name not found");
        }

        if ($input) {
            $actualValue = $input->getAttribute('value');
            $this->assertEquals(
                $expectedValue,
                $actualValue,
                "Input field $name value mismatch. Expected: $expectedValue, Got: $actualValue"
            );
        }
    }

    /**
     * Assert checkbox state
     *
     * @param string $name Checkbox name
     * @param bool $expectedState Expected state
     * @param bool $skipIfNotExist Skip if checkbox doesn't exist
     */
    protected function assertCheckboxState(string $name, bool $expectedState, bool $skipIfNotExist = false): void
    {
        $xpath = sprintf('//input[@name="%s" and @type="checkbox"]', $name);
        $checkbox = $this->findElementSafely($xpath);

        if (!$checkbox && !$skipIfNotExist) {
            $this->fail("Checkbox $name not found");
        }

        if ($checkbox) {
            $actualState = $checkbox->isSelected();
            $this->assertEquals(
                $expectedState,
                $actualState,
                "Checkbox $name state mismatch. Expected: " . ($expectedState ? 'checked' : 'unchecked')
            );
        }
    }

    /**
     * Private helper methods
     */

    /**
     * Detect field type based on HTML structure
     */
    private function detectFieldType(string $fieldName): ?string
    {
        foreach (self::FIELD_TYPES as $type => $xpath) {
            $xpath = sprintf('//%s', sprintf($xpath, $fieldName, $fieldName));
            if ($this->findElementSafely($xpath)) {
                return $type;
            }
        }
        return null;
    }

    /**
     * Fill field based on its type
     */
    private function fillField(string $field, mixed $value, string $type): void
    {
        try {
            match ($type) {
                'dropdown' => $this->selectDropdownItem($field, (string)$value),
                'checkbox' => $this->changeCheckBoxState($field, (bool)$value),
                'textarea' => $this->changeTextAreaValue($field, (string)$value),
                'file' => $this->changeFileField($field, (string)$value),
                'input', 'hidden' => $this->changeInputField($field, (string)$value),
                default => throw new RuntimeException("Unsupported field type: $type")
            };
        } catch (\Exception $e) {
            $this->handleActionError("fill $type field", $field, $e);
        }
    }

    /**
     * Get field value based on its type
     */
    private function getFieldValue(string $field, string $type): mixed
    {
        return match ($type) {
            'checkbox' => $this->findElementSafely(sprintf('//input[@name="%s"]', $field))?->isSelected(),
            default => $this->findElementSafely(sprintf('//*[@name="%s"]', $field))?->getAttribute('value')
        };
    }

    /**
     * Select an item from dropdown considering its current state
     *
     * @param string $name Dropdown name
     * @param string $value Value to select
     * @param bool $skipIfNotExist Skip if dropdown doesn't exist
     * @throws \RuntimeException When dropdown or item not found
     */
    protected function selectDropdownItem(string $name, string $value, bool $skipIfNotExist = false): void
    {
        $this->logTestAction("Select dropdown", ['name' => $name, 'value' => $value]);

        try {
            // Get dropdown state
            ['element' => $dropdown, 'isSelected' => $isSelected] = $this->findDropdownAndCheckState($name, $skipIfNotExist);

            if ($dropdown) {
                // Check if the desired value is already selected
                if ($isSelected) {
                    try {
                        $currentValue = $dropdown->findElement(
                            WebDriverBy::xpath('.//div[contains(@class, "item") and contains(@class, "active selected")]')
                        )->getAttribute('data-value');

                        // If current value matches desired value, no need to proceed
                        if ($currentValue === $value) {
                            return;
                        }
                    } catch (\Exception $e) {
                        // If we can't get current value, proceed with selection
                    }
                }

                // Click to open dropdown
                $this->scrollIntoView($dropdown);
                $dropdown->click();

                // Wait for dropdown menu to be visible
                $this->waitForDropdownMenu();

                // Select item from visible menu
                $menuXpath = '//div[contains(@class, "menu") and contains(@class, "visible")]' .
                    '//div[contains(@class, "item") and (@data-value="%s" or contains(normalize-space(text()),"%s"))]';

                $menuXpath = sprintf($menuXpath, $value, $value);

                // Wait for menu item to be clickable
                $menuItem = self::$driver->wait(self::DROPDOWN_MENU_TIMEOUT)->until(
                    WebDriverExpectedCondition::elementToBeClickable(
                        WebDriverBy::xpath($menuXpath)
                    )
                );

                $this->scrollIntoView($menuItem);
                $menuItem->click();
                $this->waitForAjax();
            }
        } catch (\Exception $e) {
            $this->handleActionError('select dropdown item', "{$name} with value {$value}", $e);
        }
    }

 /**
     * Check if element exists in dropdown menu with improved Semantic UI support
     *
     * @param string $name Dropdown name
     * @param string $value Value to check
     * @return bool
     */
    protected function checkIfElementExistOnDropdownMenu(string $name, string $value): bool
    {
        $this->logTestAction("Check dropdown element", ['name' => $name, 'value' => $value]);

        try {
              // XPath for both standard select and Semantic UI dropdown
            $xpath = sprintf(
                '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//div[contains(@class, "dropdown")][@id="%1$s"] | ' .
                '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]',
                $name
            );

            $dropdown = $this->findElementSafely($xpath);


            // Click to open dropdown
            $this->scrollIntoView($dropdown);
            $dropdown->click();

            // Wait for dropdown menu to be visible
            $this->waitForDropdownMenu();

            // Look for item by both data-value and text content
            $menuXpath = sprintf(
                '//div[contains(@class, "menu") and contains(@class, "visible")]' .
                '//div[contains(@class, "item") and (@data-value="%s" or contains(normalize-space(text()),"%s"))]',
                $value,
                $value
            );

            $menuItem = $this->findElementSafely($menuXpath);

            // Close dropdown after check
            self::$driver->executeScript("arguments[0].click();", [$dropdown]);

            return $menuItem !== null;

        } catch (\Exception $e) {
            self::annotate("Element check failed: " . $e->getMessage(), 'warning');
            return false;
        }
    }


    /**
     * Find dropdown element and check its current state
     *
     * @param string $name Dropdown name
     * @param bool $skipIfNotExist Skip if dropdown doesn't exist
     * @return array{element: ?\Facebook\WebDriver\WebDriverElement, isSelected: bool} Returns element and selection status
     */
    private function findDropdownAndCheckState(string $name, bool $skipIfNotExist): array
    {
        // XPath for both standard select and Semantic UI dropdown
        $xpath = sprintf(
            '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
            '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
            '//div[contains(@class, "dropdown")][@id="%1$s"] | ' .
            '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]',
            $name
        );

        $dropdown = $this->findElementSafely($xpath);

        if (!$dropdown && !$skipIfNotExist) {
            throw new RuntimeException("Dropdown {$name} not found");
        }

        $isSelected = false;

        if ($dropdown) {
            // Check if element already has selected class
            try {
                $isSelected = $dropdown->findElement(
                        WebDriverBy::xpath('.//div[contains(@class, "item") and contains(@class, "active selected")]')
                    ) !== null;
            } catch (\Exception $e) {
                // Element not found - means nothing is selected
                $isSelected = false;
            }
        }

        return [
            'element' => $dropdown,
            'isSelected' => $isSelected
        ];
    }


    /**
     * Wait for dropdown menu to become visible
     *
     * @throws \Facebook\WebDriver\Exception\TimeoutException|NoSuchElementException
     */
    private function waitForDropdownMenu(): void
    {
        usleep(self::DROPDOWN_CLICK_DELAY * 1000);
        self::$driver->wait(self::DROPDOWN_MENU_TIMEOUT)->until(
            WebDriverExpectedCondition::visibilityOfElementLocated(
                WebDriverBy::xpath('//div[contains(@class, "menu") and contains(@class, "visible")]')
            )
        );
    }

    /**
     * Fill dropdown search field
     */
    private function fillDropdownSearch(string $name, string $value): void
    {
        $xpath = sprintf(
            '//select[@name="%s"]/ancestor::div[contains(@class, "dropdown")]/input[contains(@class,"search")] | ' .
            '//div[@id="%s"]/input[contains(@class,"search")]',
            $name,
            $name
        );

        if ($searchInput = $this->findElementSafely($xpath)) {
            $this->scrollIntoView($searchInput);
            $searchInput->click();
            $searchInput->clear();
            $searchInput->sendKeys($value);
        }
    }

    /**
     * Select value in dropdown
     */
    private function selectDropdownValue(string $value): void
    {
        $xpath = sprintf(
            '//div[contains(@class, "menu") and contains(@class, "visible")]/div[@data-value="%s"]',
            $value
        );
        $menuItem = $this->waitForElement($xpath);
        $menuItem->click();
    }

    /**
     * Set input field value with proper handling of hidden fields
     */
    private function setInputValue(WebDriverElement $input, string $value): void
    {
        $type = $input->getAttribute('type');
        $id = $input->getAttribute('id');

        if ($type === 'hidden' && $id) {
            self::$driver->executeScript(
                sprintf('document.getElementById("%s").value="%s"', $id, addslashes($value))
            );
        } else {
            $this->scrollIntoView($input);
            $input->click();
            $input->clear();
            $input->sendKeys($value);
        }
    }
}
