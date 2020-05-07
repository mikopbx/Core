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

namespace MikoPBX\PBXCoreREST\Http;

use Phalcon\Http\Request as PhRequest;
use function str_replace;

class Request extends PhRequest
{
    /**
     * @return bool
     */
    public function isLocalHostRequest(): bool
    {
        return ($_SERVER['REMOTE_ADDR'] === '127.0.0.1');
    }

    public function isDebugModeEnabled(): bool
    {
        return ($this->getDI()->getShared('config')->path('adminApplication.debugMode'));
    }


    public function isAuthorizedSessionRequest(): bool
    {
        $sessionRO = $this->getDI()->getShared('sessionRO');
        return (is_array($sessionRO) && array_key_exists('auth', $sessionRO));
    }

}