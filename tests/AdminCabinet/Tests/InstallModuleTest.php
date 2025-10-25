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
    protected const int MAX_INSTALL_ATTEMPTS = 3;
    protected const int INSTALL_RETRY_DELAY = 10;

    protected function setUp(): void
    {
        parent::setUp();
        $data = $this->getModuleData();
        $this->setSessionName("Test: Install module - {$data['moduleId']}");
    }

    abstract protected function getModuleData(): array;

    /**
     * Installs a module and verifies its installation.
     *
     * This method navigates to the modules page, installs the specified module,
     * verifies its installation, and configures its state.
     */
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

    /**
     * Navigates to the modules page and waits for the placeholder to be visible.
     *
     * This method attempts to navigate to the modules page and wait for the placeholder
     * to be visible. It retries the navigation up to 5 times if the placeholder is not
     * visible initially.
     */
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

    /**
     * Installs a module with retry logic.
     *
     * This method clicks the install button and waits for the modal to be visible.
     * It then clicks the approve button and waits for the AJAX request to complete.
     * If installation doesn't start (Curl 0 error or progress bar doesn't appear),
     * it will retry up to MAX_INSTALL_ATTEMPTS times.
     */
    protected function installModule(array $params): void
    {
        $installStarted = false;
        $attempt = 0;

        while ($attempt < self::MAX_INSTALL_ATTEMPTS && !$installStarted) {
            if ($attempt > 0) {
                self::annotate("Retrying module installation, attempt " . ($attempt + 1));
                sleep(self::INSTALL_RETRY_DELAY);

                // Remove any error messages from previous attempt
                $this->removeErrorMessages();
            }

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

            // Wait a bit and check if installation actually started
            sleep(5);
            $installStarted = $this->checkInstallationStarted();

            $attempt++;
        }

        if (!$installStarted) {
            self::annotate("Installation did not start after {$attempt} attempts", 'warning');
        } else {
            self::annotate("Installation started successfully" . ($attempt > 1 ? " after {$attempt} attempts" : ""));
        }
    }

    /**
     * Checks if module installation has actually started.
     *
     * This method checks for the presence of progress bar or installation status indicators.
     *
     * @return bool True if installation started, false otherwise
     */
    protected function checkInstallationStarted(): bool
    {
        try {
            // Check if progress bar is visible
            $progressBar = self::$driver->findElement(WebDriverBy::id('upload-progress-bar-block'));
            if ($progressBar->isDisplayed()) {
                return true;
            }
        } catch (\Exception) {
            // Progress bar not found or not visible
        }

        try {
            // Check if there's a spinner/loading indicator on the button
            $loadingIcon = self::$driver->findElement(
                WebDriverBy::xpath('//a[contains(@class, "download") or contains(@class, "update")]//i[contains(@class, "loading")]')
            );
            if ($loadingIcon->isDisplayed()) {
                return true;
            }
        } catch (\Exception) {
            // Loading icon not found
        }

        return false;
    }

    /**
     * Removes error messages from previous installation attempts.
     */
    protected function removeErrorMessages(): void
    {
        try {
            $script = "document.querySelectorAll('tr.table-error-messages').forEach(el => el.remove());";
            self::$driver->executeScript($script);
        } catch (\Exception) {
            // Ignore if no error messages found
        }
    }

    /**
     * Verifies the installation of a module.
     *
     * This method waits for the module to be installed by checking the delete button.
     * It retries the check up to 5 times if the button is not found.
     */
    protected function verifyInstallation(array $params): void
    {
        $startTime = time();
        $timeout = self::INSTALLATION_TIMEOUT;
        $success = false;
        $this->changeTabOnCurrentPage('installed');
        sleep(15); //Wait until page reload or Nginx restart and then start checking

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

    /**
     * Configures the state of a module.
     *
     * This method enables the module by default and then sets it to the desired state.
     */
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

    /**
     * Changes the state of a module.
     *
     * This method toggles the state of a module by clicking the checkbox.
     */
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
