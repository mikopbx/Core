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

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\Sip\GetPeersStatusesAction;
/**
 * The WorkerCurrentPageEvents class is responsible for tracking current page events.
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerCurrentPageEvents extends WorkerBase
{
    const array PAGE_API_MAPPING = [
        'AdminCabinet/Extensions/Index' => [
            GetPeersStatusesAction::class=>[
                'method'=>'main',
                'params'=>[],
                'interval'=>10,
            ],
        ],
    ];

    // $redis is inherited from WorkerBase (protected mixed $redis = null).
    // Do NOT redeclare — PHP 8.2+ covariance rules require the type to match.

    /**
     * Starts the process to track current page events.
     * TODO: можно реализовать отправку событий на фронт отслеживая
     * на каких страницах находятся пользователи и отправляя события на соответствующие страницы
     * с определенным интервалом
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        // Initialize Redis explicitly — WorkerBase declares $redis = null
        // to suppress Injectable::__get() magic (issue #1022).
        $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
        foreach (self::PAGE_API_MAPPING as $pageName => $apiMapping) {
            $viewers = $this->redis->sMembers("page:{$pageName}:viewers");
            if (!empty($viewers)) {
                foreach ($apiMapping as $apiClass => $apiParams) {
                    $apiClass::{$apiParams['method']}($apiParams['params']);
                }
                foreach ($viewers as $viewer) {
                    $this->redis->expire("page:{$pageName}:viewers:{$viewer}", 300);
                }
            }
        }
    }  
}

// Start a worker process
WorkerCurrentPageEvents::startWorker($argv ?? []);
