<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers;

use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
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
                $this->sendError(500);
            }
        } catch (Throwable $e) {
            $this->sendError(400, $e->getMessage());
        }
    }

    /**
     * Sets the response with an error code
     *
     * @param int    $code
     * @param string $description
     */
    protected function sendError(int $code, $description = ''): void
    {
        $this
            ->response
            ->setPayloadError($this->response->getHttpCodeDescription($code) . ' ' . $description)
            ->setStatusCode($code);
    }
}