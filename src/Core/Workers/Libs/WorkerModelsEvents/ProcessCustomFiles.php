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

use MikoPBX\Core\Workers\WorkerModelsEvents;
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
            'functions' => [
                WorkerModelsEvents::R_PBX_CORE_RELOAD,
                WorkerModelsEvents::R_ADVICE,
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/manager.conf',
            'functions' => [
                WorkerModelsEvents::R_MANAGERS
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/musiconhold.conf',
            'functions' => [
                WorkerModelsEvents::R_MOH
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/modules.conf',
            'functions' => [
                WorkerModelsEvents::R_MODULES_CONF
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/hep.conf',
            'functions' => [
                WorkerModelsEvents::R_HEP
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/http.conf',
            'functions' => [
                WorkerModelsEvents::R_MANAGERS
            ],
        ];

        $tables[] = [
            'filePath' => '/var/spool/cron/crontabs/root',
            'functions' => [
                WorkerModelsEvents::R_CRON
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/queues.conf',
            'functions' => [
                WorkerModelsEvents::R_QUEUES
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/features.conf',
            'functions' => [
                WorkerModelsEvents::R_FEATURES
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/ntp.conf',
            'functions' => [
                WorkerModelsEvents::R_NTP
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/ooh323.conf',
            'functions' => [
                WorkerModelsEvents::R_H323
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/asterisk/rtp.conf',
            'functions' => [
                WorkerModelsEvents::R_RTP
            ],
        ];

        // Restart network if the file /etc/static-routes was changed
        $tables[] = [
            'filePath' => '/etc/static-routes',
            'functions' => [
                WorkerModelsEvents::R_NETWORK
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/openvpn.ovpn',
            'functions' => [
                WorkerModelsEvents::R_NETWORK
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/firewall_additional',
            'functions' => [
                WorkerModelsEvents::R_FIREWALL
            ],
        ];

        $tables[] = [
            'filePath' => '/etc/fail2ban/jail.local',
            'functions' => [
                WorkerModelsEvents::R_FIREWALL
            ],
        ];

        return $tables;
    }
}