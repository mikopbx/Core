<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Http;

use Phalcon\Http\Request as PhRequest;

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