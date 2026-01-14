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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

/**
 * Class WorkerDhcpv6Renewal
 *
 * This worker is responsible for maintaining DHCPv6 leases on interfaces configured with IPv6 Auto mode.
 * It periodically checks if udhcpc6 processes are running and triggers renewal when needed.
 *
 * Background: BusyBox udhcpc6 doesn't support long-running daemon mode like udhcpc does.
 * After obtaining a lease, udhcpc6 exits instead of staying alive for renewal.
 * This worker implements the renewal logic by:
 * 1. Checking if udhcpc6 process is running for each Auto-configured interface
 * 2. Restarting udhcpc6 if the process has died
 * 3. Periodically triggering renewal by sending SIGUSR1 signal to the process
 *
 * DHCPv6 lease is typically 72 hours. Renewal should happen at lease_time/2 = 36 hours.
 * Worker checks every 12 hours for safety margin and to detect crashed processes.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerDhcpv6Renewal extends WorkerBase
{
    /**
     * Cache interval in seconds (12 hours).
     * DHCPv6 leases are typically 72 hours, renewal at 36 hours.
     * Worker checks cache every 12 hours to trigger renewal or restart failed udhcpc6 processes.
     *
     * Note: WorkerSafeScriptsCore will launch this worker every 60 seconds (KEEP_ALLIVE_CHECK_INTERVAL),
     * but actual work is done only when cache expires (every 12 hours).
     */
    private const int CHECK_INTERVAL_SECONDS = 12 * 3600; // 12 hours

    /**
     * Starts the worker. It checks DHCPv6 client processes and triggers renewal when needed.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @return void
     */
    public function start(array $argv): void
    {
        // Define the cache key for last renewal check
        $cacheKey = 'Workers:WorkerDhcpv6Renewal:lastCheck';

        // Get an instance of the ManagedCacheProvider
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

        // Retrieve the time of the last renewal check from the cache
        $lastCheck = $managedCache->get($cacheKey);

        // If the last check was not performed or it was performed more than CHECK_INTERVAL ago,
        // perform DHCPv6 renewal check and update the cache
        if ($lastCheck === null) {

            // Perform DHCPv6 renewal check
            $this->checkAndRenewDhcpv6Leases();

            // Update the last check time in the cache
            $managedCache->set($cacheKey, time(), self::CHECK_INTERVAL_SECONDS);
        }
    }

    /**
     * Checks all interfaces with IPv6 Auto mode and ensures udhcpc6 is running or triggers renewal.
     *
     * @return void
     */
    private function checkAndRenewDhcpv6Leases(): void
    {
        SystemMessages::sysLogMsg(__METHOD__, 'Starting DHCPv6 renewal check', LOG_NOTICE);

        // Find all interfaces with IPv6 Auto mode (ipv6_mode='1')
        $interfaces = LanInterfaces::find([
            'conditions' => 'ipv6_mode = :mode:',
            'bind' => ['mode' => '1']
        ]);

        SystemMessages::sysLogMsg(__METHOD__, 'Found ' . count($interfaces) . ' interfaces with IPv6 Auto mode', LOG_NOTICE);

        if (count($interfaces) === 0) {
            SystemMessages::sysLogMsg(__METHOD__, 'No interfaces with IPv6 Auto mode found', LOG_NOTICE);
            return;
        }

        foreach ($interfaces as $interface) {
            $ifName = $interface->interface;
            $this->checkInterfaceDhcpv6($ifName);
        }
    }

    /**
     * Checks DHCPv6 client for a specific interface and restarts or renews as needed.
     *
     * @param string $ifName Network interface name (e.g., 'eth0')
     * @return void
     */
    private function checkInterfaceDhcpv6(string $ifName): void
    {
        $pidFile = "/var/run/udhcpc6_$ifName";

        // Debug logging before check
        SystemMessages::sysLogMsg(__METHOD__, "Checking PID file: $pidFile", LOG_DEBUG);

        $fileExists = file_exists($pidFile);
        SystemMessages::sysLogMsg(
            __METHOD__,
            "file_exists() returned: " . ($fileExists ? 'true' : 'false'),
            LOG_DEBUG
        );

        // Check if PID file exists
        if (!$fileExists) {
            // Log directory listing for debugging
            $files = glob('/var/run/udhcpc6*');
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Files in /var/run matching udhcpc6*: " . implode(', ', $files ?: []),
                LOG_DEBUG
            );

            SystemMessages::sysLogMsg(
                __METHOD__,
                "DHCPv6 client not running for $ifName (no PID file), restarting",
                LOG_WARNING
            );
            $this->restartDhcpv6Client($ifName);
            return;
        }

        // Read PID from file
        $pid = trim(file_get_contents($pidFile));

        if (empty($pid) || !is_numeric($pid)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Invalid PID file for $ifName, restarting DHCPv6 client",
                LOG_WARNING
            );
            $this->restartDhcpv6Client($ifName);
            return;
        }

        // Check if process is running
        if (!posix_kill((int)$pid, 0)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "DHCPv6 client process $pid for $ifName has died, restarting",
                LOG_WARNING
            );
            $this->restartDhcpv6Client($ifName);
            return;
        }

        // Process is alive - trigger renewal by sending SIGUSR1 signal
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Triggering DHCPv6 renewal for $ifName (PID: $pid)",
            LOG_INFO
        );

        if (posix_kill((int)$pid, SIGUSR1)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Successfully sent SIGUSR1 to udhcpc6 process $pid for $ifName",
                LOG_DEBUG
            );
        } else {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Failed to send SIGUSR1 to udhcpc6 process $pid for $ifName",
                LOG_ERR
            );
        }
    }

    /**
     * Restarts DHCPv6 client for the specified interface.
     *
     * @param string $ifName Network interface name
     * @return void
     */
    private function restartDhcpv6Client(string $ifName): void
    {
        $udhcpc6 = Util::which('udhcpc6');
        if (empty($udhcpc6)) {
            $busybox = Util::which('busybox');
            if (!empty($busybox)) {
                $udhcpc6 = "$busybox udhcpc6";
            }
        }

        if (empty($udhcpc6)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "udhcpc6 not available, cannot restart DHCPv6 for $ifName",
                LOG_ERR
            );
            return;
        }

        $pidFile = "/var/run/udhcpc6_$ifName";
        $workerPath = '/etc/rc/udhcpc6_configure';

        // Escape shell arguments
        $escapedPidFile = escapeshellarg($pidFile);
        $escapedWorkerPath = escapeshellarg($workerPath);

        // Kill existing process if any
        $killCmd = "killall -9 udhcpc6 2>/dev/null";
        Processes::mwExec($killCmd);

        // Start DHCPv6 client in background
        // Options: -t 6 (attempts), -T 5 (timeout), -S (syslog), -b (background)
        $bgOptions = '-t 6 -T 5 -S -b';
        $bgCommand = "$udhcpc6 $bgOptions -p $escapedPidFile -i $ifName -s $escapedWorkerPath";

        SystemMessages::sysLogMsg(
            __METHOD__,
            "Starting DHCPv6 client for $ifName: $bgCommand",
            LOG_INFO
        );

        Processes::mwExecBg($bgCommand);
    }
}

// Start a worker process
WorkerDhcpv6Renewal::startWorker($argv ?? []);
