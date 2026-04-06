<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Tests\Traits;

use Facebook\WebDriver\WebDriverBy;

trait TabNavigationTrait
{
    protected function navigateToTab(string $identifier): void
    {
        $xpath = "//div[@id='general-settings-menu']//ancestor::a[@data-tab='{$identifier}']";
        $selectedTab = $this->waitForElement($xpath);
        $this->scrollIntoView($selectedTab);
        $tab = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $tab->click();
    }

    protected function findElementTab(string $elementName): ?string
    {
        $xpathPatterns = [
            'input' => '//input[@name="%s"]',
            'textarea' => '//textarea[@name="%s"]',
            'select' => '//select[@name="%s"]'
        ];

        foreach ($xpathPatterns as $xpath) {
            $xpath = sprintf($xpath, $elementName) . '/ancestor::div[contains(@class, "ui") and contains(@class ,"tab")]';
            $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));

            if (!empty($elements)) {
                return $elements[0]->getAttribute('data-tab');
            }
        }

        return null;
    }
}