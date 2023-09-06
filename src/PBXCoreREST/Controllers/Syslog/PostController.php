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

namespace MikoPBX\PBXCoreREST\Controllers\Syslog;

use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\SysLogsManagementProcessor;
use Phalcon\Di;

/**
 * Get system logs (POST).
 *
 * @RoutePrefix("/pbxcore/api/syslog")
 *
 * Gets partially filtered log file strings.
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
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Gets partially filtered log file strings.
     * @Post("/getLogFromFile")
     *
     * Prepares a downloadable link for a log file with the provided name.
     * @Post("/downloadLogFile")
     *
     * Requests a zipped archive containing logs and PCAP file
     * Checks if archive ready it returns download link.
     * @Post("/downloadLogsArchive")
     *
     * Erase file content.
     * @Post("/eraseFile")
     */
    public function callAction(string $actionName): void
    {
        switch ($actionName) {
            case 'getLogFromFile':
                $this->getLogFromFileAction();
                break;
            case 'downloadLogFile':
            case 'downloadLogsArchive':
                $this->downloadFileAction($actionName);
                break;
            default:
                $data = $this->request->getPost();
                $this->sendRequestToBackendWorker(SysLogsManagementProcessor::class, $actionName, $data);
        }
    }

    /**
     * Parses file content and puts it to answer
     */
    private function getLogFromFileAction(): void
    {
        $requestMessage = json_encode(
            [
                'processor' => SysLogsManagementProcessor::class,
                'data'      => $this->request->getPost(),
                'action'    => 'getLogFromFile',
            ]
        );
        $connection     = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        $response       = $connection->request($requestMessage, 5, 0);

        if ($response !== false) {
            $response = json_decode($response, true);

            $filename = $response['data']['filename'] ?? '';
            if ( ! file_exists($filename)) {
                $response['messages'][] = 'Log file not found';
            } else {
                $response['data']['filename'] = $filename;
                $response['data']['content']  = mb_convert_encoding('' . file_get_contents($filename), 'UTF-8', 'UTF-8');
                unlink($filename);
            }

            $this->response->setPayloadSuccess($response);
        } else {
            $this->sendError(Response::INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Prepares downloadable link for log file or archive
     *
     * @param string $actionName
     */
    private function downloadFileAction(string $actionName): void
    {
        $requestMessage = json_encode(
            [
                'processor' => SysLogsManagementProcessor::class,
                'data'      => $this->request->getPost(),
                'action'    => $actionName,
            ]
        );
        $connection     = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        $response       = $connection->request($requestMessage, 5, 0);

        if ($response !== false) {
            $response = json_decode($response, true);
            if (array_key_exists('filename', $response['data'])) {
                $di           = Di::getDefault();
                $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
                $filename     = $downloadLink . "/" . $response['data']['filename'] ?? '';
                if ( ! file_exists($filename)) {
                    $response['messages'][] = 'File not found';
                } else {
                    $scheme                       = $this->request->getScheme();
                    $host                         = $this->request->getHttpHost();
                    $response['data']['filename'] = "{$scheme}://{$host}/pbxcore/files/cache/{$response['data']['filename']}";
                }
            }
            $this->response->setPayloadSuccess($response);
        } else {
            $this->sendError(Response::INTERNAL_SERVER_ERROR);
        }
    }
}