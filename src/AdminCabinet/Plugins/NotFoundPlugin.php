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
use Phalcon\Mvc\Dispatcher\Exception as DispatcherException;

/**
 * NotFoundPlugin
 *
 * Handles not-found controller/actions
 */
class NotFoundPlugin extends Injectable
{

    /**
     * This action is executed before perform any action in the application
     *
     * @param Event $event
     * @param MvcDispatcher $dispatcher
     * @param Exception $exception
     *
     * @return bool
     */
    public function beforeException(
        /** @scrutinizer ignore-unused */ Event $event,
        MvcDispatcher $dispatcher,
        Exception $exception
    ): bool {
        if ($exception instanceof DispatcherException) {
            switch ($exception->getCode()) {
                case DispatcherException::EXCEPTION_HANDLER_NOT_FOUND:
                case DispatcherException::EXCEPTION_ACTION_NOT_FOUND:
                    $dispatcher->forward(
                        [
                            'controller' => 'errors',
                            'action'     => 'show404',
                        ]
                    );

                    return false;
            }
        }

        $dispatcher->forward(
            [
                'controller' => 'errors',
                'action'     => 'show500',
            ]
        );

        return false;
    }
}
