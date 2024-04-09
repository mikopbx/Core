<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Providers\LoggerProvider;
use Phalcon\Di;

/**
 * SystemMessages class
 *
 * @package MikoPBX\Core\System
 *
 */
class SystemMessages extends Di\Injectable
{
    public const RESULT_DONE = 'Done';
    public const RESULT_FAILED = 'Failed';
    public const RESULT_SKIPPED = 'Skipped';

    private static array $defaultTexts = [
        self::RESULT_DONE => " \033[32;1mDONE\033[0m \n", // Green for DONE
        self::RESULT_FAILED => " \033[31;1mFAIL\033[0m \n",  // Red for FAILED
        self::RESULT_SKIPPED => " \033[33;1mSKIP\033[0m \n", // Yellow for SKIPPED
    ];

    /**
     * Echoes a result message with progress dots.
     *
     * @param string $message The result message to echo.
     * @param string $result The result status (DONE by default).
     *
     * @return void
     */
    public static function teletypeEchoResult(string $message, string $result = self::RESULT_DONE): void
    {
        $len = max(0, 80 - strlen($message) - 9);
        $spaces = str_repeat('.', $len);
        $formattedResult = self::getFormattedResult($result);
        self::echoToTeletype($spaces.$formattedResult);
    }

    /**
     * Echoes a message and logs it to the ttyS0-ttyS5.
     *
     * @param string $message The message to echo in a serial console.
     *
     * @return void
     */
    public static function echoToTeletype(string $message): void
    {
        // Log to serial tty
        echo $message;
        for ($i = 0; $i <= 5; $i++) {
            $device = "/dev/ttyS$i";
            $busyboxPath = Util::which('busybox');
            // Get the result of the command execution
            $result = shell_exec("$busyboxPath setserial -g \"$device\" | $busyboxPath grep -v unknown 2> /dev/null");
            // If the result is not empty
            if (!empty($result)) {
                // Perform the same
                file_put_contents($device, $message, FILE_APPEND);
            }
        }
    }

    /**
     * Prepares formatted result string.
     *
     * @param string $result The result status.
     *
     * @return string Formatted result status.
     */
    private static function getFormattedResult(string $result = self::RESULT_DONE): string
    {
        if ($result === '1') {
            $result = self::RESULT_DONE;
        } elseif ($result === '0') {
            $result = self::RESULT_FAILED;
        }
        if (array_key_exists($result, self::$defaultTexts)) {
            $resultMessage = self::$defaultTexts[$result];
        } else {
            $resultMessage = "\033[90m$result\033[0m \n"; // Grey for unknown results
        }
        return $resultMessage;
    }

    /**
     * Echoes a result message with progress dots.
     *
     * @param string $message The result message to echo.
     * @param string $result The result status (DONE by default).
     *
     * @return void
     */
    public static function echoResult(string $message, string $result = self::RESULT_DONE): void
    {
        $cols = self::getCountCols();
        if (!is_numeric($cols)) {
            // Failed to retrieve the screen width.
            return;
        }
        $len = $cols - strlen($message) - 8;
        if ($len < 2) {
            // Incorrect screen width.
            return;
        }

        $spaces = str_repeat('.', $len);
        $formattedResult = self::getFormattedResult($result);
        echo "\r" . $message . $spaces. $formattedResult;
    }

    /**
     * Gets the count of columns in the terminal window.
     *
     * @return string The count of columns.
     */
    public static function getCountCols(): string
    {
        $len = 1 * trim(shell_exec('tput cols'));

        // If the count of columns is zero, set it to a default value of 80
        if ($len === 0) {
            $len = 80;
        } else {
            // Limit the count of columns to a maximum of 80
            $len = min($len, 80);
        }
        return $len;
    }

    /**
     * Echoes a message and logs it to the system log.
     *
     * @param string $message The message to echo and log.
     *
     * @return void
     */
    public static function echoWithSyslog(string $message): void
    {
        echo $message;
        // Log the message to the system log with LOG_INFO level
        self::sysLogMsg(static::class, $message, LOG_INFO);
    }

    /**
     * Adds messages to Syslog.
     *
     * @param string $ident The category, class, or method identification.
     * @param string $message The log message.
     * @param int $level The log level (default: LOG_WARNING).
     *
     * @return void
     */
    public static function sysLogMsg(string $ident, string $message, int $level = LOG_WARNING): void
    {
        /** @var \Phalcon\Logger $logger */
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $logger->log($level, "{$message} on {$ident}");
    }

}