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

namespace MikoPBX\Common\Providers;


use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Modules\PbxExtensionUtils;
use Throwable;
use Whoops\Handler\JsonResponseHandler;
use Whoops\Handler\PlainTextHandler;
use Whoops\Handler\PrettyPageHandler;
use Whoops\Run;
use Whoops;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
/**
 * Registers whoops error handler service provider.
 *
 * @package MikoPBX\Common\Providers
 */
class WhoopsErrorHandlerProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'whoopsErrorHandler';

    /**
     * Registers whoops error handler service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function () {
                $whoops = new Run();
                $whoops->pushHandler(function ($exception) {
                    return WhoopsErrorHandlerProvider::handleModuleException($exception);
                });
                $whoops->pushHandler(function ($exception) {
                    return WhoopsErrorHandlerProvider::handleAndLogTheException($exception);
                });
                if (Whoops\Util\Misc::isAjaxRequest()) {
                    $handler = new JsonResponseHandler();
                } elseif (Whoops\Util\Misc::isCommandLine()) {
                    $handler = new PlainTextHandler();
                } else {
                    $handler = new PrettyPageHandler();
                }
                $whoops->appendHandler($handler);
                $whoops->register();
                return $whoops;
            }
        );
    }

    /**
     * Handles exception and write message into syslog.
     *
     * @param Throwable $exception The exception to handle.
     * @return int The Whoops handler status.
     */
    private static function handleAndLogTheException(Throwable $exception): int
    {
        $message = WhoopsErrorHandlerProvider::makePrettyErrorDescription($exception);
        SystemMessages::sysLogMsg(__METHOD__, $message, LOG_ERR);
        return \Whoops\Handler\Handler::DONE;
    }

    /**
     * Handles exception and disables the corresponding module.
     *
     * @param Throwable $exception The exception to handle.
     * @return int The Whoops handler status.
     */
    private static function handleModuleException(Throwable $exception): int
    {
        $exceptionFile = $exception->getFile();
        $exceptionMessage = WhoopsErrorHandlerProvider::makePrettyErrorDescription($exception);
        PbxExtensionUtils::disableBadModule($exceptionFile, $exceptionMessage);
        return \Whoops\Handler\Handler::DONE;
    }


    /**
     * Generates an error description for a given exception.
     *
     * @param Throwable $exception The exception for which to generate the error description.
     * @param bool $jsonResult Indicates whether the error description should be in JSON format.
     * @return string The generated error description.
     */
    public static function makePrettyErrorDescription(Throwable $exception, bool $jsonResult = false): string
    {
        $whoops = new Run();
        if ($jsonResult) {
            $whoops->pushHandler(new JsonResponseHandler());
        } else {
            $whoops->pushHandler(new PlainTextHandler());
        }
        $whoops->register();
        $whoops->allowQuit(false);
        return $whoops->handleException($exception);
    }
}