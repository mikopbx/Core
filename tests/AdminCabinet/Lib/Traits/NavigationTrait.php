<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;
use Facebook\WebDriver\WebDriverExpectedCondition;
use RuntimeException;

/**
 * Trait NavigationTrait
 * Handles all navigation-related interactions in Selenium tests
 */
trait NavigationTrait
{
    /**
     * Navigation configuration
     */
    protected const NAVIGATION = [
        'timeouts' => [
            'click' => 5,
            'wait' => 30,
            'animation' => 1,
            'ajax' => 30
        ],
        'retries' => [
            'navigation' => 3,
            'click' => 2
        ],
        'scroll' => [
            'behavior' => 'instant',
            'block' => 'center'
        ],
        'wait_intervals' => [
            'default' => 500,
            'animation' => 100
        ]
    ];


    /**
     * Click sidebar menu item by href
     *
     * @param string $href Menu item href
     * @throws RuntimeException|\Exception
     */
    protected function clickSidebarMenuItemByHref(string $href): void
    {
        $this->logTestAction("Click sidebar menu", ['href' => $href]);

        try {
            $xpath = sprintf(
                '//div[@id="sidebar-menu"]//ancestor::a[contains(@class, "item") and contains(@href ,"%s")]',
                $href
            );

            $menuItem = $this->waitForElement($xpath);
            $this->scrollIntoView($menuItem);
            $menuItem->click();
            $this->waitForAjax();
        } catch (\Exception $e) {
            $this->handleActionError('click sidebar menu item', $href, $e);
        }
    }

    /**
     * Click modify button on row with specific text
     *
     * @param string $text Row text to find
     * @throws RuntimeException
     */
    protected function clickModifyButtonOnRowWithText(string $text): void
    {
        $this->logTestAction("Click modify button", ['text' => $text]);

        try {
            $xpath = sprintf(
                '//td[contains(text(),"%s")]/parent::tr[contains(@class, "row")]//a[contains(@href,"modify")]',
                $text
            );
            try {
                $element = self::$driver->findElement(WebDriverBy::xpath($xpath));
                $actions = new WebDriverActions(self::$driver);
                $actions->moveToElement($element);
                $actions->perform();
                $element->click();
                $this->waitForAjax();
            } catch (NoSuchElementException $e) {
                throw new RuntimeException("Element not found: $xpath", 0, $e);
            }
        } catch (\Exception $e) {
            $this->handleActionError('click modify button', $text, $e);
        }
    }

