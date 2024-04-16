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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Http\Response;
use Phalcon\Di\Injectable;
use GuzzleHttp;

/**
 * Class CheckUpdates
 * This class is responsible for checking PBX updates.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckUpdates extends Injectable
{
    /**
     * Check for a new version PBX
     *
     * @return array An array containing information messages about available updates.
     *
     */
    public function process(): array
    {
        $messages = [];
        $PBXVersion = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_VERSION);

        $client = new GuzzleHttp\Client();
        try {
            $res = $client->request(
                'POST',
                'https://releases.mikopbx.com/releases/v1/mikopbx/ifNewReleaseAvailable',
                [
                    'form_params' => [
                        'PBXVER' => $PBXVersion,
                    ],
                    'timeout' => 5,
                ]
            );
            $code = $res->getStatusCode();
        } catch (\Throwable $e) {
            $code = Response::INTERNAL_SERVER_ERROR;
            SystemMessages::sysLogMsg(static::class, $e->getMessage());
        }

        if ($code !== Response::OK) {
            return [];
        }

        $answer = json_decode($res->getBody(), false);
        if ($answer !== null && $answer->newVersionAvailable === true) {
            $messages['info'][] = [
                'messageTpl'=>'adv_AvailableNewVersionPBX',
                'messageParams'=>[
                    'url' => $this->url->get('update/index/'),
                    'ver' => $answer->version,
                ]
            ];

        }

        return $messages;
    }

}