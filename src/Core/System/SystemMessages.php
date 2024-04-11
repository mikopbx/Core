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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
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
        echo $spaces. $formattedResult;
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


    /**
     * Echoes the starting message for a stage.
     *
     * @param string $message The message to echo.
     */
    public static function echoStartMsg(string $message): void
    {
        SystemMessages::echoToTeletype($message);
        SystemMessages::echoWithSyslog($message);
    }

    /**
     * Echoes the result message for a stage.
     *
     * @param string $result The result of the stage.
     */
    public static function echoResultMsg(string $message, string $result = SystemMessages::RESULT_DONE): void
    {
        SystemMessages::teletypeEchoResult($message, $result);
        SystemMessages::echoResult($message, $result);
    }

    /**
     * Retrieves the information message containing available web interface addresses.
     * @param bool $showCredentials Optional, if true the message will have the login information
     * @return string The information message.
     */
    public static function getInfoMessage(bool $showCredentials=false): string
    {
        // Assuming a total width of 53 characters for each line
        $lineWidth = 53;

        $info = PHP_EOL . "┌────────────────────────────────────────────────┐";
        $info .= PHP_EOL . "│                                                │";
        $headerSpace = $lineWidth - 3 - 5; // 3 for "│    🌟 MikoPBX - All services are fully loaded 🌟 " and 5 for " │" at the end
        $headerLine = sprintf("│  %-{$headerSpace}s │", "🌟 MikoPBX - All services are fully loaded 🌟");
        $info .= PHP_EOL . $headerLine;
        $info .= PHP_EOL . "│                                                │";
        $info .= PHP_EOL . "├────────────────────────────────────────────────┤";

        $addresses = [
            'local' => [],
            'external' => []
        ];
        /** @var LanInterfaces $interface */
        $interfaces = LanInterfaces::find("disabled='0'");
        foreach ($interfaces as $interface) {
            if (!empty($interface->ipaddr)) {
                $addresses['local'][] = $interface->ipaddr;
            }
            if (!empty($interface->exthostname) && !in_array($interface->exthostname, $addresses['local'], true)) {
                $addresses['external'][] = explode(':', $interface->exthostname)[0] ?? '';
            }
            if (!empty($interface->extipaddr) && !in_array($interface->extipaddr, $addresses['local'], true)) {
                $addresses['external'][] = explode(':', $interface->extipaddr)[0] ?? '';
            }
        }
        unset($interfaces);


        // Local network
        $port = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_HTTPS_PORT);
        $info .= PHP_EOL . "│                                                │";
        $headerSpace = $lineWidth - 13 - 1; // 13 for "│    🌐 Web Interface Access 🌐 " and 1 for " │"
        $headerLine = sprintf("│            %-{$headerSpace}s │", "🌐 Web Interface Access 🌐");
        $info .= PHP_EOL . $headerLine;
        $info .= PHP_EOL . "│                                                │";
        $info .= PHP_EOL . "│    Local Network Address:                      │";

        $addressSpace = $lineWidth - 7 - 5; // 7 for "│    ➜ " and 5 for " │" at the end
        foreach ($addresses['local'] as $address) {
            if (empty($address)) {
                continue;
            }
            $formattedAddress = $port === '443' ? "https://$address" : "https://$address:$port";
            // Use sprintf to format the string with padding to ensure constant length
            $info .= PHP_EOL . sprintf("│    ➜ %-{$addressSpace}s │", $formattedAddress);

        }
        $info .= PHP_EOL . "│                                                │";

        // External web address info
        if (!empty($addresses['external'])) {
            $info .= PHP_EOL . "│    External Network Address:                   │";
            foreach ($addresses['external'] as $address) {
                if (empty($address)) {
                    continue;
                }
                $formattedAddress = $port === '443' ? "https://$address" : "https://$address:$port";
                // Use sprintf to format the string with padding to ensure constant length
                $info .= PHP_EOL . sprintf("│    ➜ %-{$addressSpace}s │", $formattedAddress);

            }
            $info .= PHP_EOL . "│                                                │";
        }

        if ($showCredentials) {
            // Default web user info
            $cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
            $webAdminPassword = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_PASSWORD);
            $defaultPassword = PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::WEB_ADMIN_PASSWORD];
            if ($cloudInstanceId === $webAdminPassword || $webAdminPassword === $defaultPassword) {
                $adminUser = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_LOGIN);

                $credentialSpace = $lineWidth - 5 - 3; // 5 for "│    🔑 Default Credentials: " and 3 for " │"
                $credentialLine = sprintf("│    %-{$credentialSpace}s │", "🔑 Default web credentials:");
                $info .= PHP_EOL . $credentialLine;
                // Login
                $loginSpace = $lineWidth - 12 - 5; // 12 for "│    Login: " and 5 for " │" at the end
                $loginLine = sprintf("│    Login: %-{$loginSpace}s │", $adminUser); // Format the login line
                $info .= PHP_EOL . $loginLine;

                // Password
                $passwordSpace = $lineWidth - 15 - 5; // 15 for "│    Password: " and 5 for " │" at the end
                $passwordLine = sprintf("│    Password: %-{$passwordSpace}s │", $cloudInstanceId); // Format the password line
                $info .= PHP_EOL . $passwordLine;
            }
        }
        $info .= PHP_EOL . "└────────────────────────────────────────────────┘" . PHP_EOL . PHP_EOL;
        return $info;
    }
}