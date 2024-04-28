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

declare(strict_types=1);

namespace MikoPBX\Common\Handlers;

use MikoPBX\Common\Providers\SentryErrorHandlerProvider;
use MikoPBX\Common\Providers\WhoopsErrorHandlerProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di;
use Throwable;
/**
 * Collects errors and send them to Sentry cloud for software improvement reasons
 */
class CriticalErrorsHandler
{
    /**
     * Captures an exception, sends it to the Sentry cloud, and writes syslog.
     *
     * @param Throwable $exception The exception to capture.
     *
     * @return string Pretty error description
     */
    public static function handleExceptionWithSyslog(Throwable $exception): string
    {
        // Sentry
        $di = Di::getDefault();
        $sentryErrorHandler = $di->get(SentryErrorHandlerProvider::SERVICE_NAME);
        if ($sentryErrorHandler){
            $sentryErrorHandler->captureException($exception);
        }

        // Whoops
        $message = WhoopsErrorHandlerProvider::makePrettyErrorDescription($exception, false);
        SystemMessages::sysLogMsg(__METHOD__, $message, LOG_ERR);
        return $message;
    }

    /**
     * Handle an exception, sends it to the Sentry cloud, and shows error description to user.
     *
     * @param Throwable $exception The exception to capture.
     */
    public static function handleException(Throwable $exception): void
    {
        // Sentry
        $di = Di::getDefault();
        $sentryErrorHandler = $di->get(SentryErrorHandlerProvider::SERVICE_NAME);
        if ($sentryErrorHandler){
            $sentryErrorHandler->captureException($exception);
        }

        // Whoops
        $whoops = $di->get(WhoopsErrorHandlerProvider::SERVICE_NAME);
        if ($whoops){
            $whoops->handleException($exception);
        }
    }

}
