<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;

/**
 * Class ResponseMiddleware
 *
 * @property Response $response
 */
class ResponseMiddleware implements MiddlewareInterface
{
    use ResponseTrait;

    /**
     * Call me
     *
     * @param Micro $api
     *
     * @return bool
     */
    public function call(Micro $api)
    {
        /** @var Response $response */
        $response = $api->getService('response');
        if ( ! $response->isSent()) {
            $response->send();
        }

        return true;
    }
}
