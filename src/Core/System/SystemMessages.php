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
        self::echoToTeletype($spaces . $formattedResult);
    }

    /**
     * Echoes a message and logs it to the ttyS0-ttyS5.
     *
     * @param string $message The message to echo in a serial console.
     *
     * @return void
     */
    public static function echoToTeletype(string $message, $echoToConsole=false): void
    {
        if ($echoToConsole){
            echo $message;
        }
        // Log to serial tty
        for ($i = 0; $i <= 5; $i++) {
            $device = "/dev/ttyS$i";
            $setserial = Util::which('setserial');
            $grep = Util::which('grep');
            // Get the result of the command execution
            $result = shell_exec("$setserial -g \"$device\" | $grep -v unknown 2> /dev/null");
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
        echo $spaces . $formattedResult;
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
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $logger->log($level, "$message on $ident");
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
     * @param string $header Message header
     * @param bool $showCredentials Optional, if true the message will have the login information
     * @return string The information message.
     */
    public static function getInfoMessage(string $header, bool $showCredentials = false): string
    {
        $lineWidth = 70;
        $borderLine = str_repeat('+', $lineWidth);
        $emptyLine = "|" . str_repeat(' ', $lineWidth - 2) . "|";
        $version = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_VERSION);

        $info = PHP_EOL . $borderLine;
        $info .= PHP_EOL . self::formatLine($header, $lineWidth, 'center');
        $info .= PHP_EOL . self::formatLine("MikoPBX " . $version, $lineWidth, 'center');
        $info .= PHP_EOL . $borderLine;

        $addresses = self::getNetworkAddresses();
        $port = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_HTTPS_PORT);
        $info .= PHP_EOL . self::formatLine("Web Interface Access", $lineWidth, 'center');
        $info .= PHP_EOL . $emptyLine;

        foreach (['local' => "Local Network Address:", 'external' => "External Network Address:"] as $type => $label) {
            if (!empty($addresses[$type])) {
                $info .= PHP_EOL . self::formatLine($label, $lineWidth);
                foreach ($addresses[$type] as $address) {
                    $formattedAddress = $port === '443' ? "https://$address" : "https://$address:$port";
                    $info .= PHP_EOL . self::formatLine($formattedAddress, $lineWidth);
                }
                $info .= PHP_EOL . $emptyLine;
            }
        }

        if ($showCredentials) {
            $info .= PHP_EOL . self::showWebCredentials($lineWidth);
            $info .= PHP_EOL . $borderLine;
            $info .= PHP_EOL . self::showSSHCredentials($lineWidth);
        }

        $info .= PHP_EOL . $emptyLine . PHP_EOL . $borderLine . PHP_EOL;
        return $info;
    }


    /**
     * Formats a given string to fit within a specified width inside a text box.
     *
     * This function formats a line by applying padding around the text to align it
     * according to the specified alignment parameter. It can align text to the left (default)
     * or center it within the line. The line is framed with vertical bars on each side.
     *
     * @param string $content The text content to be formatted within the line.
     * @param int $lineWidth The total width of the line, including the border characters.
     * @param string $align The text alignment within the line. Valid values are 'left' or 'center'.
     *                      Default is 'left', which aligns the text to the left with padding on the right.
     *                      If set to 'center', the text will be centered with padding on both sides.
     *
     * @return string The formatted line with the text aligned as specified.
     */
    private static function formatLine(string $content, int $lineWidth, string $align = 'left'): string
    {
        $padding = $lineWidth - 4 - mb_strlen($content);  // 4 characters are taken by the borders "| "
        if ($align === 'center') {
            // Center the content by splitting the padding on both sides
            $leftPadding = intdiv($padding, 2);
            $rightPadding = $padding - $leftPadding;
            return "| " . str_repeat(' ', $leftPadding) . $content . str_repeat(' ', $rightPadding) . " |";
        } else {
            // Left align the content (default behavior)
            return "| " . $content . str_repeat(' ', $padding) . " |";
        }
    }


    /**
     * Retrieves the local and external network addresses.
     * @return array|array[]
     */
    private static function getNetworkAddresses(): array
    {
        $addresses = ['local' => [], 'external' => []];
        $interfaces = LanInterfaces::find("disabled='0'");
        foreach ($interfaces as $interface) {
            if (!empty($interface->ipaddr)) {
                $addresses['local'][] = $interface->ipaddr;
            }
            if (!empty($interface->exthostname)) {
                $addresses['external'][] = strtok($interface->exthostname, ':');
            }
            if (!empty($interface->extipaddr)) {
                $addresses['external'][] = strtok($interface->extipaddr, ':');
            }
        }
        return $addresses;
    }

    /**
     * Retrieves the information message containing available web interface credentials.
     * @param int $lineWidth
     * @return string
     */
    private static function showWebCredentials(int $lineWidth): string
    {
        $cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
        $webAdminPassword = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_PASSWORD);
        $defaultPassword = PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::WEB_ADMIN_PASSWORD];
        if ($cloudInstanceId === $webAdminPassword || $webAdminPassword === $defaultPassword) {
            $adminUser = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_LOGIN);
            $info = self::formatLine("Web credentials:", $lineWidth);
            $info .= PHP_EOL . self::formatLine("   Login: $adminUser", $lineWidth);
            $info .= PHP_EOL . self::formatLine("   Password: $webAdminPassword", $lineWidth);
        } else {
            $info = '';
        }
        return $info;
    }

    /**
     * Retrieves the information message containing available ssh credentials.
     * @param int $lineWidth
     * @return string
     */
    private static function showSSHCredentials(int $lineWidth): string
    {
        $cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
        $sshUser = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_LOGIN);
        $sshPassword = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD);
        $defaultSshPassword = PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::SSH_PASSWORD];
        $sshPort = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PORT);
        $authorizedKeys = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_AUTHORIZED_KEYS);
        $disablePassLogin = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD);

        if ($disablePassLogin === '1' and strlen($authorizedKeys)<80){
            $info = self::formatLine("SSH access disabled!", $lineWidth);
        } else {
            $info = self::formatLine("SSH credentials:", $lineWidth);
            $info .= PHP_EOL . self::formatLine("   Port: $sshPort", $lineWidth);
            $info .= PHP_EOL . self::formatLine("   Login: $sshUser", $lineWidth);
            if ($disablePassLogin === '1') {
                $info .= PHP_EOL . self::formatLine("   Password access disabled, use ssh key pair.", $lineWidth);
            } elseif ($sshPassword === $defaultSshPassword) {
                $info .= PHP_EOL . self::formatLine("   Password: $sshPassword", $lineWidth);
            } else {
                $info .= PHP_EOL . self::formatLine("   Password: ***********", $lineWidth);
            }
        }

        return $info;
    }
}