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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Core\System\Util;

class ManagerConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'manager.conf';

    protected function generateConfigProtected(): void
    {
        $vars = [
            'DIALEDPEERNUMBER',
            'BLKVM_CHANNEL',
            'BRIDGEPEER',
            'INTERCHANNEL',
            'FROM_DID',
            'mikoidconf',
            'conf_1c',
            '1cautoanswer',
            'extenfrom1c',
            'spyee',
            'datafrom1c',
            'CDR(lastapp)',
            'CDR(channel)',
            'CDR(src)',
            'CDR(dst)',
            'CDR(recordingfile)',
        ];

        $conf = "[general]\n" .
            "enabled = yes\n" .
            "port = {$this->generalSettings['AMIPort']};\n" .
            "bindaddr = 0.0.0.0\n" .
            "displayconnects = no\n" .
            "allowmultiplelogin = yes\n" .
            "webenabled = yes\n" .
            "timestampevents = yes\n" .
            'channelvars=' . implode(',', $vars) . "\n" .
            "httptimeout = 60\n\n";

        if ($this->generalSettings['AMIEnabled'] === '1') {
            /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $managers */
            /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $user */
            $managers = AsteriskManagerUsers::find();
            $result   = [];
            foreach ($managers as $user) {
                $arr_data = $user->toArray();
                /** @var NetworkFilters $network_filter */
                $network_filter     = NetworkFilters::findFirst($user->networkfilterid);
                $arr_data['permit'] = $network_filter === null ? '' : $network_filter->permit;
                $arr_data['deny']   = $network_filter === null ? '' : $network_filter->deny;
                $result[]           = $arr_data;
            }

            foreach ($result as $user) {
                $conf .= '[' . $user['username'] . "]\n";
                $conf .= 'secret=' . $user['secret'] . "\n";

                if (trim($user['deny']) !== '') {
                    $conf .= 'deny=' . $user['deny'] . "\n";
                }
                if (trim($user['permit']) !== '') {
                    $conf .= 'permit=' . $user['permit'] . "\n";
                }

                $keys  = [
                    'call',
                    'cdr',
                    'originate',
                    'reporting',
                    'agent',
                    'config',
                    'dialplan',
                    'dtmf',
                    'log',
                    'system',
                    'verbose',
                    'user',
                ];
                $read  = '';
                $write = '';
                foreach ($keys as $perm) {
                    if ($user[$perm] === 'readwrite') {
                        $read  .= ('' === $read) ? $perm : ",$perm";
                        $write .= ('' === $write) ? $perm : ",$perm";
                    } elseif ($user[$perm] === 'write') {
                        $write .= ('' === $write) ? $perm : ",$perm";
                    } elseif ($user[$perm] === 'read') {
                        $read .= ('' === $read) ? $perm : ",$perm";
                    }
                }
                if ($read !== '') {
                    $conf .= "read=$read\n";
                }

                if ($write !== '') {
                    $conf .= "write=$write\n";
                }
                $conf .= "eventfilter=!UserEvent: CdrConnector\n";
                $conf .= "eventfilter=!UserEvent: Ping_\n";
                $conf .= "eventfilter=!Event: Newexten\n";
                $conf .= "\n";
            }
            $conf .= "\n";
        }
        $conf .= '[phpagi]' . "\n";
        $conf .= 'secret=phpagi' . "\n";
        $conf .= 'deny=0.0.0.0/0.0.0.0' . "\n";
        $conf .= 'permit=127.0.0.1/255.255.255.255' . "\n";
        $conf .= 'read=all' . "\n";
        $conf .= 'write=all' . "\n";
        $conf .= "eventfilter=!Event: Newexten\n";
        $conf .= "\n";

        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_MANAGER_CONF);
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/manager.conf', $conf);
    }
}