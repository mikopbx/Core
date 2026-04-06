<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\Exception\ElementNotInteractableException;
use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;
use Facebook\WebDriver\WebDriverExpectedCondition;
use RuntimeException;

/**
 * Trait ElementInteractionTrait
 * Handles all element-related interactions in Selenium tests
 */
trait ElementInteractionTrait
{
    /**
     * Element interaction configuration
     */
    protected const ELEMENT = [
        'timeouts' => [
            'presence' => 10,
            'visibility' => 5,
            'clickable' => 3,
            'retry' => 1
        ],
        'intervals' => [
            'wait' => 500,
            'retry' => 100
        ],
        'retries' => [
            'interaction' => 3,
            'check' => 2
        ]
    ];


    /**
     * Safely find a WebDriver element without throwing exceptions
     *
     * @param string $xpath XPath expression to locate the element
     * @param \Facebook\WebDriver\WebDriverElement|null $context Optional parent element to search within
     * @return \Facebook\WebDriver\WebDriverElement|null Found element or null if not found or any error
     */
    protected function findElementSafely(string $xpath, ?\Facebook\WebDriver\WebDriverElement $context = null): ?\Facebook\WebDriver\WebDriverElement
    {
        try {
            $elements = [];

            if ($context) {
                $elements = $context->findElements(WebDriverBy::xpath($xpath));
            } else {
                $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));
            }

            return count($elements) > 0 ? $elements[0] : null;
        } catch (\Exception $e) {
            // Здесь ловим любые другие исключения, которые могут возникнуть
            $this->annotate("Exception in findElementSafelyUsingFindElements: " . $e->getMessage(), 'debug');
            return null;
        }
    }
    /**
     * Get current record ID from form
     *
     * @return string
     */
    protected function getCurrentRecordID(): string
    {
        try {
            $xpath = '//input[@name="id" and @type="hidden"]';
            $input = $this->waitForElement($xpath);
            if ($input) {
                $elementSource = $input->getAttribute('outerHTML');
            }
            return $input->getAttribute('value') ?? 'undefined';
        } catch (\Exception $e) {
            $this->handleActionError('get current record ID', '', $e, $elementSource??'');
            return 'undefined';
        }
    }

    /**
     * Delete all records from table
     *
     * @param string $tableId Table identifier
     */
    protected function deleteAllRecordsOnTable(string $tableId): void
    {
        $this->logTestAction("Delete all records", ['tableId' => $tableId]);

        try {
            $xpath = sprintf(
                '//table[@id="%s"]//a[contains(@href,"delete") and not(contains(@class,"disabled"))]',
                $tableId
            );

            while ($deleteButton = $this->findElementSafely($xpath)) {
                $this->scrollIntoView($deleteButton);
                $deleteButton->click();
                sleep(self::ELEMENT['timeouts']['retry']);
                $deleteButton->click(); // Confirm deletion
                $this->waitForAjax();
            }
        } catch (\Exception $e) {
            $this->handleActionError('delete all records', $tableId, $e);
        }
    }

    /**
     * Fill DataTable search input
     *
     * @param string $datatableId DataTable identifier
     * @param string $name Input name
     * @param string $value Search value
     */
    protected function fillDataTableSearchInput(
        string $datatableId,
        string $name,
        string $value
    ): void {
        $this->logTestAction("Fill datatable search", [
            'datatableId' => $datatableId,
            'name' => $name,
            'value' => $value
        ]);

        try {
            $this->changeInputField($name, $value);

            // Trigger search
            self::$driver->executeScript(
                sprintf(
                    "$('#%s').trigger($.Event('keyup', { keyCode: 13 }));",
                    $name
                )
            );

            $this->waitForAjax();
            sleep(2);; // Wait for DataTable redraw
        } catch (\Exception $e) {
            $this->handleActionError('fill datatable search', $name, $e);
        }
    }

    /**
     * Private helper methods
     */


    /**
     * Wait for element presence
     *
     * @param string $xpath Element xpath
     * @param int $timeout Timeout in seconds
     * @return WebDriverElement
     * @throws TimeoutException|NoSuchElementException
     */
    protected function waitForElement(
        string $xpath,
        int $timeout = self::ELEMENT['timeouts']['presence']
    ): WebDriverElement {
        return self::$driver->wait($timeout, self::ELEMENT['intervals']['wait'])->until(
            WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
        );
    }


    /**
     * Find modify button on row with id $text and click it
     *
     * @param string $id
     */
    protected function clickModifyButtonOnRowWithID(string $id): void
    {
        self::annotate("Test action: Click modify button with id=$id");
        $xpath = ('//tr[contains(@class, "row") and @id="' . $id . '"]//a[contains(@href,"modify")]');
        try {
            $tableButtonModify = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($tableButtonModify);
            $actions->perform();
            $tableButtonModify->click();
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found row with id=' . $id . ' on this page' . PHP_EOL);
        } catch (\Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }
}