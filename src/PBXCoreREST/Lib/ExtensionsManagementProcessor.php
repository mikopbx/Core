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

namespace MikoPBX\PBXCoreREST\Lib;

use Facebook\WebDriver\Exception\ElementNotSelectableException;
use MikoPBX\PBXCoreREST\Lib\Extensions\DeleteRecord;
use MikoPBX\PBXCoreREST\Lib\Extensions\Dropdowns;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetRecord;
use MikoPBX\PBXCoreREST\Lib\Extensions\SaveRecord;
use MikoPBX\PBXCoreREST\Lib\Extensions\Utils;
use Phalcon\Di\Injectable;

/**
 * Class ExtensionManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class ExtensionsManagementProcessor extends Injectable
{
    /**
     * Processes Extensions management requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'];
        switch ($action) {
            case 'getRecord':
                $res = GetRecord::main($data['id'] ?? '');
                break;
            case 'saveRecord':
                // Start xdebug session, don't forget to install xdebug.remote_mode = jit on xdebug.ini
                // and set XDEBUG_SESSION Cookie header on REST request to debug it
                if (isset($request['debug']) && $request['debug'] === true) {
                    xdebug_break();
                }
                if (!empty($data['number'])) {
                    $res = SaveRecord::main($data);
                } else {
                    $res->messages['error'][] = 'Empty number value in POST/GET data';
                }
                break;
            case 'deleteRecord':
                if (!empty($data['id'])) {
                    $res = DeleteRecord::main($data['id']);
                } else {
                    $res->messages['error'][] = 'empty ID in POST/GET data';
                }
                break;
            case 'getForSelect':
                $res = Dropdowns::getForSelect($data['type'] ?? 'all');
                break;
            case 'available':
                if (!empty($data['number'])) {
                    $res = Utils::ifNumberAvailable($data['number']);
                } else {
                    $res->messages['error'][] = 'Empty number value in POST/GET data';
                }
                break;
            case 'getPhonesRepresent':
                if (!empty($data['numbers']) || !is_array($data['numbers'])) {
                    $res = Utils::getPhonesRepresent($data['numbers']);
                } else {
                    $res->messages['error'][] = 'Wrong numbers value in POST/GET data';
                }
                break;
            case 'getPhoneRepresent':
                if (!empty($data['number'])) {
                    $res = Utils::getPhoneRepresent($data['number']);
                } else {
                    $res->messages['error'][] = 'Empty number value in POST/GET data';
                }
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }


}