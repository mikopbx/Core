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

namespace MikoPBX\AdminCabinet\Plugins;

use Exception;
use Phalcon\Di\Injectable;
use Phalcon\Events\Event;
use Phalcon\Mvc\Dispatcher as MvcDispatcher;
use Phalcon\Dispatcher\Exception as DispatcherException;

/**
 * NotFoundPlugin
 *
 * Forwards dispatcher "handler/action not found" exceptions to the 404 page.
 * Other exceptions are left to propagate so WhoopsErrorHandlerProvider can log
 * them (including to Sentry).
 */
class NotFoundPlugin extends Injectable
{
    public function beforeException(
        /** @scrutinizer ignore-unused */ Event $event,
        MvcDispatcher $dispatcher,
        Exception $exception
    ): bool {
        // Return true → Phalcon re-throws the original exception from the
        // dispatcher loop, so WhoopsErrorHandlerProvider still catches it and
        // reports to Sentry. Only silently-recoverable 404-type exceptions are
        // forwarded to the errors/show404 action.
        if (! $exception instanceof DispatcherException) {
            return true;
        }

        $code = $exception->getCode();
        if (
            $code !== DispatcherException::EXCEPTION_HANDLER_NOT_FOUND
            && $code !== DispatcherException::EXCEPTION_ACTION_NOT_FOUND
        ) {
            return true;
        }

        $dispatcher->forward([
            'controller' => 'errors',
            'action'     => 'show404',
        ]);

        return false;
    }
}
