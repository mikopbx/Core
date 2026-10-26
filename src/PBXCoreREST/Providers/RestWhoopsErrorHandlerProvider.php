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

namespace MikoPBX\PBXCoreREST\Providers;

use MikoPBX\Common\Providers\WhoopsErrorHandlerProvider;
use MikoPBX\PBXCoreREST\Http\RestErrorResponseHandler;
use Whoops\Handler\HandlerInterface;
use Whoops\Util\Misc;

/**
 * Whoops service for the REST API: never renders the pretty page or exception details (#1260).
 *
 * @package MikoPBX\PBXCoreREST\Providers
 */
class RestWhoopsErrorHandlerProvider extends WhoopsErrorHandlerProvider
{
    /**
     * Uses the generic JSON error for every web request, AJAX included.
     *
     * @return HandlerInterface The last handler in the Whoops stack.
     */
    public function createOutputHandler(): HandlerInterface
    {
        if (Misc::isCommandLine()) {
            return parent::createOutputHandler();
        }
        return new RestErrorResponseHandler();
    }
}
