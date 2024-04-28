<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Tests\AdminCabinet\Lib;

use Exception;
use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;
use Facebook\WebDriver\WebDriverExpectedCondition;
use MikoPBX\Tests\AdminCabinet\Tests\LoginTrait;


class MikoPBXTestsBase extends BrowserStackTest
{
    use  LoginTrait;

    /**
     * Select dropdown menu item
     *
     * @param $name  string menu name identifier
     * @param $value string menu value for select
     *
     */
    protected function selectDropdownItem(string $name, string $value): void
    {
        self::annotate("Test action: Select $name menu item with value=$value");
        // Check selected value
        $xpath = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $selectedExtensions = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectedExtensions as $element) {
            $currentValue = $element->getAttribute('value');
            if ($currentValue === $value) {
                return;
            }
        }

        $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]';
        $xpath .= '| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]';
        try {
            $selectItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $selectItem->click();
            $this->waitForAjax();

            // If search field exists input them before select
            $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]/input[contains(@class,"search")]';
            $xpath .= '| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]/input[contains(@class,"search")]';
            $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            foreach ($inputItems as $inputItem) {
                $actions->moveToElement($inputItem);
                $actions->perform();
                $inputItem->click();
                $inputItem->clear();
                $inputItem->sendKeys($value);
            }

            //Try to find need string with value
            $xpath = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[@data-value="' . $value . '"]';
            $menuItem = self::$driver->wait()->until(
                WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
            );
            $menuItem->click();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found select with name ' . $name . 'on selectDropdownItem' . PHP_EOL);
        } catch (TimeoutException $e) {
            $this->fail('Not found menuitem ' . $value . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * @param string $text
     * @param string $level
     * @return void
     */
    public static function annotate(string $text, string $level='info')
    {
        // Create an associative array with the structure you want to encode as JSON
        $data = [
            'action' => 'annotate',
            'arguments' => [
                'level' => $level,
                'data' => $text
            ]
        ];

        // Encode the array as a JSON string
        $message = 'browserstack_executor: ' . json_encode($data, JSON_PRETTY_PRINT);

        // Execute the script with the encoded message
        // Temporary disable because of many problems on BrowserStack self::$driver->executeScript($message);
    }

    /**
     * Wait until jquery will be ready
     */
    protected function waitForAjax(): void
    {
        self::annotate("Test action: Waiting for AJAX");
        while (true) // Handle timeout somewhere
        {
            $ajaxIsComplete = (bool)(self::$driver->executeScript("return window.jQuery&&jQuery.active == 0"));
            if ($ajaxIsComplete) {
                break;
            }
            sleep(1);
        }
    }

    /**
     * Fails a test with the given message.
     *
     *
     * @psalm-return never-return
     */
    public static function fail(string $message = ''): void
    {
        self::setSessionStatus($message);
        parent::fail($message);
    }

    /**
     * @param string $text
     * @param string $status failed/passed
     * @return void
     */
    public static function setSessionStatus(string $text, string $status = 'failed')
    {

        // Create an associative array with the structure you want to encode as JSON
        $data = [
            'action' => 'setSessionStatus',
            'arguments' => [
                'status' => $status,
                'reason' => substr($text,0,256)
            ]
        ];

        // Encode the array as a JSON string
        $message = 'browserstack_executor: ' . json_encode($data, JSON_PRETTY_PRINT);

        // Execute the script with the encoded message
        // Temporary disable because of many problems on BrowserStack  self::$driver->executeScript($message);
    }

    /**
     * Update current session name
     * @param string $name
     * @return void
     */
    public static function setSessionName(string $name)
    {

        // Create an associative array with the structure you want to encode as JSON
        $data = [
            'action' => 'setSessionName',
            'arguments' => [
                'name' => $name
            ]
        ];

        // Encode the array as a JSON string
        $message = 'browserstack_executor: ' . json_encode($data, JSON_PRETTY_PRINT);

        // Execute the script with the encoded message
        // Temporary disable because of many problems on BrowserStack  self::$driver->executeScript($message);
    }

    /**
     * Select dropdown menu item
     *
     * @param $name  string menu name identifier
     * @param $value string menu text for select
     *
     * @return string
     */
    protected function selectDropdownItemByName(string $name, string $value): string
    {
        self::annotate("Test action: Select $name menu item with text=$value");
        // Check selected value
        $xpath = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $selectedExtensions = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectedExtensions as $element) {
            $currentValue = $element->getText();
            if ($currentValue === $value) {
                return $element->getAttribute('value');
            }
        }

        $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]';
        $xpath .= '| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]';
        try {
            $selectItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $selectItem->click();
            $this->waitForAjax();

            // If search field exists input them before select
            $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]/input[contains(@class,"search")]';
            $xpath .= '| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]/input[contains(@class,"search")]';
            $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            foreach ($inputItems as $inputItem) {
                $actions->moveToElement($inputItem);
                $actions->perform();
                $inputItem->click();
                $inputItem->clear();
                $inputItem->sendKeys($value);
            }

            //Try to find need string with value
            $xpath = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[contains(text(),"' . $value . '")]';
            $menuItem = self::$driver->wait()->until(
                WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
            );
            $menuItem->click();
            return $menuItem->getAttribute('data-value');
        } catch (NoSuchElementException $e) {
            $this->fail('Not found select with name ' . $name . 'on selectDropdownItem' . PHP_EOL);
        } catch (TimeoutException $e) {
            $this->fail('Not found menuitem ' . $value . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Assert that menu item selected
     *
     * @param      $name         string menu name
     * @param      $checkedValue string checked value
     * @param bool $skipIfNotExist
     */
    protected function assertMenuItemSelected(string $name, string $checkedValue, $skipIfNotExist = false): void
    {
        $xpath = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $selectedExtensions = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectedExtensions as $element) {
            $currentValue = $element->getAttribute('value');
            $message = "{$name} check failure, because {$checkedValue} != {$currentValue}";
            $this->assertEquals($checkedValue, $currentValue, $message);
        }
        if (!$skipIfNotExist && count($selectedExtensions) === 0) {
            $this->fail('Not found select with name ' . $name . ' in assertMenuItemSelected' . PHP_EOL);
        }
    }

    /**
     * Assert that menu item not selected
     *
     * @param      $name         string menu name
     */
    protected function assertMenuItemNotSelected(string $name): void
    {
        $xpath = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $this->assertElementNotFound(WebDriverBy::xpath($xpath));

    }

    /**
     * Assert that menu item not found on the page
     *
     * @param $by
     */
    protected function assertElementNotFound($by): void
    {

        $els = self::$driver->findElements($by);
        if (count($els)) {
            $this->fail("Unexpectedly element was found by " . $by->getValue() . PHP_EOL);
        }
        // increment assertion counter
        $this->assertTrue(true);
    }

    /**
     * Change textarea with name $name value to $value
     *
     * @param string $name
     * @param string $value
     * @param bool $skipIfNotExist
     */
    protected function changeTextAreaValue(string $name, string $value, bool $skipIfNotExist = false): void
    {
        self::annotate("Test action: Change text area $name with value $value");
        $xpath = ('//textarea[@name="' . $name . '"]');
        $textAreaItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $actions = new WebDriverActions(self::$driver);
        foreach ($textAreaItems as $textAreaItem) {
            $actions->moveToElement($textAreaItem);
            $actions->perform();
            $textAreaItem->click();
            $textAreaItem->clear();
            $textAreaItem->sendKeys($value);
        }
        if (!$skipIfNotExist && count($textAreaItems) === 0) {
            $this->fail('Not found textarea with name ' . $name . ' in changeTextAreaValue' . PHP_EOL);
        }
    }

    /**
     * Assert that textArea value is equal
     *
     * @param string $name textArea name
     * @param string $checkedValue checked value
     */
    protected function assertTextAreaValueIsEqual(string $name, string $checkedValue): void
    {
        $xpath = '//textarea[@name="' . $name . '"]';
        $textAreaItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $currentValue = $textAreaItem->getAttribute('value');
        $message = "{$name} check failure, because {$checkedValue} != {$currentValue}";
        $this->assertEquals($checkedValue, $currentValue, $message);
    }

    /**
     * If file filed with $name exists on the page, it value will be changed on $value
     *
     * @param string $name
     * @param string $value
     * @param bool $skipIfNotExist
     */
    protected function changeFileField(string $name, string $value, bool $skipIfNotExist = false): void
    {
        self::annotate("Test action: Change file field $name with value $value");
        $xpath = '//input[@name="' . $name . '" and (@type = "file")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItems as $inputItem) {
            $inputItem->sendKeys($value);
        }
        if (!$skipIfNotExist && count($inputItems) === 0) {
            $this->fail('Not found input with type FILE and with name ' . $name . ' in changeFileField' . PHP_EOL);
        }
    }

    /**
     * Assert that input field with name $name value is equal to $checkedValue
     *
     * @param string $name
     * @param string $checkedValue
     * @param bool $skipIfNotExist
     */
    protected function assertInputFieldValueEqual(string $name, string $checkedValue, bool $skipIfNotExist = false): void
    {
        $xpath = '//input[@name="' . $name . '" and (@type="text" or @type="number" or @type="password" or @type="hidden")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItems as $inputItem) {
            $currentValue = $inputItem->getAttribute('value');
            $message = "input field: '{$name}' check failure, because {$checkedValue} != {$currentValue}";
            $this->assertEquals($checkedValue, $currentValue, $message);
        }
        if (!$skipIfNotExist && count($inputItems) === 0) {
            $this->fail('Not found input with name ' . $name . ' in assertInputFieldValueEqual' . PHP_EOL);
        }
    }

    /**
     * Change checkbox state according the $enabled value if checkbox with the $name exist on the page
     *
     * @param string $name
     * @param bool $enabled
     * @param bool $skipIfNotExist
     */
    protected function changeCheckBoxState(string $name, bool $enabled, bool $skipIfNotExist = false): void
    {
        self::annotate("Test action: Change checkbox $name to state $enabled");
        $xpath = '//input[@name="' . $name . '" and @type="checkbox"]';
        $checkBoxItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($checkBoxItems as $checkBoxItem) {
            if (
                ($enabled && !$checkBoxItem->isSelected())
                ||
                (!$enabled && $checkBoxItem->isSelected())
            ) {
                $xpath = '//input[@name="' . $name . '" and @type="checkbox"]/parent::div';
                $checkBoxItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
                $actions = new WebDriverActions(self::$driver);
                $actions->moveToElement($checkBoxItem);
                $actions->perform();
                $checkBoxItem->click();
            }
        }
        if (!$skipIfNotExist && count($checkBoxItems) === 0) {
            $this->fail('Not found checkbox with name ' . $name . ' in changeCheckBoxState' . PHP_EOL);
        }
    }

    /**
     * Assert that checkBox state is equal to the $enabled if checkbox with the $name exist on the page
     *
     * @param string $name checkBox name
     * @param bool $enabled checked state
     * @param bool $skipIfNotExist
     */
    protected function assertCheckBoxStageIsEqual(string $name, bool $enabled, bool $skipIfNotExist = false): void
    {
        $xpath = '//input[@name="' . $name . '" and @type="checkbox"]';
        $checkBoxItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($checkBoxItems as $checkBoxItem) {
            if ($enabled) {
                $this->assertTrue($checkBoxItem->isSelected(), "{$name} must be checked" . PHP_EOL);
            } else {
                $this->assertFalse($checkBoxItem->isSelected(), "{$name} must be unchecked" . PHP_EOL);
            }
        }
        if (!$skipIfNotExist && count($checkBoxItems) === 0) {
            $this->fail('Not found checkbox with name ' . $name . ' in assertCheckBoxStageIsEqual' . PHP_EOL);
        }
    }

    /**
     * Submit form with id - $formId and wait until form send
     *
     * @param string $formId
     *
     */
    protected function submitForm(string $formId): void
    {
        self::annotate("Test action: Submit the form");
        $xpath = '//form[@id="' . $formId . '"]//ancestor::div[@id="submitbutton"]';
        try {
            $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($button_Submit);
            $actions->perform();
            $button_Submit->click();
            $this->waitForAjax();
            self::$driver->wait(10, 500)->until(
                function ($driver) use ($xpath) {
                    $button_Submit = $driver->findElement(WebDriverBy::xpath($xpath));

                    return $button_Submit->isEnabled();
                }
            );
        } catch (NoSuchElementException $e) {
            $this->fail('Not found submit button on this page' . PHP_EOL);
        } catch (TimeoutException $e) {
            $this->fail('Form doesn\'t send after 10 seconds timeout' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Click on the left sidebar menu item
     *
     * @param string $href
     */
    protected function clickSidebarMenuItemByHref(string $href): void
    {
        self::annotate("Click sidebar menu item href=$href");
        try {
            $xpath = '//div[@id="sidebar-menu"]//ancestor::a[contains(@class, "item") and contains(@href ,"' . $href . '")]';
            $sidebarItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($sidebarItem);
            $actions->perform();
            $sidebarItem->click();
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found sidebar item with href=' . $href . ' on this page' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Find modify button on row with text $text and click it
     *
     * @param string $text
     */
    protected function clickModifyButtonOnRowWithText(string $text): void
    {
        self::annotate("Test action: Click modify button with text=$text");
        $xpath = ('//td[contains(text(),"' . $text . '")]/parent::tr[contains(@class, "row")]//a[contains(@href,"modify")]');
        try {
            $tableButtonModify = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($tableButtonModify);
            $actions->perform();
            $tableButtonModify->click();
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found row with text=' . $text . ' on this page' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
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
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Find modify button on row with text $text and click it
     *
     * @param string $text
     */
    protected function clickDeleteButtonOnRowWithText(string $text): void
    {
        self::annotate("Test action: Click delete button with text=$text");
        $xpath = ('//td[contains(text(),"' . $text . '")]/ancestor::tr[contains(@class, "row")]//a[contains(@href,"delete")]');
        try {
            $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($xpath));
            foreach ($deleteButtons as $deleteButton) {
                $deleteButton->click();
                sleep(1);
                $deleteButton->click();
            }
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            echo('Not found row with text=' . $text . ' on this page in clickDeleteButtonOnRowWithText' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Click on add new button by href
     *
     * @param string $href
     */
    protected function clickButtonByHref(string $href): void
    {
        self::annotate("Test action: Click button by href=$href");
        try {
            $xpath = "//a[@href = '{$href}']";
            $button_AddNew = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($button_AddNew);
            $actions->perform();
            $button_AddNew->click();
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found button with href=' . $href . ' on this page on clickButtonByHref' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Select tab in tabular menu by anchor
     *
     * @param string $anchor
     */
    protected function changeTabOnCurrentPage(string $anchor): void
    {
        self::annotate("Test action: Change tab with anchor=$anchor");
        try {
            $jsScrollToTop = "document.getElementById('main').scrollIntoView({block: 'start', inline: 'nearest', behavior: 'instant'})";
            self::$driver->executeScript($jsScrollToTop);
            sleep(3); // Give a brief moment for the scroll action to complete

            $xpath = "//div[contains(@class, 'menu')]//a[contains(@data-tab,'{$anchor}')]";
            $tab = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($tab);
            $actions->perform();
            $tab->click();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found tab with anchor=' . $anchor . ' on this page in changeTabOnCurrentPage' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Open additional settings under accordion element
     */
    protected function openAccordionOnThePage(): void
    {
        self::annotate("Test action: Open accordion");
        try {
            $xpath = "//div[contains(@class, 'ui') and contains(@class, 'accordion')]";
            $accordion = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($accordion);
            $actions->perform();
            $accordion->click();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found usual accordion element on this page on openAccordionOnThePage' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . ' on openAccordionOnThePage' . PHP_EOL);
        }
    }

    /**
     * Get ID from hidden input at form
     *
     * @return string
     */
    protected function getCurrentRecordID(): string
    {
        try {
            $xpath = '//input[@name="id" and (@type="hidden")]';
            $input = self::$driver->findElement(WebDriverBy::xpath($xpath));
            return $input->getAttribute('value') ?? 'undefinedInGetCurrentRecordID';
        } catch (NoSuchElementException $e) {
            $this->fail('Not found input with name ID on this page getCurrentRecordID' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Delete all records from table
     *
     * @param string $tableId
     *
     * @return void
     */
    protected function deleteAllRecordsOnTable(string $tableId): void
    {
        self::annotate("Test action: Delete all records on table with id=$tableId");
        $xpath = "//table[@id='{$tableId}']//a[contains(@href,'delete') and not(contains(@class,'disabled'))]";
        $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($xpath));
        while (count($deleteButtons) > 0) {
            try {
                $deleteButton = self::$driver->findElement(WebDriverBy::xpath($xpath));
                $deleteButton->click();
                sleep(1);
                $deleteButton->click();
                $this->waitForAjax();
                unset($deleteButtons[0]);
            } catch (NoSuchElementException $e) {
                break;
            }
        }
    }

    /**
     * Tests element existence on dropdown menu
     *
     * @param string $name element name
     * @param string $value value for search
     *
     * @return bool
     */
    protected function checkIfElementExistOnDropdownMenu(string $name, string $value): bool
    {
        self::annotate("Test action: Trying to click on element with text=$value on menu $name");

        $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]';
        $xpath .= '| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]';
        $elementFound = false;
        try {
            $selectItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $selectItem->click();
            $this->waitForAjax();

            // If search field exists input them before select
            $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]/input[contains(@class,"search")]';
            $xpath .= '| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]/input[contains(@class,"search")]';
            $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            foreach ($inputItems as $inputItem) {
                $actions->moveToElement($inputItem);
                $actions->perform();
                $inputItem->click();
                $inputItem->clear();
                $inputItem->sendKeys($value);
            }

            //Try to find need string with value
            $xpath = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[contains(text(),"' . $value . '")]';
            self::$driver->wait(5, 500)->until(
                WebDriverExpectedCondition::presenceOfElementLocated(
                    WebDriverBy::xpath($xpath)
                )
            );
            $elementFound = true;
            self::annotate("Test action: Element with text=$value was found!");
        } catch (NoSuchElementException $e) {
            self::annotate("Test action: Element with text=$value not found (NoSuchElementException) " . $e->getMessage());
        } catch (Exception $e) {
            self::annotate("Test action: Element with text=$value not found (Code Exception) " . $e->getMessage());
        }
        return $elementFound;
    }

    /**
     * Fills the DataTable search input field and triggers a 'keyup' event to initiate the search.
     *
     * @param string $name The name of the input field.
     * @param string $value The value to set in the input field.
     *
     * @return void
     */
    protected function fillDataTableSearchInput(string $name, string $value): void
    {

        self::annotate("Test action: Fill datatable search input field $name with value=$value");

        // Change the value of the input field
        $this->changeInputField($name, $value);

        // Use JavaScript to trigger a 'keyup' event with keyCode 13 (Enter) on the input element
        // This is needed to initiate the search in the DataTable
        self::$driver->executeScript("$('#{$name}').trigger($.Event('keyup', { keyCode: 13 }));");

        // Wait for any AJAX calls to complete
        $this->waitForAjax();
    }

    /**
     * If input filed with $name exists on the page, it value will be changed on $value
     *
     * @param string $name
     * @param string $value
     * @param bool $skipIfNotExist
     */
    protected function changeInputField(string $name, string $value, bool $skipIfNotExist = false): void
    {
        self::annotate("Test action: Change input field $name with value $value");

        $xpath = '//input[@name="' . $name . '" and (@type="text" or @type="password" or @type="number" or @type="hidden" or @type="search")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $actions = new WebDriverActions(self::$driver);
        foreach ($inputItems as $inputItem) {
            $id = $inputItem->getAttribute('id');
            $type = $inputItem->getAttribute('type');
            if ($type === 'hidden') {
                if (!empty($id)) {
                    self::$driver->executeScript("document.getElementById('{$id}').value={$value}");
                }
            } else {
                $actions->moveToElement($inputItem);
                $actions->perform();
                if (!empty($id)) {
                    self::$driver->executeScript("document.getElementById('{$id}').scrollIntoView({block: 'center'})");
                }
                $inputItem->click();
                $inputItem->clear();
                $inputItem->sendKeys($value);
            }
        }

        if (!$skipIfNotExist && count($inputItems) === 0) {
            $this->fail('Not found input with name ' . $name . ' in changeInputField' . PHP_EOL);
        }
    }
}