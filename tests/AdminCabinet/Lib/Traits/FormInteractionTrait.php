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
     * @param bool $scrollAfterSubmit Whether to scroll the page after submission (default: true)
     * @throws \Exception
     */
    protected function submitForm(string $formId, bool $scrollAfterSubmit = true): void
    {
        $this->logTestAction("Submit form", ['id' => $formId]);

        try {
            $this->executeWithRetry(function () use ($formId, $scrollAfterSubmit) {
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

                // Scroll the page after submission to show any errors or messages
                if ($scrollAfterSubmit) {
                    $this->scrollPageAfterFormSubmit();
                }
            });
        } catch (\Exception $e) {
            $this->handleActionError('submit form', $formId, $e);
        }
    }

    /**
     * Scroll page after form submission to reveal any errors or messages
     * This is useful for test recordings to show validation errors
     */
    protected function scrollPageAfterFormSubmit(): void
    {
        // Wait 3 seconds after submit button click
        sleep(3);

        // Check if page is not reloading/navigating
        $script = <<<'JS'
            // Check if we're still on the same page with a form
            const formStillExists = $('form').length > 0;
            const isNavigating = document.readyState !== 'complete';

            return {
                hasForm: formStillExists,
                isNavigating: isNavigating
            };
JS;

        $pageState = self::$driver->executeScript($script);

        // Only scroll if we're still on the same form page and not navigating away
        if ($pageState && $pageState['hasForm'] && !$pageState['isNavigating']) {
            // Always perform full page scroll to show all content
            $this->performFullPageScroll();
        }
    }

    /**
     * Perform a full page scroll (top to bottom and back to top)
     * Useful for showing all form content in test recordings
     */
    protected function performFullPageScroll(): void
    {
        // Get page dimensions
        $pageHeight = self::$driver->executeScript("return document.body.scrollHeight;");
        $viewportHeight = self::$driver->executeScript("return window.innerHeight;");

        // Only scroll if page is longer than viewport
        if ($pageHeight > $viewportHeight) {
            // First ensure we're at the top
            self::$driver->executeScript("window.scrollTo({top: 0, behavior: 'smooth'});");
            sleep(1); // 1 second pause at top

            // Smooth scroll to bottom
            self::$driver->executeScript("
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            ");

            // Wait for scroll to complete (approximately 2-3 seconds for smooth scroll)
            sleep(3);

            // Smooth scroll back to top
            self::$driver->executeScript("
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            ");

            // Wait for scroll to complete
            sleep(2);
        }
    }
}
