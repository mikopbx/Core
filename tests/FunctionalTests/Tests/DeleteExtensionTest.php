<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\FunctionalTests\Tests;

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase;


class DeleteExtensionTest extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params;
     */
    public function testDeleteExtension($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $elementID = $input_ExtensionUniqueID->getAttribute('value');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickDeleteButtonOnRowWithText($params['username']);
        $this->waitForAjax();

        // Try to find element with ID on page

        $xpath                   = "//table[@id='extensions-table']//tr[@id='{$elementID}']";
        $els = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if ($params['possibleToDelete']){
            if (count($els)>0){
                $this->fail("Unexpectedly element was found by " . $xpath . PHP_EOL);
            }
        } else {
            if (count($els) === 0){
                $this->fail("Unexpectedly element was not found by " . $xpath . PHP_EOL);
            }
            // Check warning message on page top
            $xpath                   = "//div[contains(@class,'message') and contains(@class,'negative')]";
            $errorMessage = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertTrue($errorMessage->isDisplayed());
        }

        // increment assertion counter
        $this->assertTrue(true);
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'username'   => 'Alexandra Pushina',
                'possibleToDelete'=>true
            ]];
        $params[] = [
            [
                'username'   => 'Smith James',
                'possibleToDelete'=>false
            ]];
        return $params;
    }
}
