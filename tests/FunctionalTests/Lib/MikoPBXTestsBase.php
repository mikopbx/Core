<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\FunctionalTests\Lib;

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\FunctionalTests\Tests\LoginTrait;


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
            $this->fail("Unexpectedly element was found by " .$by. PHP_EOL);
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
        $xpath = '//select[@name="' . $name . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"dropdown")] | //div[@id="' . $name . '" and contains(@class, "ui") and contains(@class ,"dropdown") ]';
        try {
            $selectItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $selectItem->click();
            // Находим строчку с нужной опцией по значению
            $xpath    = '//div[contains(@class, "menu") and contains(@class ,"visible")]/div[@data-value="' . $value . '"]';
            $menuItem = self::$driver->wait()->until(
                \Facebook\WebDriver\WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
            );
            $menuItem->click();
        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            $this->fail('Not found select with name '.$name. PHP_EOL);
        } catch (\Facebook\WebDriver\Exception\TimeoutException $e) {
            $this->fail('Not found menuitem '. $value . PHP_EOL);
        } catch (\Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Assert that menu item selected
     *
     * @param $name  string menu name
     * @param $checkedValue string checked value
     */
    protected function assertMenuItemSelected(string $name, string $checkedValue): void
    {
        $xpath             = '//select[@name="' . $name . '"]/option[@selected="selected"]';
        $selectedExtension = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectedExtension as $element) {
            $currentValue = $element->getAttribute('value');
            $message = "{$name} check failure, because {$checkedValue} != {$currentValue}";
            $this->assertEquals($checkedValue, $currentValue, $message);
        }
    }

    /**
     * Change textarea with name $name value to $value
     *
     * @param string $name
     * @param string $value
     */
    protected function changeTextAreaValue(string $name, string $value): void
    {
        $xpath         = ('//textarea[@name="' . $name . '"]');
        $textAreaItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($textAreaItems as $textAreaItem) {
            $textAreaItem->click();
            $textAreaItem->clear();
            $textAreaItem->sendKeys($value);
        }
    }

    /**
     * Assert that textArea value is equal
     *
     * @param string $name  textArea name
     * @param string $checkedValue checked value
     */
    protected function assertTextAreaValueIsEqual(string $name, string $checkedValue): void
    {
        $xpath        = '//textarea[@name="' . $name . '"]';
        $textAreaItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
        if ($textAreaItem) {
            $currentValue = $textAreaItem->getAttribute('value');
            $message = "{$name} check failure, because {$checkedValue} != {$currentValue}";
            $this->assertEquals($checkedValue, $currentValue, $message);
        }
    }


    /**
     * If file filed with $name exists on the page, it value will be changed on $value
     *
     * @param string $name
     * @param string $value
     */
    protected function changeFileField(string $name, string $value): void
    {
        $xpath      = '//input[@name="' . $name . '" and (@type = "file")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItems as $inputItem) {
            $inputItem->sendKeys($value);
        }
    }

    /**
     * If input filed with $name exists on the page, it value will be changed on $value
     *
     * @param string $name
     * @param string $value
     */
    protected function changeInputField(string $name, string $value): void
    {
        $xpath      = '//input[@name="' . $name . '" and (@type="text" or @type="password" or @type="hidden" or @type="number")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItems as $inputItem) {
            $inputItem->click();
            $inputItem->clear();
            $inputItem->sendKeys($value);
        }
    }

    /**
     * Assert that input field with name $name value is equal to $checkedValue
     *
     * @param string $name
     * @param string $checkedValue
     */
    protected function assertInputFieldValueEqual(string $name, string $checkedValue): void
    {
        $xpath      = '//input[@name="' . $name . '" and (@type="text" or @type="password" or @type="hidden")]';
        $inputItems = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItems as $inputItem) {
            $currentValue = $inputItem->getAttribute('value');
            $message = "{$name} check failure, because {$checkedValue} != {$currentValue}";
            $this->assertEquals($checkedValue, $currentValue, $message);
        }
    }

    /**
     * Change checkbox state according the $enabled value if checkbox with the $name exist on the page
     *
     * @param string $name
     * @param bool   $enabled
     */
    protected function changeCheckBoxState(string $name, bool $enabled): void
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
                $checkBoxItem->click();
            }
        }
    }

    /**
     * Assert that checkBox state is equal to the $enabled if checkbox with the $name exist on the page
     *
     * @param string $name    checkBox name
     * @param bool   $enabled checked state
     */
    protected function assertCheckBoxStageIsEqual(string $name, bool $enabled): void
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
            if ($button_Submit) {
                $button_Submit->click();
                self::$driver->wait(10, 500)->until(
                    function ($driver) use ($xpath) {
                        $button_Submit = $driver->findElement(WebDriverBy::xpath($xpath));

                        return $button_Submit->isEnabled();
                    }
                );
            }
        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            $this->fail('Not found submit button on this page' . PHP_EOL);
        } catch (\Facebook\WebDriver\Exception\TimeoutException $e) {
            $this->fail('Form doesn\'t send after 10 seconds timeout' . PHP_EOL);
        } catch (\Exception $e) {
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
            $sidebarItem->click();
            self::$driver->wait(3);
        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            $this->fail('Not found sidebar item with href=' . $href . ' on this page' . PHP_EOL);
        } catch (\Exception $e) {
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
            $tableButtonModify->click();
        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            $this->fail('Not found row with text=' . $text . ' on this page' . PHP_EOL);
        } catch (\Exception $e) {
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
            $tableButtonModify = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $tableButtonModify->click();
            sleep(2);
            $tableButtonModify->click();

        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            echo('Not found row with text=' . $text . ' on this page' . PHP_EOL);
        } catch (\Exception $e) {
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
            $button_AddNew->click();
        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            $this->fail('Not found button with href=' . $href . ' on this page' . PHP_EOL);
        } catch (\Exception $e) {
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
            $xpath         = "//div[contains(@class, 'tabular') and contains(@class, 'menu')]//a[contains(@data-tab,'{$anchor}')]";
            $tab = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $tab->click();
        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            $this->fail('Not found tab with anchor=' . $anchor . ' on this page' . PHP_EOL);
        } catch (\Exception $e) {
            $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
        }
    }

    /**
     * Open additional settings under accordion element
     */
    protected function openAccordionOnThePage(): void
    {
          try {
              $xpath         = "//div[contains(@class, 'ui') and contains(@class, 'accordion')]";
              $tab = self::$driver->findElement(WebDriverBy::xpath($xpath));
              $tab->click();
          } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
              $this->fail('Not found usual accordion element on this page' . PHP_EOL);
          } catch (\Exception $e) {
              $this->fail('Unknown error ' . $e->getMessage() . PHP_EOL);
          }
    }

}
