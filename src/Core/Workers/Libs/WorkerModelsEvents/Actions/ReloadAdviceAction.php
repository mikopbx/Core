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

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckAmiPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckFirewalls;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSIPPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHConfig;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckWebPasswords;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use Phalcon\Di\Di;

class ReloadAdviceAction implements ReloadActionInterface
{
    /**
     * Cleans up cache for advice after changing any models.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $di = Di::getDefault();
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);

        foreach ($parameters as $record) {
            $cacheKeys = [];
            switch ($record['model']) {
                case PbxSettings::class:
                    switch ($record['recordId']) {
                        case PbxSettings::SSH_PASSWORD_HASH_STRING:
                        case PbxSettings::SSH_PASSWORD:
                        case PbxSettings::SSH_PASSWORD_HASH_FILE:
                            $cacheKeys[WorkerPrepareAdvice::getCacheKey(CheckSSHPasswords::class)] = true;
                            $cacheKeys[WorkerPrepareAdvice::getCacheKey(CheckSSHConfig::class)] = true;
                            break;
                        case PbxSettings::WEB_ADMIN_PASSWORD:
                            $cacheKeys[WorkerPrepareAdvice::getCacheKey(CheckWebPasswords::class)] = true;
                            break;
                        case PbxSettings::PBX_FIREWALL_ENABLED:
                            $cacheKeys[WorkerPrepareAdvice::getCacheKey(CheckFirewalls::class)] = true;
                            break;
                        default:
                    }
                    break;
                case AsteriskManagerUsers::class:
                    $cacheKeys[WorkerPrepareAdvice::getCacheKey(CheckAmiPasswords::class)] = true;
                    break;
                case Sip::class:
                    $cacheKeys[WorkerPrepareAdvice::getCacheKey(CheckSIPPasswords::class)] = true;
                    break;
                case NetworkFilters::class:
                    $cacheKeys[WorkerPrepareAdvice::getCacheKey(CheckFirewalls::class)] = true;
                    break;
                default:
            }
            foreach ($cacheKeys as $cacheKey => $value) {
                $managedCache->delete($cacheKey);
            }
        }
    }
}