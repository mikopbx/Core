<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

use Whoops\Handler\Handler;

/**
 * Whoops output handler for REST: a generic JSON error with no trace, source or request data.
 *
 * The details go to syslog through the earlier handlers of the stack (#1260).
 */
class RestErrorResponseHandler extends Handler
{
    public const string MESSAGE = 'Internal Server Error';

    /**
     * Writes the error payload; Whoops sends it with HTTP 500.
     *
     * @return int Handler::QUIT
     */
    public function handle(): int
    {
        echo json_encode(Response::buildErrorPayload([self::MESSAGE]));
        return Handler::QUIT;
    }

    /**
     * Content type that Whoops sends before the output.
     *
     * @return string
     */
    public function contentType(): string
    {
        return 'application/json';
    }
}
