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

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Text;

/**
 * Handles the GET request for extensions data.
 *
 * @RoutePrefix("/pbxcore/api/extensions")
 *
 * @examples
 * curl http://127.0.0.1/pbxcore/api/extensions/getForSelect?type=all;
 * curl http://127.0.0.1/pbxcore/api/extensions/available?number=225;
 */
class GetController extends BaseController
{

    /**
     * Calls the corresponding action for IAX registrations based on the provided $actionName.
     *
     * @param string $actionName The name of the action.
     *
     * Retrieves the extensions list limited by type parameter.
     * @Get("/getForSelect")
     *
     * Checks the number uniqueness.
     * @Get("/available")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        switch ($actionName) {
            case 'getForSelect':
                $type =  $this->request->get('type');
                $this->getForSelect($type);
                break;
            case 'available':
                $number = $this->request->get('number');
                $this->ifNumberAvailable($number);
                break;
            default:
        }
    }
    /**
     * Used to generate a select list of users from the JavaScript script extensions.js.
     *
     * @param string $type {all, phones, internal} - Display only phones or all possible numbers.
     *
     * @return void
     */
    private function getForSelect(string $type = 'all'): void
    {
        $results = [];
        switch ($type) {
            case 'all':
            {
                // Query conditions to fetch all extensions except 'did2user'
                $parameters = [
                    'conditions' => 'show_in_phonebook="1" AND number NOT IN ({exclude:array})',
                    'bind' => [
                        'exclude' => ['did2user']
                    ]
                ];
                break;
            }
            case 'routing':
            {
                // Query conditions to fetch all extensions
                $parameters = [
                    'conditions' => 'show_in_phonebook="1"',
                ];
                break;
            }
            case 'phones':
            {
                // Query conditions to fetch phone extensions (SIP and external)
                $parameters = [
                    'conditions' => 'type IN ({ids:array}) AND show_in_phonebook="1"',
                    'bind' => [
                        'ids' => [Extensions::TYPE_SIP, Extensions::TYPE_EXTERNAL],
                    ],
                ];
                break;
            }
            case 'internal':
            {
                // Query conditions to fetch only internal extensions (SIP)
                $parameters = [
                    'conditions' => 'type IN ({ids:array}) AND show_in_phonebook="1"',
                    'bind' => [
                        'ids' => [Extensions::TYPE_SIP],
                    ],
                ];
                break;
            }
            default:
            {
                // Default query conditions to fetch all extensions
                $parameters = [
                    'conditions' => 'show_in_phonebook="1"',
                ];
            }
        }

        // Fetch extensions based on the query parameters
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $type = ($record->userid > 0) ? ' USER'
                : $record->type; // Users will be the very first in the list.
            $type = Text::underscore(strtoupper($type));

            if ($type === Extensions::TYPE_MODULES) {
                // Check if the extension belongs to a module and if the module is disabled
                $module = $this->findModuleByExtensionNumber($record->number);
                if ($module === null || $module->disabled === '1') {
                    continue; // Skip disabled modules
                }
            }
            $represent = $record->getRepresent();
            $clearedRepresent = strip_tags($represent);
            // Create a result entry with user's name, number, type, localized type, and sorter value
            $results[] = [
                'name' => $represent,
                'value' => $record->number,
                'type' => $type,
                'typeLocalized' => $this->translation->_("ex_dropdownCategory_{$type}"),
                'sorter' => ($record->userid > 0) ? "{$type}{$clearedRepresent}{$record->number}" : "{$type}{$clearedRepresent}"
            ];
        }

        // Sort the results based on the sorter value
        usort(
            $results,
            [__CLASS__, 'sortExtensionsArray']
        );

        $response =  [
            'result'    => true,
            'data'      => $results,
            'messages'  => [],
            'function'  => __METHOD__,
            'processor' => __CLASS__,
            'pid'       => getmypid(),
        ];
        $this->response->setPayloadSuccess($response);
    }


    /**
     * Tries to find a module by extension number.
     *
     * @param string $number - The extension number.
     *
     * @return mixed|null The module object if found, null otherwise.
     */
    private function findModuleByExtensionNumber(string $number)
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
    private function sortExtensionsArray($a, $b): int
    {
        return strcmp($a['sorter'], $b['sorter']);
    }


    /**
     * Check the availability of a number in the extensions.js JavaScript script.
     *
     * @param string $number - The internal number of the user
     *
     * @return void - The parameters are stored in the view and processed through ControllerBase::afterExecuteRoute()
     */
    private function ifNumberAvailable(string $number): void
    {
        $result = true;
        $userId = 0;
        // Check for overlap with internal number plan
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $result = false;
            $userId = $extension->userid;
        }

        // Check for overlap with parking slots
        if ($result) {
            $parkExt = PbxSettings::getValueByKey('PBXCallParkingExt');
            $parkStartSlot = PbxSettings::getValueByKey('PBXCallParkingStartSlot');
            $parkEndSlot = PbxSettings::getValueByKey('PBXCallParkingEndSlot');
            if ($number === $parkExt || ($number >= $parkStartSlot && $number <= $parkEndSlot)) {
                $result = false;
            }
        }

        $response =  [
            'result'    => $result,
            'data'      => ['userId'=>$userId],
            'messages'  => [],
            'function'  => __METHOD__,
            'processor' => __CLASS__,
            'pid'       => getmypid(),
        ];
        $this->response->setPayloadSuccess($response);
    }
}