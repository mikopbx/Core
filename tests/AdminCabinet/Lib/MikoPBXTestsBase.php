<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use Facebook\WebDriver\WebDriverExpectedCondition;
use MikoPBX\Tests\AdminCabinet\Tests\LoginTrait;


class MikoPBXTestsBase extends BrowserStackTest
{
    use  LoginTrait;

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
     * Select dropdown menu item
     *
     * @param $name  string menu name identifier
     * @param $value string menu value for select
     *
     */
    protected function selectDropdownItem(string $name, string $value): void
    {
        // Check selected value
        $xpath             = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $selectedExtensions = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectedExtensions as $element) {
            $currentValue = $element->getAttribute('value');
            if ($currentValue === $value){
                return;
            }
        }

        $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]';
        $xpath .='| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]';
        try {
            $selectItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $selectItem->click();
            $this->waitForAjax();

            // If search field exists input them before select
            $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]/input[contains(@class,"search")]';
            $xpath .='| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]/input[contains(@class,"search")]';
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
            $xpath    = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[@data-value="' . $value . '"]';
            $menuItem = self::$driver->wait()->until(
                WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
            );
            $menuItem->click();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found select with name ' . $name . 'on selectDropdownItem'. PHP_EOL);
        } catch (TimeoutException $e) {
            $this->fail('Not found menuitem ' . $value . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
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
        // Check selected value
        $xpath             = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $selectedExtensions = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectedExtensions as $element) {
            $currentValue = $element->getText();
            if ($currentValue === $value){
                return $element->getAttribute('value');
            }
        }

        $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]';
        $xpath .='| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]';
        try {
            $selectItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $selectItem->click();
            $this->waitForAjax();

            // If search field exists input them before select
            $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]/input[contains(@class,"search")]';
            $xpath .='| //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]/input[contains(@class,"search")]';
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
            $xpath    = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[contains(text(),"'.$value.'")]';
            $menuItem = self::$driver->wait()->until(
                WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
            );
            $menuItem->click();
            return $menuItem->getAttribute('data-value');
        } catch (NoSuchElementException $e) {
            $this->fail('Not found select with name ' . $name . 'on selectDropdownItem'. PHP_EOL);
        } catch (TimeoutException $e) {
            $this->fail('Not found menuitem ' . $value . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Wait until jquery will be ready
     */
    protected function waitForAjax(): void
    {
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
     * Assert that menu item selected
     *
     * @param      $name         string menu name
     * @param      $checkedValue string checked value
     * @param bool $skipIfNotExist
     */
    protected function assertMenuItemSelected(string $name, string $checkedValue, $skipIfNotExist=false): void
    {
        $xpath             = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        if ($checkedValue==='none' and $name!=='registration_type'){
            $this->assertElementNotFound(WebDriverBy::xpath($xpath));
        } else {
            $selectedExtensions = self::$driver->findElements(WebDriverBy::xpath($xpath));
            foreach ($selectedExtensions as $element) {
                $currentValue = $element->getAttribute('value');
                $message      = "{$name} check failure, because {$checkedValue} != {$currentValue}";
                $this->assertEquals($checkedValue, $currentValue, $message);
            }
            if (!$skipIfNotExist && count($selectedExtensions)===0){
                $this->fail('Not found select with name ' . $name .' in assertMenuItemSelected'. PHP_EOL);
            }
        }
    }

    /**
     * Assert that menu item not selected
     *
     * @param      $name         string menu name
     */
    protected function assertMenuItemNotSelected(string $name): void
    {
        $xpath             = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $this->assertElementNotFound(WebDriverBy::xpath($xpath));

    }

    /**
     * Change textarea with name $name value to $value
     *
     * @param string $name
     * @param string $value
     * @param bool   $skipIfNotExist
     */
    protected function changeTextAreaValue(string $name, string $value, bool $skipIfNotExist=false): void
    {
        $xpath         = ('//textarea[@name="' . $name . '"]');
        $textAreaItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $actions = new WebDriverActions(self::$driver);
        foreach ($textAreaItems as $textAreaItem) {
            $actions->moveToElement($textAreaItem);
            $actions->perform();
            $textAreaItem->click();
            $textAreaItem->clear();
            $textAreaItem->sendKeys($value);
        }
        if (!$skipIfNotExist && count($textAreaItems)===0){
            $this->fail('Not found textarea with name ' . $name .' in changeTextAreaValue'. PHP_EOL);
        }
    }

    /**
     * Assert that textArea value is equal
     *
     * @param string $name         textArea name
     * @param string $checkedValue checked value
     */
    protected function assertTextAreaValueIsEqual(string $name, string $checkedValue): void
    {
        $xpath        = '//textarea[@name="' . $name . '"]';
        $textAreaItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $currentValue = $textAreaItem->getAttribute('value');
        $message      = "{$name} check failure, because {$checkedValue} != {$currentValue}";
        $this->assertEquals($checkedValue, $currentValue, $message);
    }

    /**
     * If file filed with $name exists on the page, it value will be changed on $value
     *
     * @param string $name
     * @param string $value
     * @param bool   $skipIfNotExist
     */
    protected function changeFileField(string $name, string $value, bool $skipIfNotExist=false): void
    {
        $xpath      = '//input[@name="' . $name . '" and (@type = "file")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItems as $inputItem) {
            $inputItem->sendKeys($value);
        }
        if (!$skipIfNotExist && count($inputItems)===0){
            $this->fail('Not found input with type FILE and with name ' . $name .' in changeFileField'. PHP_EOL);
        }
    }

    /**
     * If input filed with $name exists on the page, it value will be changed on $value
     *
     * @param string $name
     * @param string $value
     * @param bool   $skipIfNotExist
     */
    protected function changeInputField(string $name, string $value, bool $skipIfNotExist=false): void
    {
        $xpath      = '//input[@name="' . $name . '" and (@type="text" or @type="password" or @type="hidden" or @type="number")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $actions = new WebDriverActions(self::$driver);
        foreach ($inputItems as $inputItem) {
            $actions->moveToElement($inputItem);
            $actions->perform();
            $id = $inputItem->getAttribute('id');
            if (!empty($id)){
                self::$driver->executeScript("document.getElementById('{$id}').scrollIntoView({block: 'center'})");
            }
            $inputItem->click();
            $inputItem->clear();
            $inputItem->sendKeys($value);
        }
        if (!$skipIfNotExist && count($inputItems)===0){
            $this->fail('Not found input with name ' . $name .' in changeInputField'. PHP_EOL);
        }
    }

    /**
     * Assert that input field with name $name value is equal to $checkedValue
     *
     * @param string $name
     * @param string $checkedValue
     * @param bool   $skipIfNotExist
     */
    protected function assertInputFieldValueEqual(string $name, string $checkedValue, $skipIfNotExist=false): void
    {
        $xpath      = '//input[@name="' . $name . '" and (@type="text" or @type="number" or @type="password" or @type="hidden")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItems as $inputItem) {
            $currentValue = $inputItem->getAttribute('value');
            $message      = "input field: '{$name}' check failure, because {$checkedValue} != {$currentValue}";
            $this->assertEquals($checkedValue, $currentValue, $message);
        }
        if (!$skipIfNotExist && count($inputItems)===0){
            $this->fail('Not found input with name ' . $name .' in assertInputFieldValueEqual'. PHP_EOL);
        }
    }

    /**
     * Change checkbox state according the $enabled value if checkbox with the $name exist on the page
     *
     * @param string $name
     * @param bool   $enabled
     * @param bool   $skipIfNotExist
     */
    protected function changeCheckBoxState(string $name, bool $enabled, $skipIfNotExist=false): void
    {
        $xpath         = '//input[@name="' . $name . '" and @type="checkbox"]';
        $checkBoxItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($checkBoxItems as $checkBoxItem) {
            if (
                ($enabled && ! $checkBoxItem->isSelected())
                ||
                ( ! $enabled && $checkBoxItem->isSelected())
            ) {
                $xpath        = '//input[@name="' . $name . '" and @type="checkbox"]/parent::div';
                $checkBoxItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
                $actions = new WebDriverActions(self::$driver);
                $actions->moveToElement($checkBoxItem);
                $actions->perform();
                $checkBoxItem->click();
            }
        }
        if (!$skipIfNotExist && count($checkBoxItems)===0){
            $this->fail('Not found checkbox with name ' . $name .' in changeCheckBoxState'. PHP_EOL);
        }
    }

    /**
     * Assert that checkBox state is equal to the $enabled if checkbox with the $name exist on the page
     *
     * @param string $name    checkBox name
     * @param bool   $enabled checked state
     * @param bool   $skipIfNotExist
     */
    protected function assertCheckBoxStageIsEqual(string $name, bool $enabled, $skipIfNotExist=false): void
    {
        $xpath         = '//input[@name="' . $name . '" and @type="checkbox"]';
        $checkBoxItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($checkBoxItems as $checkBoxItem) {
            if ($enabled) {
                $this->assertTrue($checkBoxItem->isSelected(), "{$name} must be checked" . PHP_EOL);
            } else {
                $this->assertFalse($checkBoxItem->isSelected(), "{$name} must be unchecked" . PHP_EOL);
            }
        }
        if (!$skipIfNotExist && count($checkBoxItems)===0){
            $this->fail('Not found checkbox with name ' . $name .' in assertCheckBoxStageIsEqual'. PHP_EOL);
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
        try {
            $xpath       = '//div[@id="sidebar-menu"]//ancestor::a[contains(@class, "item") and contains(@href ,"' . $href . '")]';
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
        $xpath = ('//td[contains(text(),"' . $text . '")]/ancestor::tr[contains(@class, "row")]//a[contains(@href,"delete")]');
        try {
            $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($xpath));
            foreach ($deleteButtons as $deleteButton){
                $deleteButton->click();
                sleep(1);
                $deleteButton->click();
            }
            $this->waitForAjax();
        } catch (NoSuchElementException $e) {
            echo('Not found row with text=' . $text . ' on this page in clickDeleteButtonOnRowWithText'. PHP_EOL);
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
        try {
            $xpath         = "//a[@href = '{$href}']";
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
     * @param $anchor
     */
    protected function changeTabOnCurrentPage($anchor): void
    {
        try {
            $xpath = "//div[contains(@class, 'tabular') and contains(@class, 'menu')]//a[contains(@data-tab,'{$anchor}')]";
            $tab   = self::$driver->findElement(WebDriverBy::xpath($xpath));
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
        try {
            $xpath = "//div[contains(@class, 'ui') and contains(@class, 'accordion')]";
            $accordion   = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $actions = new WebDriverActions(self::$driver);
            $actions->moveToElement($accordion);
            $actions->perform();
            $accordion->click();
        } catch (NoSuchElementException $e) {
            $this->fail('Not found usual accordion element on this page on openAccordionOnThePage' . PHP_EOL);
        } catch (Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() .' on openAccordionOnThePage'. PHP_EOL);
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
            return $input->getAttribute('value')??'undefinedInGetCurrentRecordID';
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
        $xpath         = "//table[@id='{$tableId}']//a[contains(@href,'delete') and not(contains(@class,'disabled'))]";
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
    protected function checkIfElementExistOnDropdownMenu(string $name, string $value):bool
    {
        $xpath = '//select[@name="'.$name.'"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]';
        $xpath .='| //div[@id="'.$name.'" and contains(@class, "ui") and contains(@class ,"dropdown") ]';
        $elementFound = false;
        try {
            $selectItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $selectItem->click();
            $this->waitForAjax();

            // If search field exists input them before select
            $xpath = '//select[@name="'.$name.'"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")]/input[contains(@class,"search")]';
            $xpath .='| //div[@id="'.$name.'" and contains(@class, "ui") and contains(@class ,"dropdown") ]/input[contains(@class,"search")]';
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
            $xpath    = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[contains(text(),"'.$value.'")]';
            $menuItem = self::$driver->wait()->until(
                WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
            );
            $menuItem->click();
            $elementFound = true;
        } catch (NoSuchElementException $e) {
            //
        } catch (Exception $e) {
            ///
        }
        return $elementFound;
    }


}
