<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\PBXCoreREST\Controllers\Sysinfo;

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
        $connection     = $this->di->getShared('beanstalkConnectionWorkerAPI');
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