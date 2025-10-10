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

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\Exception\NoSuchElementException;

/**
 * Trait TableSearchTrait
 * Provides methods for searching in DataTables with pagination support
 */
trait TableSearchTrait
{
    /**
     * Search for an entity in a DataTable by name using the search input
     *
     * Supports two types of search:
     * 1. Custom search input (#global-search) - for Extensions, CustomFiles
     * 2. DataTable built-in search (.dataTables_filter input) - for Providers, IvrMenu, ApiKeys, etc.
     *
     * @param string $sectionUrl URL of the section (e.g., '/admin-cabinet/extensions/index/')
     * @param string $searchQuery Text to search for
     * @param string|null $searchInputId ID of the search input field (default: 'global-search')
     *                                   Use null for DataTable built-in search
     * @return bool True if entity found, false otherwise
     */
    protected function searchEntityInTable(
        string $sectionUrl,
        string $searchQuery,
        ?string $searchInputId = 'global-search'
    ): bool {
        try {
            // Navigate to the section
            $this->clickSidebarMenuItemByHref($sectionUrl);
            $this->waitForAjax();

            // Wait for the table to load
            sleep(2);

            $searchInput = null;

            // Try to find the search input
            if ($searchInputId !== null) {
                // Try custom search input first (e.g., #global-search)
                try {
                    $searchInput = self::$driver->findElement(WebDriverBy::id($searchInputId));
                    self::annotate("Using custom search input: #{$searchInputId}");
                } catch (NoSuchElementException $e) {
                    self::annotate("Custom search input #{$searchInputId} not found, trying DataTable search");
                }
            }

            // If custom search not found, try DataTable built-in search
            if ($searchInput === null) {
                try {
                    // DataTable creates a search input with class 'dataTables_filter'
                    $searchInput = self::$driver->findElement(
                        WebDriverBy::cssSelector('.dataTables_filter input[type="search"]')
                    );
                    self::annotate("Using DataTable built-in search input");
                } catch (NoSuchElementException $e) {
                    self::annotate("No search input found (neither custom nor DataTable), searching static table");
                }
            }

            // If search input is available, use it to filter the table
            if ($searchInput !== null) {
                // Clear and fill the search input
                $searchInput->clear();
                sleep(1); // Small delay to ensure clear is processed
                $searchInput->sendKeys($searchQuery);

                // Wait for search to process (DataTable triggers on keyup)
                sleep(2);
                $this->waitForAjax();
            }

            // Check if any rows are visible in the table
            // Try to find the text in the table body
            $tableBody = self::$driver->findElements(WebDriverBy::xpath("//table//tbody"));
            if (empty($tableBody)) {
                self::annotate("Table body not found for search query: {$searchQuery}");
                return false;
            }

            // Look for the search query text in the table
            // Use case-insensitive search with translate() to handle different cases
            $xpath = "//table//tbody//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '"
                   . strtolower($searchQuery) . "')]";
            $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));

            $found = count($elements) > 0;

            if ($found) {
                self::annotate("Entity '{$searchQuery}' found in table at {$sectionUrl}");
            } else {
                self::annotate("Entity '{$searchQuery}' NOT found in table at {$sectionUrl}");
            }

            return $found;

        } catch (\Exception $e) {
            self::annotate("Error searching for '{$searchQuery}' in {$sectionUrl}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if an extension exists by searching for it in the extensions table
     *
     * @param string $extensionName Extension name to search for (e.g., 'Smith James')
     * @return bool True if extension exists, false otherwise
     */
    protected function extensionExistsBySearch(string $extensionName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/extensions/index/',
            $extensionName
        );
    }

    /**
     * Check if a SIP provider exists by searching for it in the providers table
     * Note: Providers table uses DataTable built-in search (no custom search input)
     *
     * @param string $providerName Provider name to search for
     * @return bool True if provider exists, false otherwise
     */
    protected function providerExistsBySearch(string $providerName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/providers/index/',
            $providerName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if an incoming route exists by searching for it
     * Note: Incoming routes table uses DataTable built-in search
     *
     * @param string $routeName Route name to search for
     * @return bool True if route exists, false otherwise
     */
    protected function incomingRouteExistsBySearch(string $routeName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/incoming-routes/index/',
            $routeName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if an outgoing route exists by searching for it
     * Note: Outgoing routes table uses DataTable built-in search
     *
     * @param string $routeName Route name to search for
     * @return bool True if route exists, false otherwise
     */
    protected function outgoingRouteExistsBySearch(string $routeName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/outbound-routes/index/',
            $routeName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if a call queue exists by searching for it
     * Note: Call queues table uses DataTable built-in search
     *
     * @param string $queueName Queue name to search for
     * @return bool True if queue exists, false otherwise
     */
    protected function callQueueExistsBySearch(string $queueName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/call-queues/index/',
            $queueName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if an IVR menu exists by searching for it
     * Note: IVR menu table uses DataTable built-in search
     *
     * @param string $ivrName IVR menu name to search for
     * @return bool True if IVR exists, false otherwise
     */
    protected function ivrMenuExistsBySearch(string $ivrName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/ivr-menu/index/',
            $ivrName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if a conference room exists by searching for it
     * Note: Conference rooms table uses DataTable built-in search
     *
     * @param string $conferenceName Conference name to search for
     * @return bool True if conference exists, false otherwise
     */
    protected function conferenceRoomExistsBySearch(string $conferenceName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/conference-rooms/index/',
            $conferenceName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if a dialplan application exists by searching for it
     * Note: Dialplan applications table uses DataTable built-in search
     *
     * @param string $applicationName Application name to search for
     * @return bool True if application exists, false otherwise
     */
    protected function dialplanApplicationExistsBySearch(string $applicationName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/dialplan-applications/index/',
            $applicationName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if a firewall rule exists by searching for it
     * Note: Firewall table uses DataTable built-in search
     *
     * @param string $ruleName Rule name to search for
     * @return bool True if rule exists, false otherwise
     */
    protected function firewallRuleExistsBySearch(string $ruleName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/firewall/index/',
            $ruleName,
            null // Use DataTable built-in search
        );
    }

    /**
     * Check if a custom file exists by searching for it
     * Note: Custom files table uses custom search input (#global-search)
     *
     * @param string $filePath File path to search for
     * @return bool True if file exists, false otherwise
     */
    protected function customFileExistsBySearch(string $filePath): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/custom-files/index/',
            $filePath,
            'global-search' // Use custom search input
        );
    }

    /**
     * Check if an API key exists by searching for it
     * Note: API keys table uses DataTable built-in search
     *
     * @param string $keyName API key name to search for
     * @return bool True if API key exists, false otherwise
     */
    protected function apiKeyExistsBySearch(string $keyName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/api-keys/index/',
            $keyName,
            null // Use DataTable built-in search
        );
    }


    /**
     * Check if an sound file exists by searching for it in the extensions table
     *
     * @param string $soundFileName Sound file name to search for (e.g., 'Smith James')
     * @return bool True if sound file exists, false otherwise
     */
    protected function soundFileExistsBySearch(string $soundFileName): bool
    {
        return $this->searchEntityInTable(
            '/admin-cabinet/sound-files/index/',
            $soundFileName
        );
    }
}
