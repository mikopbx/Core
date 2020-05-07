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

use Phalcon\Mvc\Controller;


/**
 * Class BaseController
 *
 */
class BaseController extends Controller
{
    public function sendRequestToBackendWorker($processor, $actionName, $payload = null):void
    {
        $requestMessage = json_encode([
            'processor'=>$processor,
            'data'   => $payload,
            'action' => $actionName
        ]);
        $connection  = $this->beanstalkConnection;
        $response = $connection->request($requestMessage, 15, 0);
        if ( $response !== false){
            $response = json_decode($response,true);
            $this->response->setPayloadSuccess($response);
        } else {
            $this->sendError(500);
        }
    }

    /**
     * Sets the response with an error code
     *
     * @param int    $code
     * @param string $description
     */
    protected function sendError(int $code, $description=''):void
    {
        $this
            ->response
            ->setPayloadError($this->response->getHttpCodeDescription($code).' '.$description)
            ->setStatusCode($code)
        ;
    }
}