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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use GuzzleHttp;

/**
 *  Class GetModuleLink
 *  Retrieves the installation link for a module.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class GetModuleLinkAction extends \Phalcon\Di\Injectable
{
    /**
     * Retrieves the installation link for a module.
     *
     * @param string $moduleReleaseId The module release unique id retrieved on getAvailableModules
     *
     * @return PBXApiResult
     */
    public static function main(string $moduleReleaseId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $licenseKey = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LICENSE);

        $client = new GuzzleHttp\Client();
        $body = '';
        try {
            $request = $client->request(
                'POST',
                'https://releases.mikopbx.com/releases/v1/mikopbx/getModuleLink',
                [
                    'headers' => [
                        'Content-Type' => 'application/json; charset=utf-8',
                    ],
                    'json' => [
                        'LICENSE' => $licenseKey,
                        'RELEASEID'=> $moduleReleaseId,
                    ],
                    'timeout' => 5,
                ]
            );
            $code = $request->getStatusCode();
            if ($code === Response::OK){
                $body = $request->getBody()->getContents();
            }
        } catch (\Throwable $e) {
            $code = Response::INTERNAL_SERVER_ERROR;
            Util::sysLogMsg(static::class, $e->getMessage());
            $res->messages[] = $e->getMessage();
        }

        if ($code !== Response::OK) {
            return $res;
        }

        $res->data = json_decode($body, true)??[];
        $res->success = true;
        return $res;
    }
}