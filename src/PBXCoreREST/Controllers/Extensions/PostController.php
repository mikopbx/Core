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
use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * Handles the POST requests for extensions data.
 *
 * @RoutePrefix("/pbxcore/api/extensions")
 *
 * @examples
 *
 * Get phones represent
 *   curl -X POST -d '{"numbers": [225,224,79265244744,6681423434]}' http://127.0.0.1/pbxcore/api/extensions/getPhonesRepresent;
 *
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Returns CallerID names for the numbers list.
     * @Post("/getPhonesRepresent")
     *
     * Returns CallerID names for the number.
     * @Post("/getPhoneRepresent")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        switch ($actionName) {
            case 'getPhonesRepresent':
                $numbers = $this->request->getPost('numbers');
                $this->getPhonesRepresent($numbers);
                break;
            case 'getPhoneRepresent':
                $number = $this->request->getPost('number');
                $this->getPhonesRepresent([$number]);
                break;
            default:
        }
    }

    /**
     * Retrieves the view for the phone numbers list via AJAX request.
     *
     * @param array $numbers
     * @return void
     */
    private function getPhonesRepresent(array $numbers): void
    {
        $result = [];
        foreach ($numbers as $number) {
            $result[$number] = [
                'number' => $number,
                'represent' => $this->getPhoneRepresent($number),
            ];
        }
        $response =  [
            'result'    => true,
            'data'      => $result,
            'messages'  => [],
            'function'  => __METHOD__,
            'processor' => __CLASS__,
            'pid'       => getmypid(),
        ];
        $this->response->setPayloadSuccess($response);
    }

    /**
     * Retrieves the view for the phone number via AJAX request.
     *
     * @return void
     */
    private function getPhoneRepresent(string $phoneNumber): string
    {
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

        return $response;
    }
}