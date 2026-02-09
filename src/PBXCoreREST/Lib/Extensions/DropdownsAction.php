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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Library\Text;
use Phalcon\Di\Injectable;

/**
 * Class Dropdowns
 * Provides methods to generate select lists of extensions for different purposes.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class DropdownsAction extends Injectable
{
    /**
     * Generate a select list of extensions based on the given type.
     *
     * @param string $type {all, routing, phones, internal} - The type of extensions to fetch.
     * @param string $query Optional search query for filtering extensions.
     * @param string $exclude Optional comma-separated list of extensions to exclude.
     * @return PBXApiResult The result containing the select list of extensions.
     */
    public static function getForSelect(string $type = 'all', string $query = '', string $exclude = ''): PBXApiResult
    {
        // Initialize the result object
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        // Determine the query conditions based on the type
        $parameters = self::getQueryParametersByType($type, $exclude);

        // Fetch extensions based on the query parameters
        $extensions = Extensions::find($parameters);

        // Process fetched extensions and apply search filter
        foreach ($extensions as $record) {
            $extensionData = self::processExtension($record);
            if ($extensionData !== [] && self::matchesSearchQuery($extensionData, $query)) {
                $res->data[] = $extensionData;
            }
        }

        // Sort the results based on the sorter value
        usort(
            $res->data,
            [__CLASS__, 'sortExtensionsArray']
        );

        // Delete sorter column
        foreach ($res->data as &$subArray) {
            if (array_key_exists('sorter', $subArray)) {
                unset($subArray['sorter']);
            }
        }

        return $res;
    }

    /**
     * Generate query parameters based on the extension type.
     *
     * @param string $type - The type of extensions.
     * @param string $exclude - Comma-separated list of extensions to exclude.
     * @return array - Query parameters.
     */
    private static function getQueryParametersByType(string $type, string $exclude = ''): array
    {
        // Initialize default query conditions
        $parameters = [
            'conditions' => 'show_in_phonebook="1"',
        ];

        // Define specific query conditions based on the type
        switch ($type) {
            case 'all':
                $parameters['conditions'] .= ' AND number NOT IN ({exclude:array})';
                $parameters['bind'] = [
                    'exclude' => ['did2user'],
                ];
                break;
            case 'phones':
            case 'phone':
                $parameters['conditions'] .= ' AND type IN ({ids:array})';
                $parameters['bind']['ids'] = [
                    Extensions::TYPE_SIP,
                    Extensions::TYPE_EXTERNAL
                ];
                break;
            case 'internal':
                $parameters['conditions'] .= ' AND type IN ({ids:array})';
                $parameters['bind']['ids'] = [
                    Extensions::TYPE_SIP
                ];
                break;
            case 'routing':
                $parameters['conditions'] .= ' AND type IN ({ids:array})';
                $parameters['bind']['ids'] = [
                    Extensions::TYPE_SIP,
                    Extensions::TYPE_EXTERNAL,
                    Extensions::TYPE_MODULES,
                    Extensions::TYPE_CONFERENCE,
                    Extensions::TYPE_DIALPLAN_APPLICATION,
                    Extensions::TYPE_IVR_MENU,
                    Extensions::TYPE_QUEUE,
                    Extensions::TYPE_SYSTEM,
                    // Extensions::TYPE_PARKING,
                ];
                break;
        }

        // Add custom exclusion list if provided
        if (!empty($exclude)) {
            $excludeArray = array_map('trim', explode(',', $exclude));
            $excludeArray = array_filter($excludeArray); // Remove empty strings
            
            if (!empty($excludeArray)) {
                $parameters['conditions'] .= ' AND number NOT IN ({customExclude:array})';
                
                if (!isset($parameters['bind'])) {
                    $parameters['bind'] = [];
                }
                
                // Merge with existing exclude array if present
                if (isset($parameters['bind']['exclude'])) {
                    $excludeArray = array_merge($parameters['bind']['exclude'], $excludeArray);
                }
                
                $parameters['bind']['customExclude'] = $excludeArray;
            }
        }

        return $parameters;
    }

    /**
     * Process a fetched extension record to generate result entry.
     *
     * @param Extensions $record - The extension record.
     * @return array - Result entry for the extension.
     */
    private static function processExtension(Extensions $record): array
    {
        $type = ($record->userid > 0) ? ' USER' : $record->type ?? '';
        $type = Text::underscore(strtoupper($type));

        if ($type === Extensions::TYPE_MODULES) {
            // Check if the extension belongs to a module and if the module is disabled
            $module = self::findModuleByExtensionNumber($record->number ?? '');
            if ($module === null || $module->disabled === '1') {
                return []; // Skip disabled modules
            }
        }

        $represent = $record->getRepresent();
        $clearedRepresent = strip_tags($represent);

        // Create a result entry for the extension
        return [
            'name' => $represent,
            'text' => $represent, // Add text field for Fomantic UI compatibility
            'value' => $record->number,
            'type' => $type,
            'typeLocalized' => Util::translate("ex_dropdownCategory_$type"),
            'sorter' => ($record->userid > 0) ?
                "$type$clearedRepresent$record->number" :
                "$type$clearedRepresent",
        ];
    }

    /**
     * Tries to find a module by extension number.
     *
     * @param string $number - The extension number.
     *
     * @return mixed|null The module object if found, null otherwise.
     */
    private static function findModuleByExtensionNumber(string $number): mixed
    {
        $result = null;
        $extension = Extensions::findFirst("number ='$number'");
        $relatedLinks = $extension->getRelatedLinks();
        $moduleUniqueID = false;

        // Iterate through the related links to find the module
        foreach ($relatedLinks as $relation) {
            $obj = $relation['object'];

            // Check if the related object belongs to a module
            $className = get_class($obj);
            [$param1,$moduleUniqueID,$param2] = explode('\\', $className);
            $idFound = ('Modules' === $param1 && $param2 === 'Models');

            if ( !$idFound && strpos($className, 'Modules\\') === 0) {
                $moduleUniqueID = explode('Models\\', $className)[1];
            }
        }

        // If a module unique ID is found, retrieve the corresponding module object
        if ($moduleUniqueID) {
            $result = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);
        }

        return $result;
    }

    /**
     * Check if extension data matches the search query.
     * Searches in name (represent text), number, and cleaned represent text.
     *
     * @param array $extensionData - Extension data to check.
     * @param string $query - Search query.
     * @return bool - True if matches, false otherwise.
     */
    private static function matchesSearchQuery(array $extensionData, string $query): bool
    {
        // If no search query, return true (match all)
        if (empty($query)) {
            return true;
        }

        $query = trim($query);

        // Search in extension number
        if (mb_stripos($extensionData['value'], $query) !== false) {
            return true;
        }

        // Search in name/represent text (with HTML tags)
        if (mb_stripos($extensionData['name'], $query) !== false) {
            return true;
        }

        // Search in cleaned name (without HTML tags) - this helps find content inside <> brackets
        $cleanedName = strip_tags($extensionData['name']);
        if (mb_stripos($cleanedName, $query) !== false) {
            return true;
        }

        return false;
    }

    /**
     * Sorts the extensions array.
     *
     * @param array $a - The first element to compare.
     * @param array $b - The second element to compare.
     *
     * @return int - Returns a negative, zero, or positive integer based on the comparison result.
     */
    private static function sortExtensionsArray(array $a, array $b): int
    {
        return strcmp($a['sorter'], $b['sorter']);
    }
}
