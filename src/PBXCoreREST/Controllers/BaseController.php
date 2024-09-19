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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use Phalcon\Filter;
use Phalcon\Mvc\Controller;
use Pheanstalk\Pheanstalk;
use Throwable;

/**
 * Class BaseController
 * @property \MikoPBX\PBXCoreREST\Http\Response $response
 * @property \MikoPBX\PBXCoreREST\Http\Request $request
 */
class BaseController extends Controller
{


    /**
     * Send a request to the backend worker.
     *
     * @param string $processor The name of the processor.
     * @param string $actionName The name of the action.
     * @param mixed|null $payload The payload data to send with the request.
     * @param string $moduleName The name of the module (only for 'modules' processor).
     * @param int $maxTimeout The maximum timeout for the request in seconds.
     * @param int $priority The priority of the request.
     *
     * @return void
     *
     */
    public function sendRequestToBackendWorker(
        string $processor,
        string $actionName,
        $payload = null,
        string $moduleName='',
        int $maxTimeout = 10,
        int $priority = Pheanstalk::DEFAULT_PRIORITY
    ): void
    {
        list($debug, $requestMessage) = $this->prepareRequestMessage($processor, $payload, $actionName, $moduleName);

        try {
            $message = json_encode($requestMessage, JSON_THROW_ON_ERROR);
            $beanstalkQueue = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
            if ($debug){
                $maxTimeout = 9999;
            }
            $response       = $beanstalkQueue->request($message, $maxTimeout, $priority);
            if ($response !== false) {
                $response = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
                if (array_key_exists(BeanstalkClient::QUEUE_ERROR, $response)){
                    $this->response->setPayloadError($response[BeanstalkClient::QUEUE_ERROR]);
                } elseif (array_key_exists(BeanstalkClient::RESPONSE_IN_FILE, $response)){
                    $tempFile = $response[BeanstalkClient::RESPONSE_IN_FILE];
                    $response = unserialize(file_get_contents($tempFile));
                    $this->response->setPayloadSuccess($response);
                } else {
                    $this->response->setPayloadSuccess($response);
                }
            } else {
                $this->sendError(Response::INTERNAL_SERVER_ERROR);
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $this->sendError(Response::BAD_REQUEST, $e->getMessage());
        }
    }

    /**
     * Sets the response with an error code
     *
     * @param int    $code
     * @param string $description
     */
    protected function sendError(int $code, string $description = ''): void
    {
        $this
            ->response
            ->setPayloadError($this->response->getHttpCodeDescription($code) . ' ' . $description)
            ->setStatusCode($code);
    }

    /**
     * Prepare a request message for sending to backend worker
     *
     * @param string $processor
     * @param $payload
     * @param string $actionName
     * @param string $moduleName
     * @return array
     */
    public function prepareRequestMessage(string $processor, $payload, string $actionName, string $moduleName): array
    {
        // Old style modules, we can remove it after 2025
        if ($processor === 'modules') {
            $processor = PbxExtensionsProcessor::class;
        }

        // Start xdebug session, don't forget to install xdebug.remote_mode = jit on xdebug.ini
        // and set XDEBUG_SESSION Cookie header on REST request to debug it
        // The set will break the WorkerApiCommands() execution on prepareAnswer method
        $debug = strpos($this->request->getHeader('Cookie'), 'XDEBUG_SESSION') !== false;

        $requestMessage = [
            'processor' => $processor,
            'data' => $payload,
            'action' => $actionName,
            'async'=> false,
            'asyncChannelId'=> '',
            'debug' => $debug
        ];
        if ($this->request->isAsyncRequest()){
            $requestMessage['async']= true;
            $requestMessage['asyncChannelId']= $this->request->getAsyncRequestChannelId();
        }

        if ($processor === PbxExtensionsProcessor::class) {
            $requestMessage['module'] = $moduleName;
        }
        return array($debug, $requestMessage);
    }

    /**
     * Recursively sanitizes input data based on the provided filter.
     *
     * @param array $data The data to be sanitized.
     * @param \Phalcon\Filter\FilterInterface $filter The filter object used for sanitization.
     *
     * @return array The sanitized data.
     */
    public static function sanitizeData(array $data, \Phalcon\Filter\FilterInterface $filter): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                // Recursively sanitize array values
                $data[$key] = self::sanitizeData($value, $filter);
            } elseif (is_string($value)) {
                // Check if the string starts with 'http'
                if (stripos($value, 'http') === 0) {
                    // If the string starts with 'http', sanitize it as a URL
                    $data[$key] = $filter->sanitize($value, FILTER::FILTER_URL);
                } else {
                    // Sanitize regular strings (trim and remove illegal characters)
                    $data[$key] = $filter->sanitize($value, [FILTER::FILTER_STRING, FILTER::FILTER_TRIM]);
                }
            } elseif (is_numeric($value)) {
                // Sanitize numeric values as integers
                $data[$key] = $filter->sanitize($value, FILTER::FILTER_INT);
            }
        }

        return $data;
    }
}