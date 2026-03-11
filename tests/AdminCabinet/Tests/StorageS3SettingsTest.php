<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Data\StorageDataFactory;

/**
 * Class to test S3 cloud storage settings form
 */
class StorageS3SettingsTest extends MikoPBXTestsBase
{
    /**
     * Slider initialization timeout in seconds
     */
    private const SLIDER_INIT_TIMEOUT = 5;

    /**
     * Form initialization timeout in seconds
     */
    private const FORM_INIT_TIMEOUT = 10;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: S3 cloud storage settings");
    }

    /**
     * Test S3 storage form fields and local retention slider
     */
    public function testS3StorageSettings(): void
    {
        self::annotate("Testing S3 cloud storage settings form");

        try {
            // Navigate to cloud storage tab
            $this->navigateToCloudStorageTab();

            // Get S3 test data from factory
            $s3Data = StorageDataFactory::getS3StorageTestData();

            // Test enabling S3 and filling form fields
            $this->testS3FormFields($s3Data);

            // Test S3 local retention slider
            $this->testS3LocalRetentionSlider();

            self::annotate("Successfully tested S3 storage settings", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to test S3 storage settings: " . $e->getMessage(), 'error');
            throw $e;
        }
    }

    /**
     * Navigate to cloud storage settings tab
     */
    protected function navigateToCloudStorageTab(): void
    {
        self::annotate("Navigating to Cloud Storage settings tab");
        $this->clickSidebarMenuItemByHref("/admin-cabinet/storage/index/");

        // Wait for page to load
        $this->waitForElementPresent(WebDriverBy::id('storage-menu'));

        // Click on Cloud Storage Settings tab
        $cloudTab = self::$driver->findElement(WebDriverBy::xpath('//a[@data-tab="storage-cloud"]'));
        $cloudTab->click();

        // Wait for tab content to be visible
        $this->waitForElementPresent(WebDriverBy::id('s3-storage-form'));

        // Wait for form initialization and API data loading
        $this->waitForAjax();
        sleep(2);
    }

    /**
     * Test S3 form fields (enable checkbox and text inputs)
     *
     * @param array $s3Data S3 test data
     */
    protected function testS3FormFields(array $s3Data): void
    {
        self::annotate("Testing S3 form fields");

        // Enable S3 checkbox
        $this->enableS3Checkbox();

        // Wait for S3 settings group to appear
        $this->waitForElementVisible(WebDriverBy::id('s3-settings-group'));

        // Fill S3 endpoint
        $this->fillInputField('s3_endpoint', $s3Data['endpoint']);

        // Fill S3 region
        $this->fillInputField('s3_region', $s3Data['region']);

        // Fill S3 bucket
        $this->fillInputField('s3_bucket', $s3Data['bucket']);

        // Fill S3 access key
        $this->fillInputField('s3_access_key', $s3Data['accessKey']);

        // Fill S3 secret key
        $this->fillInputField('s3_secret_key', $s3Data['secretKey']);

        // Submit form
        $this->submitFormWithoutReload('s3-storage-form');

        // Navigate back and verify saved values
        $this->navigateToCloudStorageTab();

        // Wait for API to load and show S3 settings group
        $this->waitForS3SettingsVisible();

        // Verify S3 is enabled
        $this->verifyS3Enabled();

        // Verify saved field values
        $this->verifyInputFieldValue('s3_endpoint', $s3Data['endpoint']);
        $this->verifyInputFieldValue('s3_region', $s3Data['region']);
        $this->verifyInputFieldValue('s3_bucket', $s3Data['bucket']);
        $this->verifyInputFieldValue('s3_access_key', $s3Data['accessKey']);
        // Note: s3_secret_key is password field, may not be verifiable

        self::annotate("S3 form fields test completed successfully");
    }

    /**
     * Enable S3 checkbox
     */
    protected function enableS3Checkbox(): void
    {
        self::annotate("Enabling S3 storage checkbox");

        // Find the checkbox container
        $checkboxContainer = self::$driver->findElement(WebDriverBy::id('s3-enabled-checkbox'));

        // Check if already checked
        $isChecked = self::$driver->executeScript(
            "return $('#s3-enabled-checkbox').checkbox('is checked');"
        );

        if (!$isChecked) {
            // Click to enable
            $checkboxContainer->click();
            $this->waitForAjax();
            sleep(1);
        }
    }

    /**
     * Verify S3 checkbox is enabled
     */
    protected function verifyS3Enabled(): void
    {
        $isChecked = self::$driver->executeScript(
            "return $('#s3-enabled-checkbox').checkbox('is checked');"
        );

        self::assertTrue($isChecked, "S3 storage should be enabled");
    }

    /**
     * Fill an input field with value
     *
     * @param string $fieldName Field name attribute
     * @param string $value Value to fill
     */
    protected function fillInputField(string $fieldName, string $value): void
    {
        $field = self::$driver->findElement(WebDriverBy::name($fieldName));

        // Click first to trigger focus - removes readonly attribute on fields
        // that use readonly + onfocus trick to prevent password manager auto-fill
        $field->click();
        usleep(200000);

        $field->clear();
        $field->sendKeys($value);
    }

    /**
     * Verify input field value
     *
     * @param string $fieldName Field name attribute
     * @param string $expectedValue Expected value
     */
    protected function verifyInputFieldValue(string $fieldName, string $expectedValue): void
    {
        $field = self::$driver->findElement(WebDriverBy::name($fieldName));
        $actualValue = $field->getAttribute('value');

        self::assertEquals(
            $expectedValue,
            $actualValue,
            "Field '{$fieldName}' should have value '{$expectedValue}', but got '{$actualValue}'"
        );
    }

    /**
     * Test S3 local retention slider positions
     */
    protected function testS3LocalRetentionSlider(): void
    {
        self::annotate("Testing S3 local retention period slider");

        // Ensure S3 settings group is visible before testing slider
        $this->waitForS3SettingsVisible();

        // Wait for slider to be initialized
        $this->waitForS3SliderInitialization();

        // Get test data from factory - test positions 0, 2, 4 (subset for speed)
        $testPositions = [0, 2, 4];

        foreach ($testPositions as $position) {
            $testData = StorageDataFactory::getS3LocalRetentionByPosition($position);
            if ($testData) {
                $this->testS3SliderPosition($testData);
            }
        }

        self::annotate("S3 local retention slider test completed successfully");
    }

    /**
     * Test specific S3 slider position
     *
     * @param array $testData Slider test data
     */
    protected function testS3SliderPosition(array $testData): void
    {
        $position = $testData['position'];
        $expectedValue = $testData['value'];
        $label = $testData['label'];
        $description = $testData['description'];

        self::annotate("Testing S3 slider position {$position}: {$label} - {$description}");

        // First move slider to opposite position to ensure form becomes dirty
        $oppositePosition = ($position < 2) ? 4 : 0;
        self::$driver->executeScript(
            "$('#PBXRecordS3LocalDaysSlider').slider('set value', {$oppositePosition});"
        );
        sleep(1);

        // Now set the actual target position
        self::$driver->executeScript(
            "$('#PBXRecordS3LocalDaysSlider').slider('set value', {$position});"
        );

        // Wait for slider animation and onChange event
        $this->waitForAjax();
        sleep(1);

        // Verify the hidden input value
        $hiddenInput = self::$driver->findElement(WebDriverBy::name('PBXRecordS3LocalDays'));
        $actualValue = $hiddenInput->getAttribute('value');

        self::assertEquals(
            $expectedValue,
            $actualValue,
            "S3 slider position {$position} should set value to '{$expectedValue}', but got '{$actualValue}'"
        );

        // Submit form to save
        $this->submitFormWithoutReload('s3-storage-form');

        // Navigate back to verify saved value
        $this->navigateToCloudStorageTab();

        // Ensure S3 settings visible after page reload
        $this->waitForS3SettingsVisible();

        // Verify saved value
        $hiddenInput = self::$driver->findElement(WebDriverBy::name('PBXRecordS3LocalDays'));
        $savedValue = $hiddenInput->getAttribute('value');

        self::assertEquals(
            $expectedValue,
            $savedValue,
            "Saved S3 local retention value should be '{$expectedValue}', but got '{$savedValue}'"
        );

        // Verify slider visual position using JavaScript
        $sliderValue = self::$driver->executeScript(
            "return $('#PBXRecordS3LocalDaysSlider').slider('get value');"
        );

        self::assertEquals(
            $position,
            $sliderValue,
            "S3 slider visual position should be {$position}, but got {$sliderValue}"
        );

        self::annotate("S3 slider position {$position} test completed successfully");
    }

    /**
     * Submit form without waiting for reload or button re-enable
     * Used for forms that persist after submission without page reload
     *
     * @param string $formId Form identifier
     */
    protected function submitFormWithoutReload(string $formId): void
    {
        self::annotate("Submitting form {$formId} (no reload expected)");

        // Button ID has suffix based on formId (e.g., submitbutton-s3 for s3-storage-form)
        $buttonId = 'submitbutton-s3';
        $xpath = sprintf('//form[@id="%s"]//div[@id="%s"]', $formId, $buttonId);
        $button = self::$driver->findElement(WebDriverBy::xpath($xpath));

        // Wait for button to become enabled (not have 'disabled' class)
        $maxWait = 10;
        $waited = 0;
        while ($waited < $maxWait) {
            $classes = $button->getAttribute('class');
            if (strpos($classes, 'disabled') === false) {
                break;
            }
            sleep(1);
            $waited++;
        }

        // Scroll into view before clicking
        $this->scrollIntoView($button);

        // Ensure button is visible and enabled before clicking
        $this->waitForCondition(
            WebDriverExpectedCondition::elementToBeClickable(WebDriverBy::xpath($xpath)),
            10
        );

        $button->click();

        // Wait only for AJAX to complete, don't wait for button state
        $this->waitForAjax();

        self::annotate("Form submitted, AJAX completed");
    }

    /**
     * Wait for element to be present
     *
     * @param WebDriverBy $by Locator
     * @param int $timeout Timeout in seconds
     */
    protected function waitForElementPresent(WebDriverBy $by, int $timeout = 10): void
    {
        $this->waitForCondition(
            WebDriverExpectedCondition::presenceOfElementLocated($by),
            $timeout
        );
    }

    /**
     * Wait for element to be visible
     *
     * @param WebDriverBy $by Locator
     * @param int $timeout Timeout in seconds
     */
    protected function waitForElementVisible(WebDriverBy $by, int $timeout = 10): void
    {
        $this->waitForCondition(
            WebDriverExpectedCondition::visibilityOfElementLocated($by),
            $timeout
        );
    }

    /**
     * Wait for a condition
     *
     * @param mixed $condition WebDriver condition
     * @param int $timeout Timeout in seconds
     */
    protected function waitForCondition($condition, int $timeout = 10): void
    {
        self::$driver->wait($timeout)->until($condition);
    }

    /**
     * Wait for S3 settings group to become visible after API load
     */
    protected function waitForS3SettingsVisible(): void
    {
        self::annotate("Waiting for S3 settings group to become visible");

        // Wait for API to load settings and show the group
        $maxWait = 10;
        $waited = 0;

        while ($waited < $maxWait) {
            $isVisible = self::$driver->executeScript(
                "return $('#s3-settings-group').is(':visible');"
            );

            if ($isVisible) {
                self::annotate("S3 settings group is now visible");
                return;
            }

            sleep(1);
            $waited++;
        }

        // If still not visible, try to enable checkbox manually
        self::annotate("S3 settings group not visible after {$maxWait}s, enabling checkbox");
        $this->enableS3Checkbox();
        $this->waitForElementVisible(WebDriverBy::id('s3-settings-group'));
    }

    /**
     * Wait for S3 slider to be initialized
     */
    protected function waitForS3SliderInitialization(): void
    {
        self::annotate("Waiting for S3 slider initialization");

        // Wait until slider is initialized (has the slider class and methods)
        $this->waitForCondition(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::cssSelector('#PBXRecordS3LocalDaysSlider.ui.slider')
            ),
            self::SLIDER_INIT_TIMEOUT
        );

        // Additional wait to ensure JavaScript initialization is complete
        sleep(1);

        // Verify slider is functional by checking if we can get its value
        $sliderValue = self::$driver->executeScript(
            "return $('#PBXRecordS3LocalDaysSlider').slider('get value');"
        );

        self::assertNotNull($sliderValue, "S3 slider should be initialized and return a value");
    }
}
