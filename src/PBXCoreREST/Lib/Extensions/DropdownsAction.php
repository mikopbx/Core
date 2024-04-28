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
use Phalcon\Text;

/**
 * Class Dropdowns
 * Provides methods to generate select lists of extensions for different purposes.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class DropdownsAction extends \Phalcon\Di\Injectable
{

    /**
     * Generate a select list of extensions based on the given type.
     *
     * @param string $type {all, routing, phones, internal} - The type of extensions to fetch.
     * @return PBXApiResult The result containing the select list of extensions.
     */
    public static function getForSelect(string $type = 'all'): PBXApiResult
    {
        // Initialize the result object
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        // Determine the query conditions based on the type
        $parameters = self::getQueryParametersByType($type);

        // Fetch extensions based on the query parameters
        $extensions = Extensions::find($parameters);

        // Process fetched extensions
        foreach ($extensions as $record) {
             $extensionData = self::processExtension($record);
             if ($extensionData!==[]){
                 $res->data[]=$extensionData;
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
     * @return array - Query parameters.
     */
    private static function getQueryParametersByType(string $type): array
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
        $type = ($record->userid > 0) ? ' USER' : $record->type??'';
        $type = Text::underscore(strtoupper($type));

        if ($type === Extensions::TYPE_MODULES) {
            // Check if the extension belongs to a module and if the module is disabled
            $module = self::findModuleByExtensionNumber($record->number??'');
            if ($module === null || $module->disabled === '1') {
                return []; // Skip disabled modules
            }
        }

        $represent = $record->getRepresent();
        $clearedRepresent = strip_tags($represent);

        // Create a result entry for the extension
        return [
            'name' => $represent,
            'value' => $record->number,
            'type' => $type,
            'typeLocalized' => Util::translate("ex_dropdownCategory_{$type}"),
            'sorter' => ($record->userid > 0) ?
                "{$type}{$clearedRepresent}{$record->number}" :
                "{$type}{$clearedRepresent}",
        ];
    }

    /**
     * Tries to find a module by extension number.
     *
     * @param string $number - The extension number.
     *
     * @return mixed|null The module object if found, null otherwise.
     */
    private static function findModuleByExtensionNumber(string $number)
    {
        $result = null;
        $extension = Extensions::findFirst("number ='{$number}'");
        $relatedLinks = $extension->getRelatedLinks();
        $moduleUniqueID = false;

        // Iterate through the related links to find the module
        foreach ($relatedLinks as $relation) {
            $obj = $relation['object'];

            // Check if the related object belongs to a module
            if (strpos(get_class($obj), 'Modules\\') === 0) {
                $moduleUniqueID = explode('Models\\', get_class($obj))[1];
            }
        }

        // If a module unique ID is found, retrieve the corresponding module object
        if ($moduleUniqueID) {
            $result = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);
        }

        return $result;
    }

    /**
     * Sorts the extensions array.
     *
     * @param array $a - The first element to compare.
     * @param array $b - The second element to compare.
     *
     * @return int - Returns a negative, zero, or positive integer based on the comparison result.
     */
    private static function sortExtensionsArray($a, $b): int
    {
        return strcmp($a['sorter'], $b['sorter']);
    }

}