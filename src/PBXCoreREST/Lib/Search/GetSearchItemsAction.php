<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Search;

use MikoPBX\Common\Models\{
    AsteriskManagerUsers,
    CallQueues,
    ConferenceRooms,
    CustomFiles,
    DialplanApplications,
    IvrMenu,
    NetworkFilters,
    OutWorkTimes,
    PbxExtensionModules,
    Providers,
    Users
};
use MikoPBX\Common\Library\Text;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use Phalcon\Translate\Adapter\NativeArray;

/**
 * Get searchable items for global search.
 *
 * Returns a list of searchable items including:
 * - Database entities (users, providers, queues, etc.)
 * - Static menu pages (settings, network, etc.)
 *
 * Supports filtering by search query parameter.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Search
 */
class GetSearchItemsAction extends Injectable
{
    /**
     * Get searchable items with optional filtering
     *
     * @param array $data Request data with optional 'query' parameter
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $di = Di::getDefault();

        // Get search query (optional)
        $query = $data['query'] ?? '';

        // Get translation service
        $translation = $di->getShared('translation');

        $results = [];

        // If query is empty, show only menu sections (like main menu)
        // If query is provided, search in all entities + menu items
        if (empty(trim($query))) {
            // Empty query - show only main menu sections
            self::addOtherMenuItems($results, $translation, $query);
        } else {
            // Query provided - search in all database entities
            $arrClasses = [
                Users::class,
                Providers::class,
                CallQueues::class,
                IvrMenu::class,
                PbxExtensionModules::class,
                ConferenceRooms::class,
                DialplanApplications::class,
                NetworkFilters::class,
                OutWorkTimes::class,
                AsteriskManagerUsers::class,
                CustomFiles::class,
            ];

            $categoryResults = [[]];

            // Fetch items from each model class
            foreach ($arrClasses as $itemClass) {
                $records = call_user_func([$itemClass, 'find']);
                $categoryItems = [];

                foreach ($records as $record) {
                    self::addMenuItem($categoryItems, $record, $itemClass, $translation, $query);
                }

                usort($categoryItems, [self::class, 'sortItemsArray']);
                $categoryResults[] = $categoryItems;
            }

            $results = array_merge(...$categoryResults);

            // Add static menu items (filtered by query)
            self::addOtherMenuItems($results, $translation, $query);
        }

        $res->data = $results;
        return $res;
    }

    /**
     * Add a menu item from a model record if it matches the search query
     *
     * @param array $items Reference to items array
     * @param object $record Model record
     * @param string $itemClass Model class name
     * @param NativeArray $translation Translation service
     * @param string $query Search query to filter by
     * @return void
     */
    private static function addMenuItem(array &$items, object $record, string $itemClass, NativeArray $translation, string $query = ''): void
    {
        $link = $record->getWebInterfaceLink();
        if ($link === '#') {
            return;
        }

        $category = explode('\\', $itemClass)[3];
        $type = Text::underscore(strtoupper($category));
        $represent = $record->getRepresent();
        // Remove only HTML tags (starting with letter), preserve angle brackets with numbers like <123>
        // This fixes issue where extension numbers in angle brackets were removed by strip_tags()
        $clearedRepresent = preg_replace('/<\/?[a-zA-Z][^>]*>/i', '', $represent);

        // Filter by search query if provided
        if (!empty($query)) {
            $queryLower = mb_strtolower(trim($query), 'UTF-8');
            $searchText = mb_strtolower($clearedRepresent, 'UTF-8');

            // Check if query matches the representation
            if (mb_strpos($searchText, $queryLower) === false) {
                return;
            }
        }

        $items[] = [
            'name' => $represent,
            'value' => $link,
            'type' => $type,
            'typeLocalized' => $translation->_("ex_dropdownCategory_$type"),
            'sorter' => $clearedRepresent,
        ];
    }

