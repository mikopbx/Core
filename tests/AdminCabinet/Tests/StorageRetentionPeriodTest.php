<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Data\StorageDataFactory;

/**
 * Class to test Storage retention period settings
 */
class StorageRetentionPeriodTest extends MikoPBXTestsBase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Storage retention period slider");
    }

    /**
     * Test changing storage retention period using slider
     */
    public function testChangeStorageRetentionPeriod(): void
    {
        self::annotate("Testing storage retention period slider");

        try {
            $this->navigateToStoragePage();
            
            // Get test data from factory
            $testData = StorageDataFactory::getRetentionPeriodTestData();
            
            // Test each slider position
            foreach ($testData as $data) {
                $this->testSliderPosition($data);
            }
            
            self::annotate("Successfully tested all retention period values", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to test storage retention period", 'error');
            throw $e;
        }
    }

    /**
     * Navigate to storage settings page
     */
    protected function navigateToStoragePage(): void
    {
        self::annotate("Navigating to Storage settings page");
        $this->clickSidebarMenuItemByHref("/admin-cabinet/storage/index/");
        
        // Wait for page to load
        $this->waitForElementPresent(WebDriverBy::id('storage-menu'));
        
        // Click on Storage Settings tab
        $settingsTab = self::$driver->findElement(WebDriverBy::xpath('//a[@data-tab="storage-settings"]'));
        $settingsTab->click();
        
        // Wait for tab content to be visible
        $this->waitForElementPresent(WebDriverBy::id('PBXRecordSavePeriodSlider'));
    }

    /**
     * Test specific slider position
     */
    protected function testSliderPosition(array $testData): void
    {
        $position = $testData['position'];
        $expectedValue = $testData['value'];
        $label = $testData['label'];
        $description = $testData['description'];
        
        self::annotate("Testing slider position {$position}: {$label} - {$description}");
        
        // Find slider element
        $slider = self::$driver->findElement(WebDriverBy::id('PBXRecordSavePeriodSlider'));
        $sliderContainer = $slider->findElement(WebDriverBy::xpath('..'));
        
        // Find all tick marks
        $ticks = $sliderContainer->findElements(WebDriverBy::className('tick'));
        
        if (count($ticks) > $position) {
            // Click on the specific tick mark
            $ticks[$position]->click();
            
            // Wait for slider animation
            $this->waitForAjax();
            sleep(1);
            
            // Verify the hidden input value
            $hiddenInput = self::$driver->findElement(WebDriverBy::name('PBXRecordSavePeriod'));
            $actualValue = $hiddenInput->getAttribute('value');
            
            self::assertEquals(
                $expectedValue,
                $actualValue,
                "Slider position {$position} should set value to '{$expectedValue}', but got '{$actualValue}'"
            );
            
            // Submit form to save
            $this->submitForm('storage-form');
            
            // Navigate back to verify saved value
            $this->navigateToStoragePage();
            
            // Verify saved value
            $hiddenInput = self::$driver->findElement(WebDriverBy::name('PBXRecordSavePeriod'));
            $savedValue = $hiddenInput->getAttribute('value');
            
            self::assertEquals(
                $expectedValue,
                $savedValue,
                "Saved value should be '{$expectedValue}', but got '{$savedValue}'"
            );
            
            // Verify slider visual position
            $sliderThumb = $sliderContainer->findElement(WebDriverBy::className('thumb'));
            $thumbLeft = $sliderThumb->getCSSValue('left');
            
            self::annotate("Slider thumb position: {$thumbLeft}");
        } else {
            self::fail("Could not find tick mark at position {$position}");
        }
    }

    /**
     * Submit form and wait for response
     */
    protected function submitForm(string $formId): void
    {
        self::annotate("Submitting form: {$formId}");
        
        // Find submit button
        $submitButton = self::$driver->findElement(
            WebDriverBy::xpath("//form[@id='{$formId}']//button[@type='submit']")
        );
        
        // Click submit
        $submitButton->click();
        
        // Wait for ajax completion
        $this->waitForAjax();
        
        // Wait for success message
        try {
            $this->waitForCondition(
                WebDriverExpectedCondition::presenceOfElementLocated(
                    WebDriverBy::className('positive')
                ),
                5
            );
        } catch (\Exception $e) {
            // If no success message, check if we're redirected
            self::assertStringContainsString(
                '/storage/index',
                self::$driver->getCurrentURL(),
                'Form submission should redirect to storage page'
            );
        }
    }

    /**
     * Wait for element to be present
     */
    protected function waitForElementPresent(WebDriverBy $by, int $timeout = 10): void
    {
        $this->waitForCondition(
            WebDriverExpectedCondition::presenceOfElementLocated($by),
            $timeout
        );
    }

    /**
     * Wait for a condition
     */
    protected function waitForCondition($condition, int $timeout = 10): void
    {
        self::$driver->wait($timeout)->until($condition);
    }
}