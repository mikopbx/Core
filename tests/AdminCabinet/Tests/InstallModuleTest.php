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
    protected const int STATE_CHANGE_TIMEOUT = 120;
    protected const int STATE_CHECK_INTERVAL = 5;
    protected const int STATE_WAIT_INTERVAL_MS = 500;
    protected const int MODAL_WAIT_TIME = 2;

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
     * Installs a module.
     *
     * This method clicks the install button and waits for the modal to be visible.
     * It then clicks the approve button and waits for the AJAX request to complete.
     */
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
                    $this->waitForModuleControlsReady($params['moduleId']);
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
        $this->changeModuleState($params['moduleId']);

        // Set to desired state
        $this->changeModuleState($params['moduleId'], $params['enable']);
    }

    /**
     * Changes the state of a module.
     *
     * This method toggles the state of a module by clicking the checkbox.
     */
    protected function changeModuleState(string $moduleId, bool $enable = true): void
    {
        $this->waitForModuleControlsReady($moduleId);

        if ($this->getModuleEnabledState($moduleId) === $enable) {
            $this->verifyStateChange($moduleId, $enable);
            return;
        }

        $toggleDiv = self::$driver->wait(
            self::STATE_CHANGE_TIMEOUT,
            self::STATE_WAIT_INTERVAL_MS
        )->until(
            WebDriverExpectedCondition::elementToBeClickable(
                WebDriverBy::xpath($this->getToggleContainerXPath($moduleId))
            )
        );

        $actions = new WebDriverActions(self::$driver);
        $actions->moveToElement($toggleDiv)->perform();
        $toggleDiv->click();

        $this->waitForAjax(self::STATE_CHANGE_TIMEOUT, true);
        $this->verifyStateChange($moduleId, $enable);
    }

    protected function verifyStateChange(string $moduleId, bool $expectedState): void
    {
        $startTime = time();
        $lastState = null;
        $lastError = '';

        while (time() - $startTime < self::STATE_CHANGE_TIMEOUT) {
            try {
                $this->waitForModuleControlsReady($moduleId, self::STATE_CHECK_INTERVAL);
                $lastState = $this->getModuleEnabledState($moduleId);

                if ($lastState === $expectedState && $this->verifyModuleStateAfterRefresh($moduleId, $expectedState)) {
                    return;
                }

                self::$driver->navigate()->refresh();
                $this->waitForPageReady();
                $this->changeTabOnCurrentPage('installed');
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
            }

            sleep(self::STATE_CHECK_INTERVAL);
        }

        $actualState = $lastState === null ? 'unknown' : ($lastState ? 'enabled' : 'disabled');
        $this->assertTrue(
            false,
            "Module {$moduleId} state was not changed to " . ($expectedState ? 'enabled' : 'disabled')
            . " during " . self::STATE_CHANGE_TIMEOUT . " seconds. Last state: {$actualState}."
            . ($lastError === '' ? '' : " Last error: {$lastError}")
        );
    }

    protected function waitForModuleControlsReady(string $moduleId, int $timeout = self::STATE_CHANGE_TIMEOUT): void
    {
        self::$driver->wait($timeout, self::STATE_WAIT_INTERVAL_MS)->until(
            function () use ($moduleId): bool {
                try {
                    return (bool) self::$driver->executeScript(
                        <<<'JS'
const moduleId = arguments[0];
const row = Array.from(document.querySelectorAll('tr.module-row'))
    .find((item) => item.getAttribute('data-id') === moduleId);
if (!row || row.offsetParent === null) {
    return false;
}

const toggle = row.querySelector('.ui.toggle.checkbox');
const checkbox = row.querySelector('input[type="checkbox"]');
if (!toggle || !checkbox) {
    return false;
}

const statusIcon = row.querySelector('i.status-icon');
const statusIconBusy = statusIcon
    && (statusIcon.classList.contains('loading') || statusIcon.classList.contains('spinner'));
const ajaxReady = typeof jQuery === 'undefined' || jQuery.active === 0;
const loadersReady = document.querySelectorAll('.ui.loader.active').length === 0;

return document.readyState === 'complete'
    && ajaxReady
    && loadersReady
    && !toggle.classList.contains('disabled')
    && !toggle.classList.contains('loading')
    && !statusIconBusy;
JS,
                        [$moduleId]
                    );
                } catch (\Exception $e) {
                    return false;
                }
            }
        );
    }

    protected function getModuleEnabledState(string $moduleId): ?bool
    {
        $state = self::$driver->executeScript(
            <<<'JS'
const moduleId = arguments[0];
const row = Array.from(document.querySelectorAll('tr.module-row'))
    .find((item) => item.getAttribute('data-id') === moduleId);
const checkbox = row ? row.querySelector('input[type="checkbox"]') : null;
return checkbox ? checkbox.checked : null;
JS,
            [$moduleId]
        );

        return is_bool($state) ? $state : null;
    }

    protected function verifyModuleStateAfterRefresh(string $moduleId, bool $expectedState): bool
    {
        try {
            self::$driver->navigate()->refresh();
            $this->waitForPageReady();
            $this->changeTabOnCurrentPage('installed');
            $this->waitForModuleControlsReady($moduleId);

            if ($this->getModuleEnabledState($moduleId) !== $expectedState) {
                return false;
            }

            sleep(self::STATE_CHECK_INTERVAL);
            $this->waitForModuleControlsReady($moduleId, self::STATE_CHECK_INTERVAL);

            return $this->getModuleEnabledState($moduleId) === $expectedState;
        } catch (\Exception $e) {
            self::annotate(
                sprintf('Module %s state refresh verification failed: %s', $moduleId, $e->getMessage()),
                'warning'
            );
            return false;
        }
    }
}
