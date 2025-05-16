<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use Facebook\WebDriver\WebDriverWait;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\LoginTrait;
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
        $this->clickSidebarMenuItemByHref("/admin-cabinet/pbx-extension-modules/index/");
        $this->changeTabOnCurrentPage('marketplace');
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
        $wait = new WebDriverWait(self::$driver, self::INSTALLATION_TIMEOUT);
        $deleteButton = $wait->until(
            WebDriverExpectedCondition::visibilityOfElementLocated(
                WebDriverBy::xpath($this->getDeleteButtonXPath($params['moduleId']))
            )
        );

        $this->assertTrue($deleteButton->isDisplayed(), "Module {$params['moduleId']} was not installed properly");
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
