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

use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\PBXCoreREST\Http\Response;
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
     * @throws Throwable If an error occurs during the request.
     */
    public function sendRequestToBackendWorker(
        string $processor,
        string $actionName,
        $payload = null,
        string $modulename='',
        int $maxTimeout = 10,
        int $priority = Pheanstalk::DEFAULT_PRIORITY
    ): void
    {
        $requestMessage = [
            'processor' => $processor,
            'data'      => $payload,
            'action'    => $actionName
        ];
        if ($processor==='modules'){
            $requestMessage['module'] = $modulename;
        }
        try {
            $message = json_encode($requestMessage, JSON_THROW_ON_ERROR);
            $beanstalkQueue = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
            $response       = $beanstalkQueue->request($message, $maxTimeout, $priority);
            if ($response !== false) {
                $response = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
                $this->response->setPayloadSuccess($response);
            } else {
                $this->sendError(Response::INTERNAL_SERVER_ERROR);
            }
        } catch (Throwable $e) {
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
}