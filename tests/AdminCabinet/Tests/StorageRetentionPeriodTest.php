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
    /**
     * Slider initialization timeout in seconds
     */
    private const SLIDER_INIT_TIMEOUT = 5;
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
        
        // Wait for slider to be initialized
        $this->waitForSliderInitialization();
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
        
        // Use JavaScript to set the slider value directly
        self::$driver->executeScript(
            "$('#PBXRecordSavePeriodSlider').slider('set value', {$position});"
        );
        
        // Wait for slider animation and onChange event
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
        
        // Verify slider visual position using JavaScript
        $sliderValue = self::$driver->executeScript(
            "return $('#PBXRecordSavePeriodSlider').slider('get value');"
        );
        
        self::assertEquals(
            $position,
            $sliderValue,
            "Slider visual position should be {$position}, but got {$sliderValue}"
        );
        
        self::annotate("Slider position {$position} test completed successfully");
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
    
    /**
     * Wait for slider to be initialized
     */
    protected function waitForSliderInitialization(): void
    {
        self::annotate("Waiting for slider initialization");
        
        // Wait until slider is initialized (has the slider class and methods)
        $this->waitForCondition(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::cssSelector('#PBXRecordSavePeriodSlider.ui.slider')
            ),
            self::SLIDER_INIT_TIMEOUT
        );
        
        // Additional wait to ensure JavaScript initialization is complete
        sleep(1);
        
        // Verify slider is functional by checking if we can get its value
        $sliderValue = self::$driver->executeScript(
            "return $('#PBXRecordSavePeriodSlider').slider('get value');"
        );
        
        self::assertNotNull($sliderValue, "Slider should be initialized and return a value");
    }
}