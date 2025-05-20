<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use Facebook\WebDriver\WebDriverWait;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\ModuleXPathsTrait;

abstract class InstallModuleTest extends MikoPBXTestsBase
{
    use ModuleXPathsTrait;
    protected const int INSTALLATION_TIMEOUT = 180;
    protected const int STATE_CHANGE_TIMEOUT = 45;
    protected const int STATE_CHECK_INTERVAL = 5;
    protected const int MODAL_WAIT_TIME = 2;

    protected function setUp(): void
    {
        parent::setUp();
        $data = $this->getModuleData();
        $this->setSessionName("Test: Install module - {$data['moduleId']}");
    }

    abstract protected function getModuleData(): array;

    public function testInstallModule(): void
    {
        $params = $this->getModuleData();
        self::annotate("Installing module: {$params['moduleId']}");

        try {
            $this->navigateToModules();
            $this->installModule($params);
            $this->verifyInstallation($params);
            $this->configureModuleState($params);

            self::annotate("Successfully installed module: {$params['moduleId']}", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to install module: {$params['moduleId']}", 'error');
            throw $e;
        }
    }

    protected function navigateToModules(): void
    {
        $maxAttempts = 5;
        $attempt = 0;
        $placeholderVisible = true;
        
        while ($attempt < $maxAttempts && $placeholderVisible) {
            if ($attempt > 0) {
                sleep(5);
                self::annotate("Retrying modules page navigation, attempt {$attempt}");
            }
            
            $this->clickSidebarMenuItemByHref("/admin-cabinet/pbx-extension-modules/index/");
            $this->changeTabOnCurrentPage('marketplace');
            $this->waitForAjax();
            
            try {
                $placeholder = self::$driver->findElement(WebDriverBy::id('no-new-modules-segment'));
                $placeholderVisible = $placeholder->isDisplayed();
            } catch (\Exception $e) {
                // Placeholder not found or not visible, we can proceed
                $placeholderVisible = false;
            }
            
            $attempt++;
            
            if (!$placeholderVisible) {
                self::annotate("Modules loaded successfully");
                break;
            }
        }
        
        if ($placeholderVisible) {
            self::annotate("Warning: Marketplace data may not be fully loaded after {$maxAttempts} attempts", 'warning');
        }
    }

    protected function installModule(array $params): void
    {
        $xpath = $this->getInstallButtonXPath($params['moduleId']);
        $installButton = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $installButton->click();
        $this->waitForAjax();

        sleep(self::MODAL_WAIT_TIME);

        $wait = new WebDriverWait(self::$driver, 10);
        $approveButton = $wait->until(
            WebDriverExpectedCondition::elementToBeClickable(
                WebDriverBy::xpath($this->getModalApproveButtonXPath())
            )
        );
        $approveButton->click();
        $this->waitForAjax();
    }

    protected function verifyInstallation(array $params): void
    {
        $startTime = time();
        $timeout = self::INSTALLATION_TIMEOUT;
        $success = false;

        while (time() - $startTime < $timeout) {
            try {
                // Refresh the page to handle Nginx restarts
                self::$driver->navigate()->refresh();
                $this->waitForAjax();

                // Wait a few seconds for page to load properly
                sleep(self::STATE_CHECK_INTERVAL);

                // Try to find the delete button
                $deleteButton = self::$driver->findElement(
                    WebDriverBy::xpath($this->getDeleteButtonXPath($params['moduleId']))
                );
                
                if ($deleteButton->isDisplayed()) {
                    $success = true;
                    break;
                }
            } catch (\Exception $e) {
                // If element not found or other error, continue trying
                sleep(self::STATE_CHECK_INTERVAL);
            }
        }

        $this->assertTrue($success, "Module {$params['moduleId']} was not installed properly after {$timeout} seconds");
    }

    protected function configureModuleState(array $params): void
    {
        // Enable by default after installation
        sleep(10);
        $this->changeModuleState($params['moduleId']);
        sleep(10);

        // Set to desired state
        $this->changeModuleState($params['moduleId'], $params['enable']);
        sleep(10);
    }

    protected function changeModuleState(string $moduleId, bool $enable = true): void
    {
        $xpath = $this->getToggleCheckboxXPath($moduleId);
        $checkbox = self::$driver->findElement(WebDriverBy::xpath($xpath));

        if (($enable && !$checkbox->isSelected()) || (!$enable && $checkbox->isSelected())) {
            $parentXPath = sprintf(
                '//tr[contains(@class,"module-row") and @data-id="%s"]//input[@type="checkbox"]/parent::div',
                $moduleId
            );
            $toggleDiv = self::$driver->findElement(WebDriverBy::xpath($parentXPath));

            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($toggleDiv)->perform();
            $toggleDiv->click();

            $this->waitForAjax();
            $this->verifyStateChange($moduleId, $enable);
        }
    }

    protected function verifyStateChange(string $moduleId, bool $expectedState): void
    {
        $waitTime = 0;
        $changed = false;

        while ($waitTime < self::STATE_CHANGE_TIMEOUT) {
            sleep(self::STATE_CHECK_INTERVAL);

            $checkbox = self::$driver->findElement(
                WebDriverBy::xpath($this->getToggleCheckboxXPath($moduleId))
            );

            if ($checkbox->isSelected() === $expectedState) {
                $changed = true;
                break;
            }

            $waitTime += self::STATE_CHECK_INTERVAL;
        }

        $this->assertTrue(
            $changed,
            "Module {$moduleId} state was not changed to " . ($expectedState ? 'enabled' : 'disabled')
            . " during {$waitTime} seconds"
        );
    }
}
