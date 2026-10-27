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


use MikoPBX\Common\Handlers\GenericErrorResponseHandler;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Modules\PbxExtensionUtils;
use Throwable;
use Whoops\Handler\HandlerInterface;
use Whoops\Handler\JsonResponseHandler;
use Whoops\Handler\PlainTextHandler;
use Whoops\Handler\PrettyPageHandler;
use Whoops\Run;
use Whoops;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
/**
 * Registers whoops error handler service provider.
 *
 * @package MikoPBX\Common\Providers
 */
class WhoopsErrorHandlerProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'whoopsErrorHandler';

    /**
     * Registers whoops error handler service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        // Phalcon binds the closure to the container, so the provider travels in use().
        $provider = $this;
        $di->set(
            self::SERVICE_NAME,
            function () use ($provider) {
                $whoops = new Run();
                $whoops->pushHandler(function ($exception) {
                    return WhoopsErrorHandlerProvider::handleModuleException($exception);
                });
                $whoops->pushHandler(function ($exception) {
                    return WhoopsErrorHandlerProvider::handleAndLogTheException($exception);
                });
                $whoops->appendHandler($provider->createOutputHandler());
                // Deprecation notices must never break production flow.
                error_reporting(error_reporting() & ~E_DEPRECATED & ~E_USER_DEPRECATED);
                $whoops->register();
                return $whoops;
            }
        );
    }

    /**
     * Creates the handler that renders the exception to the client.
     *
     * Web requests get a generic error without exception details; the detailed Whoops
     * output is kept only behind adminApplication.debugMode in mikopbx-settings.json.
     *
     * @return HandlerInterface The last handler in the Whoops stack.
     */
    public function createOutputHandler(): HandlerInterface
    {
        if (Whoops\Util\Misc::isCommandLine()) {
            return new PlainTextHandler();
        }
        return self::createWebOutputHandler(Whoops\Util\Misc::isAjaxRequest(), self::isDebugMode());
    }

    /**
     * Picks the output handler for a web request.
     *
     * @param bool $isAjax Whether the request is AJAX.
     * @param bool $debugMode Whether detailed error output is allowed.
     * @return HandlerInterface
     */
    public static function createWebOutputHandler(bool $isAjax, bool $debugMode): HandlerInterface
    {
        if ($debugMode) {
            return $isAjax ? new JsonResponseHandler() : new PrettyPageHandler();
        }
        return new GenericErrorResponseHandler($isAjax);
    }

    /**
     * Checks the developer setting that allows detailed error pages.
     *
     * Reads the file config only: the handler must work while Redis or the DB is stuck.
     *
     * @return bool True if adminApplication.debugMode is enabled.
     */
    public static function isDebugMode(): bool
    {
        try {
            $di = Di::getDefault();
            if ($di === null || !$di->has(ConfigProvider::SERVICE_NAME)) {
                return false;
            }
            return $di->getShared(ConfigProvider::SERVICE_NAME)->path('adminApplication.debugMode') === true;
        } catch (Throwable) {
            return false;
        }
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
        // #1171: return the text only; by default Run echoes it and sends HTTP 500 into the current response.
        $whoops->writeToOutput(false);
        $whoops->allowQuit(false);
        return $whoops->handleException($exception);
    }
}