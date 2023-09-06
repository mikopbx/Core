<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Controllers\Sysinfo;

use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /pbxcore/api/sysinfo/{name} Get system logs (GET)
 *
 * Get system information
 *   curl http://172.16.156.223/pbxcore/api/sysinfo/getInfo;
 *
 * Get external IP address:
 *   curl http://172.16.156.212/pbxcore/api/sysinfo/getExternalIpInfo
 *
 */
class GetController extends BaseController
{
    public function callAction($actionName): void
    {
        switch ($actionName) {
            case 'getInfo':
                $this->getInfoAction();
                break;
            default:
                $data = $this->request->getPost();
                $this->sendRequestToBackendWorker('sysinfo', $actionName, $data);
        }
    }

    /**
     * Parses content of file and puts it to answer
     *
     */
    private function getInfoAction(): void
    {
        $requestMessage = json_encode(
            [
                'processor' => 'sysinfo',
                'data'      => $this->request->getPost(),
                'action'    => 'getInfo',
            ]
        );
        $connection     = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        $response       = $connection->request($requestMessage, 30, 0);
        if ($response !== false) {
            $response = json_decode($response, true);
            $filename = $response['data']['filename'] ?? '';
            if ( ! file_exists($filename)) {
                $response['messages'][] = 'System information collected file not found';
            } else {
                $response['data']['content']  = '' . file_get_contents($filename);
                unlink($filename);
            }
            $this->response->setPayloadSuccess($response);
        } else {
            $this->sendError(500);
        }
    }
}