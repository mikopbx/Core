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
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Class Utils
 * Provides utility functions for handling phone numbers and availability checks.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class Utils extends Injectable
{

    /**
     * Retrieves the view for the phone numbers list via AJAX request.
     *
     * @param array $numbers List of phone numbers.
     * @return PBXApiResult Result of the operation.
     */
    public static function getPhonesRepresent(array $numbers): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $result = [];
        foreach ($numbers as $number) {
            $result[$number] = [
                'number' => $number,
                'represent' => self::getPhoneRepresent($number)->data,
            ];
        }
        $res->data = $result;

        return $res;
    }

    /**
     * Retrieves the view for the phone number via AJAX request.
     *
     * @param string $phoneNumber The phone number.
     * @return PBXApiResult Result of the operation.
     */
    public static function getPhoneRepresent(string $phoneNumber): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $response = $phoneNumber;

        if (strlen($phoneNumber) > 10) {
            $seekNumber = substr($phoneNumber, -9);
            $parameters = [
                'conditions' => 'number LIKE :SearchPhrase1:',
                'bind' => [
                    'SearchPhrase1' => "%{$seekNumber}",
                ],
            ];
        } else {
            $parameters = [
                'conditions' => 'number = :SearchPhrase1:',
                'bind' => [
                    'SearchPhrase1' => $phoneNumber,
                ],
            ];
        }
        $result = Extensions::findFirst($parameters);
        if ($result !== null) {
            $response = $result->getRepresent();
        }
        $res->data[] = $response;

        return $res;
    }

    /**
     * Check the availability of a number in the extensionsAPI.js JavaScript script.
     *
     * @param string $number The internal number of the user.
     * @return PBXApiResult Result of the availability check.
     */
    public static function ifNumberAvailable(string $number): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data['available'] = true;

        // Check for overlap with internal number plan
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $res->data['available'] = false;
            switch ($extension->type){
                case Extensions::TYPE_SIP:
                case Extensions::TYPE_EXTERNAL:
                    $res->data['userId'] = $extension->userid;
                    $res->data['represent'] = $extension->getRepresent();
                    break;
                case Extensions::TYPE_PARKING:
                    $res->data['represent'] = 'ex_ThisNumberOverlapWithParkingSlots';
                    break;
                default:
                    $res->data['available'] = false;
                    $res->data['represent'] = 'ex_ThisNumberIsNotFree';
            }

            return $res;
        }
        return $res;
    }

}