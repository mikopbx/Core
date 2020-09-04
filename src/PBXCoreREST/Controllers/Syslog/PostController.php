<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Syslog;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * /pbxcore/api/syslog/{name}' Get system logs (POST).
 *
 * Get logfiles strings partially and filtered
 *   curl -X POST -d '{"filename": "asterisk/messages","filter":"","lines":"500"}'
 *   http://127.0.0.1/pbxcore/api/syslog/getLogFromFile;
 *
 * Download logfile by name
 *  curl -X POST -d '{"filename": "asterisk/messages"}'
 *  http://127.0.0.1/pbxcore/api/syslog/downloadLogFile;
 *
 * Ask for zipped logs and PCAP file
 * curl -X POST -d '{"filename": "/tmp/file.zip"}'
 * http://127.0.0.1/pbxcore/api/syslog/downloadLogsArchive;
 *
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        $requestMessage = json_encode(
            [
                'processor' => 'syslog',
                'data'      => $this->request->getPost(),
                'action'    => $actionName,
            ]
        );
        $connection     = $this->di->getShared('beanstalkConnection');
        $response = $connection->request($requestMessage, 5, 0);

        if ($response !== false) {
            $response = json_decode($response, true);
            if ($actionName === 'getLogFromFile') {
                $filename = $response['data']['filename'] ?? '';
                if ( ! file_exists($filename)) {
                    $response['messages'][]='Log file not found';
                } else {
                    $response['data']['filename']  = $filename;
                    $response['data']['content'] = '' . file_get_contents($filename);
                    unlink($filename);
                }
            } elseif ($actionName === 'downloadLogsArchive'
                || $actionName === 'downloadLogFile') {
                if (array_key_exists('filename', $response['data'])){
                    $di           = Di::getDefault();
                    $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
                    $filename     = $downloadLink . "/" . $response['data']['filename'] ?? '';
                    if ( ! file_exists($filename)) {
                        $response['messages'][]='File not found';
                    } else {

                        $scheme = $this->request->getScheme();
                        $host   = $this->request->getHttpHost();
                        $port   = $this->request->getPort();
                        $response['data']['filename']  = "{$scheme}://{$host}:{$port}/pbxcore/files/cache/{$response['data']['filename']}";
                    }
                }
            }
            $this->response->setPayloadSuccess($response);
        } else {
            $this->sendError(500);
        }
    }
}