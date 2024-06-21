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

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents;

use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadConferenceAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCrondAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFeaturesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadH323Action;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadHepAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadManagerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadModulesConfAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadMOHAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNetworkAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNTPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPBXCoreAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadQueuesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRTPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFirewallAction;
use Phalcon\Di\Injectable;

class ProcessCustomFiles extends Injectable
{
    /**
     * Initializes the Custom files dependency table.
     */
    public static function getDependencyTable(): array
    {
        $tables = [];

        $tables[] = [
            'filePath' => '*',
            'actions' => [
                ReloadPBXCoreAction::class,
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/manager.conf',
            'actions' => [
                ReloadManagerAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/musiconhold.conf',
            'actions' => [
                ReloadMOHAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/confbridge.conf',
            'actions' => [
                ReloadConferenceAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/modules.conf',
            'actions' => [
                ReloadModulesConfAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/hep.conf',
            'actions' => [
                ReloadHepAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/http.conf',
            'actions' => [
                ReloadManagerAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/var/spool/cron/crontabs/root',
            'actions' => [
                ReloadCrondAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/queues.conf',
            'actions' => [
                ReloadQueuesAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/features.conf',
            'actions' => [
                ReloadFeaturesAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/ntp.conf',
            'actions' => [
                ReloadNTPAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/ooh323.conf',
            'actions' => [
                ReloadH323Action::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/rtp.conf',
            'actions' => [
                ReloadRTPAction::class
            ],
        ];

        // Restart network if the file /etc/static-routes was changed
        $tables[] = [
            'filePath' => '/etc/static-routes',
            'actions' => [
                ReloadNetworkAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/openvpn.ovpn',
            'actions' => [
                ReloadNetworkAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/firewall_additional',
            'actions' => [
                ReloadFirewallAction::class
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/fail2ban/jail.local',
            'actions' => [
                ReloadFirewallAction::class
            ],
        ];

        return $tables;
    }
}