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
        if ($tab = $this->findElementTab($key)) {
            $this->navigateToTab($tab);

            if (is_bool($value)) {
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
        if ($tab = $this->findElementTab($key)) {
            $this->navigateToTab($tab);

            if (is_bool($value)) {
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
