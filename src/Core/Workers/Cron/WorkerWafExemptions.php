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

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Cron;

require_once 'Globals.php';

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\WafProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Di;
use Throwable;

/**
 * Periodic WAF exemption republisher.
 *
 * Cron-invoked one-shot that rebuilds the
 * `_PH_REDIS_CLIENT:waf:exemptions` hash from the on-disk source of truth
 * (Core REST controller attributes and enabled-module `ConfigClass`
 * declarations) by calling {@see \MikoPBX\PBXCoreREST\Lib\Waf\WafRegistry::rebuildAll()}.
 *
 * Why a periodic rebuild exists at all:
 *   Redis on MikoPBX is configured without persistence and is managed by
 *   Monit, which restarts the service automatically on crash/upgrade. The
 *   rest of the system self-heals after such a restart (sessions reload,
 *   queues drain and refill, firewall workers republish blocked/whitelist
 *   data). The WAF exemption hash, however, is otherwise written only at
 *   `SystemLoader::startMikoPBX()` boot time — so after a Redis restart it
 *   would stay empty until the next full PBX reboot, breaking Core
 *   endpoints such as `system:executeSqlRequest`,
 *   `system:executeBashCommand`, dialplan-applications saves, and
 *   custom-files saves whose request bodies legitimately contain SQL or
 *   shell-shaped tokens.
 *
 * Resolution window after Redis loss is bounded to the cron interval
 * (one minute) plus the Lua shared-dict TTL (10 s).
 *
 * Idempotent: rebuildAll() issues `DEL` + `HSET` and overwrites any
 * existing hash entries.
 */
final class WorkerWafExemptions
{
    public static function start(): void
    {
        try {
            $di = Di::getDefault();
            if ($di === null) {
                return;
            }
            $registry = $di->getShared(WafProvider::SERVICE_NAME);
            $registry->rebuildAll();
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                self::class,
                'rebuildAll failed: ' . $e->getMessage(),
                LOG_WARNING
            );
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }
}

WorkerWafExemptions::start();
