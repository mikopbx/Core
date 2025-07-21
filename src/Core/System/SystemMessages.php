<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Providers\LoggerProvider;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * SystemMessages class
 *
 * @package MikoPBX\Core\System
 *
 */
class SystemMessages extends Injectable
{
    public const string RESULT_DONE = 'Done';
    public const string RESULT_FAILED = 'Failed';
    public const string RESULT_SKIPPED = 'Skipped';

    private static array $defaultTexts = [
        self::RESULT_DONE => " \033[32;1mDONE\033[0m \n", // Green for DONE
        self::RESULT_FAILED => " \033[31;1mFAIL\033[0m \n",  // Red for FAILED
        self::RESULT_SKIPPED => " \033[33;1mSKIP\033[0m \n", // Yellow for SKIPPED
    ];
    
    private static ?array $availableSerialPorts = null;

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
        $formattedResult = self::getFormattedResultForTeletype($result);
        self::echoToTeletype($spaces . $formattedResult);
    }

    /**
     * Echoes a message and logs it to the ttyS0-ttyS5.
     *
     * @param string $message The message to echo in a serial console.
     * @param bool $echoToConsole
     * @return void
     */
    public static function echoToTeletype(string $message, bool $echoToConsole=false): void
    {
        if ($echoToConsole){
            echo $message;
        }
        
        // Get available serial ports (cached)
        $serialPorts = self::getAvailableSerialPorts();
        
        // Strip ANSI color codes before writing to serial ports
        $cleanMessage = preg_replace('/\033\[[0-9;]*m/', '', $message);
        
        // Write to available serial ports
        foreach ($serialPorts as $device) {
            @file_put_contents($device, $cleanMessage, FILE_APPEND);
        }
    }
    
    /**
     * Gets available serial ports and caches the result.
     *
     * @return array List of available serial port devices
     */
    private static function getAvailableSerialPorts(): array
    {
        if (self::$availableSerialPorts !== null) {
            return self::$availableSerialPorts;
        }
        
        self::$availableSerialPorts = [];
        
        // Use pbx-env-detect if available
        $pbxEnvDetect = '/sbin/pbx-env-detect';
        if (file_exists($pbxEnvDetect) && is_executable($pbxEnvDetect)) {
            $serialPorts = trim(shell_exec("$pbxEnvDetect --serial 2>/dev/null") ?? '');
            if (!empty($serialPorts)) {
                self::$availableSerialPorts = explode(' ', $serialPorts);
            }
        } else {
            // Fallback to old method
            for ($i = 0; $i <= 5; $i++) {
                $device = "/dev/ttyS$i";
                
                // Simply check if device exists and is writable
                if (file_exists($device) && is_writable($device)) {
                    self::$availableSerialPorts[] = $device;
                }
            }
        }
        
        return self::$availableSerialPorts;
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
     * Formats a result for teletype output without color codes.
     * @param string $result The result string to format (DONE, FAILED, SKIPPED, etc.)
     * @return string The formatted result without ANSI color codes
     */
    private static function getFormattedResultForTeletype(string $result = self::RESULT_DONE): string
    {
        if ($result === '1') {
            $result = self::RESULT_DONE;
        } elseif ($result === '0') {
            $result = self::RESULT_FAILED;
        }
        
        // Map result to plain text without color codes, with consistent width
        $plainTexts = [
            self::RESULT_DONE => " DONE \n",
            self::RESULT_FAILED => " FAIL \n",
            self::RESULT_SKIPPED => " SKIP \n",
        ];
        
        if (array_key_exists($result, $plainTexts)) {
            return $plainTexts[$result];
        } else {
            // Ensure consistent width for unknown results
            return sprintf(" %-4s \n", substr($result, 0, 4));
        }
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
        // Suppress error output from tput when $TERM is not set
        $cols = trim(shell_exec('tput cols 2>/dev/null')??'');
        $len = is_numeric($cols) ? (int)$cols : 0;

        // If the count of columns is zero, set it to a default value of 80
        if ($len === 0) {
            $len = 80;
        } else {
            // Limit the count of columns to a maximum of 80
            $len = min($len, 80);
        }
        return (string)$len;
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
        // Echo to console
        echo $message;
        
        // Echo to serial ports
        self::echoToTeletype($message, false);
        
        // Log the message to the system log with LOG_INFO level
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $logger->log(LOG_INFO, trim($message));
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
        // Only add location info for non-SystemMessages calls
        if ($ident !== static::class) {
            $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
            $logger->log($level, "$message on $ident");
        } else {
            $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
            $logger->log($level, $message);
        }
    }


    /**
     * Echoes the starting message for a stage.
     *
     * @param string $message The message to echo.
     */
    public static function echoStartMsg(string $message): void
    {
        // Always echo to console first to ensure message appears
        echo $message;
        
        // Echo to serial ports without console echo
        self::echoToTeletype($message, false);
        
        // Log to syslog at debug level
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $logger->log(LOG_DEBUG, trim($message));
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
        
        // Log result to syslog (LOG_DEBUG to reduce noise)
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $resultText = match($result) {
            self::RESULT_DONE => 'completed successfully',
            self::RESULT_FAILED => 'failed',
            self::RESULT_SKIPPED => 'skipped',
            default => $result
        };
        $logger->log(LOG_DEBUG, trim($message) . " - $resultText");
    }

    /**
     * Echoes the result message for a stage with timing information.
     *
     * @param string $message The message to echo.
     * @param string $result The result of the stage.
     * @param float $elapsedTime Time elapsed in seconds.
     */
    public static function echoResultMsgWithTime(string $message, string $result = SystemMessages::RESULT_DONE, float $elapsedTime = 0.0): void
    {
        SystemMessages::teletypeEchoResultWithTime($message, $result, $elapsedTime);
        SystemMessages::echoResultWithTime($message, $result, $elapsedTime);
        
        // Log result to syslog with timing (LOG_DEBUG to reduce noise)
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $resultText = match($result) {
            self::RESULT_DONE => 'completed successfully',
            self::RESULT_FAILED => 'failed',
            self::RESULT_SKIPPED => 'skipped',
            default => $result
        };
        $logger->log(LOG_DEBUG, sprintf("%s - %s (%.2fs)", trim($message), $resultText, $elapsedTime));
    }

    /**
     * Echoes a result message with progress dots and timing information.
     *
     * @param string $message The result message to echo.
     * @param string $result The result status (DONE by default).
     * @param float $elapsedTime Time elapsed in seconds.
     *
     * @return void
     */
    public static function teletypeEchoResultWithTime(string $message, string $result = self::RESULT_DONE, float $elapsedTime = 0.0): void
    {
        $timeStr = sprintf(" (%.2fs)", $elapsedTime);
        $len = max(0, 80 - strlen($message) - 9 - strlen($timeStr));
        $spaces = str_repeat('.', $len);
        $formattedResult = self::getFormattedResultForTeletype($result);
        // Insert timing before the newline in formatted result
        $formattedResultWithTime = str_replace(" \n", "$timeStr \n", $formattedResult);
        self::echoToTeletype($spaces . $formattedResultWithTime);
    }

    /**
     * Echoes a result message with progress dots and timing information.
     *
     * @param string $message The result message to echo.
     * @param string $result The result status (DONE by default).
     * @param float $elapsedTime Time elapsed in seconds.
     *
     * @return void
     */
    public static function echoResultWithTime(string $message, string $result = self::RESULT_DONE, float $elapsedTime = 0.0): void
    {
        $cols = self::getCountCols();
        if (!is_numeric($cols)) {
            // Failed to retrieve the screen width.
            return;
        }
        $timeStr = sprintf(" (%.2fs)", $elapsedTime);
        $len = $cols - strlen($message) - 8 - strlen($timeStr);
        if ($len < 2) {
            // Incorrect screen width.
            return;
        }

        $spaces = str_repeat('.', $len);
        $formattedResult = self::getFormattedResult($result);
        // Insert timing before the newline in formatted result
        $formattedResultWithTime = str_replace(" \n", "$timeStr \n", $formattedResult);
        echo $spaces . $formattedResultWithTime;
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
        $version = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);

        $info = PHP_EOL . $borderLine;
        $info .= PHP_EOL . self::formatLine($header, $lineWidth, 'center');
        $info .= PHP_EOL . self::formatLine("MikoPBX " . $version, $lineWidth, 'center');
        $info .= PHP_EOL . $borderLine;

        $addresses = self::getNetworkAddresses();
        $port = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT);
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
            $webCredentials = self::showWebCredentials($lineWidth);
            if (!empty($webCredentials)) {
                $info .= PHP_EOL . $webCredentials;
                $info .= PHP_EOL . $borderLine;
            }
            $sshCredentials = self::showSSHCredentials($lineWidth);
            if (!empty($sshCredentials)) {
                $info .= PHP_EOL . $sshCredentials;
            }
        }

        $info .= PHP_EOL . $emptyLine . PHP_EOL . $borderLine . PHP_EOL;
        return $info;
    }


    /**
     * Formats a given string to fit within a specified width inside a text box.
     * Returns original content if formatting is impossible due to constraints.
     *
     * @param string $content The text content to be formatted within the line
     * @param int $lineWidth The total width of the line, including the border characters
     * @param string $align The text alignment ('left' or 'center', defaults to 'left')
     * @return string The formatted line or original content if formatting is impossible
     */
    private static function formatLine(string $content, int $lineWidth, string $align = 'left'): string
    {
        // Return original content if line width is too small for box format
        if ($lineWidth < 4) {
            return $content;
        }

        // Calculate available space for content
        $maxContentLength = $lineWidth - 4;  // Subtract border characters "| " and " |"

        // If content is too long, return it unchanged
        if (mb_strlen($content) > $maxContentLength && $lineWidth < mb_strlen($content)) {
            return $content;
        }

        // Truncate content if needed but possible
        if (mb_strlen($content) > $maxContentLength) {
            $content = mb_substr($content, 0, $maxContentLength);
        }

        // Calculate padding
        $padding = $maxContentLength - mb_strlen($content);

        if ($align === 'center') {
            // Center alignment
            $leftPadding = intdiv($padding, 2);
            $rightPadding = $padding - $leftPadding;
            return "| " . str_repeat(' ', $leftPadding) . $content . str_repeat(' ', $rightPadding) . " |";
        }

        // Left alignment
        return "| " . $content . str_repeat(' ', $padding) . " |";
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
        $cloudInstanceId = PbxSettings::getValueByKey(PbxSettings::CLOUD_INSTANCE_ID);
        $webAdminPassword = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD);
        $defaultPassword = PbxSettings::getDefaultArrayValues()[PbxSettings::WEB_ADMIN_PASSWORD];
        $adminUser = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LOGIN);
        
        $info = self::formatLine("Web credentials:", $lineWidth);
        $info .= PHP_EOL . self::formatLine("   Login: $adminUser", $lineWidth);
        
        // Show actual password only if it's default or equals cloudInstanceId
        if ($cloudInstanceId === $webAdminPassword || $webAdminPassword === $defaultPassword) {
            $info .= PHP_EOL . self::formatLine("   Password: $webAdminPassword", $lineWidth);
        } else {
            $info .= PHP_EOL . self::formatLine("   Password: ***********", $lineWidth);
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
        $sshUser = PbxSettings::getValueByKey(PbxSettings::SSH_LOGIN);
        $sshPassword = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD);
        $defaultSshPassword = PbxSettings::getDefaultArrayValues()[PbxSettings::SSH_PASSWORD];
        $sshPort = PbxSettings::getValueByKey(PbxSettings::SSH_PORT);
        $authorizedKeys = PbxSettings::getValueByKey(PbxSettings::SSH_AUTHORIZED_KEYS);
        $disablePassLogin = PbxSettings::getValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD);

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