    /**
     * Add static menu items for controllers if they match the search query
     *
     * @param array $items Reference to items array
     * @param NativeArray $translation Translation service
     * @param string $query Search query to filter by
     * @return void
     */
    private static function addOtherMenuItems(array &$items, NativeArray $translation, string $query = ''): void
    {
        $additionalMenuItems = [
            // Main sections - entities
            'ExtensionsController' => ['action' => 'index', 'icon' => 'phone'],
            'ProvidersController' => ['action' => 'index', 'icon' => 'server'],
            'CallQueuesController' => ['action' => 'index', 'icon' => 'users'],
            'IvrMenuController' => ['action' => 'index', 'icon' => 'sitemap'],
            'ConferenceRoomsController' => ['action' => 'index', 'icon' => 'phone volume'],
            'DialplanApplicationsController' => ['action' => 'index', 'icon' => 'php'],

            // Routing
            'IncomingRoutesController' => ['action' => 'index', 'icon' => 'phone volume'],
            'OutboundRoutesController' => ['action' => 'index', 'icon' => 'external'],

            // System
            'GeneralSettingsController' => ['action' => 'modify', 'icon' => 'settings'],
            'TimeSettingsController' => ['action' => 'modify', 'icon' => 'time'],
            'NetworkController' => ['action' => 'modify', 'icon' => 'sitemap'],
            'MailSettingsController' => ['action' => 'modify', 'icon' => 'envelope'],
            'FirewallController' => ['action' => 'index', 'icon' => 'fire'],
            'Fail2BanController' => ['action' => 'index', 'icon' => 'shield'],

            // Monitoring & Management
            'CallDetailRecordsController' => ['action' => 'index', 'icon' => 'list alternate outline'],
            'SystemDiagnosticController' => ['action' => 'index', 'icon' => 'stethoscope'],

            // Files & Resources
            'SoundFilesController' => ['action' => 'index', 'icon' => 'file audio'],
            'CustomFilesController' => ['action' => 'index', 'icon' => 'file code'],

            // Modules & Extensions
            'PbxExtensionModulesController' => ['action' => 'index', 'icon' => 'puzzle piece'],

            // Advanced
            'AsteriskManagersController' => ['action' => 'index', 'icon' => 'asterisk'],
            'ApiKeysController' => ['action' => 'index', 'icon' => 'key'],
            'OffWorkTimesController' => ['action' => 'index', 'icon' => 'calendar times'],

            // Maintenance
            'UpdateController' => ['action' => 'index', 'icon' => 'cloud download'],
        ];

        foreach ($additionalMenuItems as $controllerName => $config) {
            // Remove "Controller" suffix
            $controllerName = str_replace('Controller', '', $controllerName);
            $unCamelizedControllerName = Text::uncamelize($controllerName, '-');
            $translatedControllerName = $translation->_('mm_' . $controllerName);

            // Filter by search query if provided
            if (!empty($query)) {
                $queryLower = mb_strtolower(trim($query), 'UTF-8');
                // Use regex to remove HTML tags while preserving angle brackets with numbers
                $searchText = mb_strtolower(preg_replace('/<\/?[a-zA-Z][^>]*>/i', '', $translatedControllerName), 'UTF-8');

                if (mb_strpos($searchText, $queryLower) === false) {
                    continue;
                }
            }

            // Generate URL - prepend /admin-cabinet/
            $url = '/admin-cabinet/' . $unCamelizedControllerName . '/' . $config['action'];

            $items[] = [
                'name' => '<i class="' . $config['icon'] . ' icon"></i> ' . $translatedControllerName,
                'value' => $url,
                'type' => 'MENUITEMS',
                'typeLocalized' => $translation->_('ex_dropdownCategory_MENUITEMS'),
                // Use regex to remove HTML tags while preserving angle brackets with numbers
                'sorter' => preg_replace('/<\/?[a-zA-Z][^>]*>/i', '', $translatedControllerName),
            ];
        }
    }

    /**
     * Sort items by their sorter field
     *
     * @param array $a First item
     * @param array $b Second item
     * @return int
     */
    private static function sortItemsArray(array $a, array $b): int
    {
        return strcmp($a['sorter'], $b['sorter']);
    }
}
