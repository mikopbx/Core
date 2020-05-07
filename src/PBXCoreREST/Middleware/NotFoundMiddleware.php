<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Di\Injectable;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;

/**
 * Class NotFoundMiddleware
 *
 * @property Micro    $application
 * @property Response $response
 */
class NotFoundMiddleware extends Injectable implements MiddlewareInterface
{
    use ResponseTrait;

    /**
     * Checks if the resource was found
     */
    public function beforeNotFound()
    {
        $this->halt(
            $this->application,
            $this->response::NOT_FOUND,
            $this->response->getHttpCodeDescription($this->response::NOT_FOUND)
        );

        return false;
    }

    /**
     * Call me
     *
     * @param Micro $api
     *
     * @return bool
     */
    public function call(Micro $api)
    {
        return true;
    }
}