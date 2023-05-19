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

/**
 * Capture PHP related warnings/errors
 *
 * @package Utilities
 * @author  Jete O'Keeffe
 * @version 1.0
 * @link
 */

namespace MikoPBX\AdminCabinet\Utilities\Debug;

class PhpError
{


    /**
     * Record any exception by php
     *
     * @param Void
     */
    public static function exceptionHandler($e)
    {
        if ( ! empty($e)) {
            // Record Error
            self::errorHandler(0, $e->getMessage(), $e->getFile(), $e->getLine());
        }
    }

    /**
     * Record any warnings/errors by php
     *
     * @param int $errNo php error number
     * @param string $errStr php error description
     * @param string $errFile php file where the error occured
     * @param int $errLine php line where the error occured
     */
    public static function errorHandler($errNo, $errStr, $errFile, $errLine)
    {
        if ($errNo != E_STRICT) {
            self::logToSyslog($errNo, $errStr, $errFile, $errLine);
        }
    }

    /**
     * Log error to syslog
     *
     * @param int $errNo php error number
     * @param string $errStr php error description
     * @param string $errFile php file where the error occured
     * @param int $errLine php line where the error occured
     *
     * @return bool
     */
    public static function logToSyslog($errNo, $errStr, $errFile, $errLine)
    {
        $msg = sprintf("%s (errno: %d) in %s:%d", $errStr, $errNo, $errFile, $errLine);

        if (openlog("php-errors", LOG_PID | LOG_PERROR, LOG_LOCAL7)) {
            syslog(LOG_ERR, $msg);

            return closelog();
        }

        return false;
    }

    /**
     * Capture any errors at the end script (especially runtime errors)
     */
    public static function runtimeShutdown()
    {
        $e = error_get_last();
        if ( ! empty($e)) {
            // Record Error
            self::errorHandler($e['type'], $e['message'], $e['file'], $e['line']);
        }
    }

}