    /**
     * Click delete button on row with specific text
     *
     * @param string $text Row text to find
     * @param bool $confirmDelete Whether to confirm deletion
     * @throws RuntimeException
     */
    protected function clickDeleteButtonOnRowWithText(string $text, bool $confirmDelete = true): void
    {
        $this->logTestAction("Click delete button", ['text' => $text, 'confirm' => $confirmDelete]);

        try {
            $xpath = sprintf(
                '//td[contains(text(),"%s")]/ancestor::tr[contains(@class, "row")]//a[contains(@href,"delete")]',
                $text
            );

            $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($xpath));
            foreach ($deleteButtons as $deleteButton) {
                $this->scrollIntoView($deleteButton);
                $deleteButton->click();

                if ($confirmDelete) {
                    sleep(self::NAVIGATION['timeouts']['animation']);
                    $deleteButton->click(); // Confirm deletion
                }

                $this->waitForAjax();
            }
        } catch (\Exception $e) {
            $this->handleActionError('click delete button', $text, $e);
        }
    }

    /**
     * Change tab on current page
     *
     * @param string $anchor Tab anchor
     * @throws RuntimeException
     */
    protected function changeTabOnCurrentPage(string $anchor): void
    {
        $this->logTestAction("Change tab", ['anchor' => $anchor]);

        try {
            // Scroll to top first
            self::$driver->executeScript(
                sprintf(
                    "document.getElementById('main').scrollIntoView({block: 'start', inline: 'nearest', behavior: '%s'})",
                    self::NAVIGATION['scroll']['behavior']
                )
            );

            sleep(self::NAVIGATION['timeouts']['animation']);

            $xpath = sprintf(
                '//div[contains(@class, "menu")]//a[contains(@data-tab,"%s")]',
                $anchor
            );

            $tab = $this->waitForElement($xpath);
            $this->scrollIntoView($tab);
            $tab->click();
            $this->waitForAjax();
        } catch (\Exception $e) {
            $this->handleActionError('change tab', $anchor, $e, );
        }
    }

    /**
     * Open accordion on the page
     *
     * @param string $selector Optional specific accordion selector
     * @throws RuntimeException
     */
    protected function openAccordionOnThePage(string $selector = ''): void
    {
        $this->logTestAction("Open accordion", ['selector' => $selector]);

        try {
            $xpath = $selector ?: '//div[contains(@class, "ui") and contains(@class, "accordion")]';
            $accordion = $this->waitForElement($xpath);
            $this->scrollIntoView($accordion);
            $accordion->click();
            $this->waitForAjax();
        } catch (\Exception $e) {
            $this->handleActionError('open accordion', $selector, $e);
        }
    }

    /**
     * Click button by href
     *
     * @param string $href Button href
     * @throws RuntimeException
     */
    protected function clickButtonByHref(string $href): void
    {
        $this->logTestAction("Click button", ['href' => $href]);

        try {
            // First, try to find any visible button with the exact href
            $xpath = sprintf('//a[@href="%s"]', $href);
            $buttons = self::$driver->findElements(WebDriverBy::xpath($xpath));
            
            // Look for a visible button
            foreach ($buttons as $button) {
                if ($button->isDisplayed()) {
                    $this->scrollIntoView($button);
                    $button->click();
                    $this->waitForAjax();
                    return;
                }
            }
            
            // If no visible button found, try to find any button with the href (including hidden ones)
            if (!empty($buttons)) {
                $button = $buttons[0];
                $this->scrollIntoView($button);
                $button->click();
                $this->waitForAjax();
                return;
            }
            
            // Fallback: try to find button with partial href match (for dynamic URLs)
            $fallbackXpath = sprintf('//a[contains(@href, "%s")]', $href);
            $fallbackButtons = self::$driver->findElements(WebDriverBy::xpath($fallbackXpath));
            
            foreach ($fallbackButtons as $button) {
                if ($button->isDisplayed()) {
                    $this->scrollIntoView($button);
                    $button->click();
                    $this->waitForAjax();
                    return;
                }
            }
            
            // Last resort: try to click hidden buttons if they exist
            if (!empty($fallbackButtons)) {
                foreach ($fallbackButtons as $button) {
                    try {
                        $this->scrollIntoView($button);
                        $button->click();
                        $this->waitForAjax();
                        return;
                    } catch (\Exception $ex) {
                        // Continue to next button
                    }
                }
            }
            
            throw new \RuntimeException(sprintf('No clickable button found with href "%s"', $href));
            
        } catch (\Exception $e) {
            $this->handleActionError('click button', $href, $e);
        }
    }

    /**
     * Wait for AJAX requests to complete
     *
     * @param int $timeout Timeout in seconds
     */
    protected function waitForAjax(int $timeout = self::NAVIGATION['timeouts']['ajax']): void
    {
        try {
            self::$driver->wait($timeout, self::NAVIGATION['wait_intervals']['default'])->until(
                function () {
                    try {
                        $ajaxComplete = self::$driver->executeScript(
                            'return (typeof jQuery != "undefined") ? jQuery.active == 0 : true'
                        );
                        return $ajaxComplete;
                    } catch (\Exception $e) {
                        self::annotate("Error checking AJAX status: " . $e->getMessage());
                        return true;
                    }
                }
            );
        } catch (\Exception $e) {
            self::annotate("Timeout waiting for AJAX: " . $e->getMessage());
        }
    }

    /**
     * Scroll element into view
     *
     * @param WebDriverElement $element Element to scroll to
     * @param string $block Scroll alignment
     */
    protected function scrollIntoView(
        WebDriverElement $element,
        string $block = self::NAVIGATION['scroll']['block']
    ): void {
        self::$driver->executeScript(
            sprintf(
                "arguments[0].scrollIntoView({block: '%s', behavior: '%s'})",
                $block,
                self::NAVIGATION['scroll']['behavior']
            ),
            [$element]
        );
    }
}