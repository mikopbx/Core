<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\WebDriverBy;
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
     * Private helper methods
     */

    /**
     * Select an item from dropdown considering its current state
     *
     * @param string $name Dropdown name
     * @param string $value Value to select
     * @param bool $skipIfNotExist Skip if dropdown doesn't exist
     * @return string|null Selected item's data-value or null if selection failed
     * @throws \RuntimeException When dropdown or item not found
     */
    protected function selectDropdownItem(string $name, string $value, bool $skipIfNotExist = false): ?string
    {
        $this->logTestAction("Select dropdown", ['name' => $name, 'value' => $value]);

        try {
            // Get semantic UI dropdown element
            $dropdownXpath = sprintf(
                '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//div[contains(@class, "dropdown")][@id="%1$s"] | ' .
                '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]',
                $name
            );

            $dropdown = $this->findElementSafely($dropdownXpath);

            if (!$dropdown && !$skipIfNotExist) {
                throw new RuntimeException("Dropdown '{$name}' not found");
            }

            if (!$dropdown) {
                return null;
            }

            // Check if the desired value is already selected
            try {
                $selectedItem = $dropdown->findElement(
                    WebDriverBy::xpath('.//div[contains(@class, "item") and contains(@class, "active selected")]')
                );
                
                $currentValue = $selectedItem->getAttribute('data-value');
                $currentText = $selectedItem->getText();

                // If current value or text matches desired value, no need to proceed
                if ($currentValue === $value || $currentText === $value || stripos($currentText, $value) !== false) {
                    return $currentValue ?: $selectedItem->getAttribute('data-text') ?: $currentText;
                }
            } catch (\Exception $e) {
                // No selection found or error getting current selection - proceed with new selection
            }

            // Click to open dropdown
            $this->scrollIntoView($dropdown);
            $dropdown->click();

            // Wait for dropdown menu to be visible
            $this->waitForDropdownMenu();
            
            // Try to use search input if available
            $this->fillDropdownSearch($name, $value);
            
            // First try to find exact match by data-value or text()
            $exactMenuXpath = sprintf(
                '//div[contains(@class, "menu") and contains(@class, "visible")]' .
                '//div[contains(@class, "item") and (@data-value="%1$s" or normalize-space(text())="%1$s")]',
                $value
            );
            
            $menuItem = $this->findElementSafely($exactMenuXpath);
            
            // If exact match not found, try partial text match
            if (!$menuItem) {
                $partialMenuXpath = sprintf(
                    '//div[contains(@class, "menu") and contains(@class, "visible")]' .
                    '//div[contains(@class, "item") and contains(normalize-space(text()),"%s")]',
                    $value
                );
                
                $menuItem = $this->findElementSafely($partialMenuXpath);
            }
            
            if (!$menuItem && !$skipIfNotExist) {
                // Close dropdown before throwing exception
                try {
                    $dropdown->click();
                } catch (\Exception $e) {
                    // Ignore errors on closing
                }
                throw new RuntimeException("Menu item '{$value}' not found in dropdown '{$name}'");
            }
            
            if ($menuItem) {
                $dataValue = $menuItem->getAttribute('data-value');
                
                // Scroll and click the found menu item
                $this->scrollIntoView($menuItem);
                $menuItem->click();
                $this->waitForAjax();
                
                return $dataValue ?: $menuItem->getAttribute('data-text') ?: $menuItem->getText();
            }
            
            return null;
        } catch (\Exception $e) {
            $this->handleActionError('select dropdown item', "{$name} with value {$value}", $e);
            return null;
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
            // Find Semantic UI dropdown
            $xpath = sprintf(
                '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//div[contains(@class, "dropdown")][@id="%1$s"] | ' .
                '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]',
                $name
            );

            $dropdown = $this->findElementSafely($xpath);
            
            if (!$dropdown) {
                return false;
            }
            
            // First check if it's already selected
            try {
                $selectedItem = $dropdown->findElement(
                    WebDriverBy::xpath('.//div[contains(@class, "item") and contains(@class, "active selected")]')
                );
                
                $currentValue = $selectedItem->getAttribute('data-value');
                $currentText = $selectedItem->getText();
                
                // If already selected, return true
                if ($currentValue === $value || $currentText === $value || stripos($currentText, $value) !== false) {
                    return true;
                }
            } catch (\Exception $e) {
                // Not selected, continue checking
            }

            // Click to open dropdown
            $this->scrollIntoView($dropdown);
            $dropdown->click();

            // Wait for dropdown menu to be visible
            $this->waitForDropdownMenu();
            
            // Try to use search input if available
            $this->fillDropdownSearch($name, $value);
            
            // Look for item by both data-value and text content
            $exactMenuXpath = sprintf(
                '//div[contains(@class, "menu") and contains(@class, "visible")]' .
                '//div[contains(@class, "item") and (@data-value="%1$s" or normalize-space(text())="%1$s")]',
                $value
            );
            
            $menuItem = $this->findElementSafely($exactMenuXpath);
            
            // If exact match not found, try partial text match
            if (!$menuItem) {
                $partialMenuXpath = sprintf(
                    '//div[contains(@class, "menu") and contains(@class, "visible")]' .
                    '//div[contains(@class, "item") and contains(normalize-space(text()),"%s")]',
                    $value
                );
                
                $menuItem = $this->findElementSafely($partialMenuXpath);
            }

            // Close dropdown after check regardless of result
            try {
                $dropdown->click();
            } catch (\Exception $e) {
                // Ignore errors on closing
                self::annotate("Failed to close dropdown: " . $e->getMessage(), 'warning');
            }

            return $menuItem !== null;
        } catch (\Exception $e) {
            self::annotate("Element check failed: " . $e->getMessage(), 'warning');
            return false;
        }
    }

    /**
     * Fill dropdown search field
     *
     * @param string $name Dropdown name
     * @param string $value Search value
     */
    private function fillDropdownSearch(string $name, string $value): void
    {
        $xpath = sprintf(
            '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")]/input[contains(@class,"search")] | ' .
            '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")]/input[contains(@class,"search")] | ' .
            '//div[@id="%1$s"]/input[contains(@class,"search")] | ' .
            '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]/input[contains(@class,"search")]',
            $name
        );

        if ($searchInput = $this->findElementSafely($xpath)) {
            try {
                $this->scrollIntoView($searchInput);
                $searchInput->click();
                $searchInput->clear();
                $searchInput->sendKeys($value);
                
                // Small delay to allow filtering to occur
                usleep(300000); // 300ms
            } catch (\Exception $e) {
                // Ignore search errors and continue
            }
        }
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

}
