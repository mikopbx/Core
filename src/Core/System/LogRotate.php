<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System;

/**
 * Runs logrotate for one config with a state file of its own.
 *
 * WHY: logrotate >= 3.16 locks its state file. The hourly rotation starts a logrotate per log at
 * once; with the shared /var/lib/logrotate.status all of them but one exited with code 3
 * ("state file is already locked") and skipped the rotation (#1375). A state file per config
 * removes the contention; a log is still rotated by one process at a time because a log
 * has one config and therefore one state file.
 *
 * Rotation by size needs no -f: logrotate rotates a file over the `size` of its section on
 * every run. -f applies to every section of the run and would rotate small and empty logs too.
 *
 * Errors go to syslog: without -v logrotate prints nothing but errors and warnings.
 */
class LogRotate
{
    public const string SYSLOG_TAG = 'logrotate';

    /**
     * Characters logrotate does not read literally in a quoted path: it expands globs (*?[] and
     * the \ escape) even in quotes, a brace breaks the section, a quote or a control character
     * ends the name. Spaces, non-ASCII and the other punctuation are read literally.
     */
    private const string UNSAFE_PATH_REGEX = '#[*?\[\]{}"\\\\\x00-\x1F\x7F]#';

    /**
     * Returns the state file of a config: the config path with .status instead of .conf.
     *
     * @param string $confPath Path to the logrotate config
     * @return string
     */
    public static function getStatePath(string $confPath): string
    {
        return preg_replace('/\.conf$/', '', $confPath) . '.status';
    }

    /**
     * Starts logrotate for the config in the background.
     * A non-zero exit code or any output (errors and warnings) goes to syslog.
     *
     * @param string $confPath Path to the logrotate config
     * @return void
     */
    public static function runInBackground(string $confPath): void
    {
        $logger = Util::which('logger');
        $sh = Util::which('sh');

        // The output is collected, not piped: logrotate keeps its exit code and gets no SIGPIPE
        $command = 'out=$(' . self::buildCommand($confPath) . ' 2>&1); rc=$?; '
            . 'if [ "$rc" -ne 0 ] || [ -n "$out" ]; then '
            . "$logger -t " . self::SYSLOG_TAG . ' ' . escapeshellarg("logrotate $confPath exited with code ")
            . '"$rc: $out"; fi';
        Processes::mwExecBg("$sh -c " . escapeshellarg($command));
    }

    /**
     * Runs logrotate for the config and waits for it.
     * A non-zero exit code or any output (errors and warnings) goes to syslog.
     *
     * @param string $confPath Path to the logrotate config
     * @return bool True if logrotate exited with code 0
     */
    public static function run(string $confPath): bool
    {
        $output = [];
        $exitCode = 0;
        Processes::mwExec(self::buildCommand($confPath), $output, $exitCode);
        if ($exitCode !== 0 || $output !== []) {
            $details = implode('; ', $output);
            SystemMessages::sysLogMsg(
                self::SYSLOG_TAG,
                "logrotate $confPath exited with code $exitCode: $details",
                LOG_WARNING
            );
        }
        return $exitCode === 0;
    }

    /**
     * Builds the logrotate command for the config with its own state file.
     *
     * @param string $confPath Path to the logrotate config
     * @return string
     */
    private static function buildCommand(string $confPath): string
    {
        return Util::which('logrotate')
            . ' -s ' . escapeshellarg(self::getStatePath($confPath))
            . ' ' . escapeshellarg($confPath);
    }

    /**
     * Checks that logrotate reads the path literally.
     *
     * @param string $path Path to a log file
     * @return bool
     */
    public static function isSafePath(string $path): bool
    {
        return $path !== '' && preg_match(self::UNSAFE_PATH_REGEX, $path) === 0;
    }

    /**
     * Builds the config that rotates module log files.
     *
     * @param array<string> $logFiles Paths of the log files, each one safe (see isSafePath())
     * @return string Config text, or an empty string if there is nothing to rotate
     */
    public static function buildModuleConfig(array $logFiles): string
    {
        if ($logFiles === []) {
            return '';
        }

        $textConfig = '';
        foreach ($logFiles as $file) {
            $textConfig .= '"' . $file . '"' . PHP_EOL;
        }

        $textConfig .= '{
    start 0
    rotate 9
    size 10M
    maxsize 10M
    daily
    missingok
    notifempty
    copytruncate
    compress
    delaycompress
    compresscmd /bin/gzip
    compressext .gz
}' . PHP_EOL;

        return $textConfig;
    }
}
