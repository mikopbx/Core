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

namespace MikoPBX\Common\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Start the session the first time some component request the session service
 */
class SessionReadOnlyProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'sessionRO';

    /**
     * Register session read only service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $phpSessionDir = $di->getShared('config')->path('www.phpSessionDir');
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($phpSessionDir) {
                if ( ! is_array($_COOKIE) || ! array_key_exists(session_name(), $_COOKIE)) {
                    return null;
                }
                $session_name = preg_replace('/[^\da-z]/i', '', $_COOKIE[session_name()]);
                $session_file = $phpSessionDir . '/sess_' . $session_name;
                if ( ! file_exists($session_file)) {
                    return null;
                }

                $session_data = file_get_contents($session_file);

                $return_data = [];
                $offset      = 0;
                while ($offset < strlen($session_data)) {
                    if (false === strpos(substr($session_data, $offset), '|')) {
                        break;
                    }
                    $pos                   = strpos($session_data, '|', $offset);
                    $num                   = $pos - $offset;
                    $varname               = substr($session_data, $offset, $num);
                    $offset                += $num + 1;
                    $data                  = unserialize(substr($session_data, $offset), ['allowed_classes' => false]);
                    $return_data[$varname] = $data;
                    $offset                += strlen(serialize($data));
                }
                $_SESSION = $return_data;

                return $return_data;
            }
        );
    }
}