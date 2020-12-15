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

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Util;
use Throwable;

require_once 'Globals.php';

/**
 * Class WorkerCheckFail2BanAlive check fail2ban service is alive
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerCheckFail2BanAlive extends WorkerBase
{
    public function start($params): void
    {
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $lastFail2BanCheck = $managedCache->get('lastFail2BanCheck');
        if ($lastFail2BanCheck === null) {
            Fail2BanConf::checkFail2ban();
            $managedCache->set('lastFail2BanCheck', time(), 300); // Check every 5 minute
        }
    }
}

// Start worker process
$workerClassname = WorkerCheckFail2BanAlive::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage(),LOG_ERR);
    }
}




