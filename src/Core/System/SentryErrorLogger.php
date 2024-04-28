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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Providers\SentryErrorHandlerProvider;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use Sentry\State\HubInterface;
use Throwable;
class SentryErrorLogger extends Injectable
{

    private ?HubInterface $errorHandler;

    /**
     * @deprecated  SentryErrorHandler constructor.
     *
     * @param string $libraryName The name of the library.
     */
    public function __construct(string $libraryName)
    {
        SystemMessages::sysLogMsg('DEPRECATED','The class '.get_called_class().' uses deprecated SentryErrorLogger method', LOG_ALERT);
        $di = Di::getDefault();
        $this->errorHandler = $di->get(SentryErrorHandlerProvider::SERVICE_NAME, [$libraryName]);
    }

    /**
     * @deprecated  Initializes the Sentry error logging subsystem if error sending is enabled in the PBX settings.
     *
     * @return bool The initialization result.
     */
    public function init(): bool
    {
        SystemMessages::sysLogMsg('DEPRECATED','The class '.get_called_class().' uses deprecated SentryErrorLogger method', LOG_ALERT);
        return true;
    }

    /**
     * @deprecated  Captures an exception and sends it to the Sentry cloud.
     *
     * @param Throwable $e The exception to capture.
     */
    public function captureException(Throwable $e): void
    {
        SystemMessages::sysLogMsg('DEPRECATED','The class '.get_called_class().' uses deprecated SentryErrorLogger method', LOG_ALERT);
        if ($this->errorHandler)
        {
            $this->errorHandler->captureException($e);
        }
    }
}