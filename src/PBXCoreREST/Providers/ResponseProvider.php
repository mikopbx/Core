<?php

declare(strict_types=1);

/**
 * This file is part of the Phalcon API.
 *
 * (c) Phalcon Team <team@phalcon.io>
 *
 * For the full copyright and license information, please view
 * the LICENSE file that was distributed with this source code.
 */

namespace MikoPBX\PBXCoreREST\Providers;

use MikoPBX\PBXCoreREST\Http\Response;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

class ResponseProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'response';

    /**
     * Register response service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $response = new Response();

                /**
                 * Assume success. We will work with the edge cases in the code
                 */
                $response
                    ->setStatusCode(200)
                    ->setContentType('application/vnd.api+json', 'UTF-8');

                return $response;
            }
        );
    }
}