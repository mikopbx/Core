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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Util;

/**
 * Class ManagerConf
 *
 * Represents the configuration for manager.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class ManagerConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'manager.conf';

    /**
     * Generates the configuration for manager.conf.
     */
    protected function generateConfigProtected(): void
    {
        // List of channel variables
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

        // Generate the configuration content
        $conf = "[general]\n" .
            "enabled = yes\n" .
            "port = {$this->generalSettings[PbxSettingsConstants::AMI_PORT]};\n" .
            "bindaddr = 0.0.0.0\n" .
            "displayconnects = no\n" .
            "allowmultiplelogin = yes\n" .
            "webenabled = yes\n" .
            "timestampevents = yes\n" .
            'channelvars=' . implode(',', $vars) . "\n" .
            "httptimeout = 60\n\n";

        if ($this->generalSettings[PbxSettingsConstants::AMI_ENABLED] === '1') {
            // Fetch the Asterisk manager users
            /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $managers */
            /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $user */
            $managers = AsteriskManagerUsers::find();
            $result   = [];

            // Iterate through each manager user
            foreach ($managers as $user) {
                $arr_data = $user->toArray();

                // Fetch the associated network filter
                /** @var NetworkFilters $network_filter */
                $network_filter     = NetworkFilters::findFirst($user->networkfilterid);
                $arr_data['permit'] = $network_filter === null ? '' : $network_filter->permit;
                $arr_data['deny']   = $network_filter === null ? '' : $network_filter->deny;
                $result[]           = $arr_data;
            }

            // Generate configuration for each manager user
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
                    'command',
                    'verbose',
                    'user',
                ];
                $read  = '';
                $write = '';

                // Generate read and write permissions
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

                // Exclude specific events from the user
                $conf .= "eventfilter=!UserEvent: CdrConnector\n";
                $conf .= "eventfilter=!UserEvent: Ping_\n";
                $conf .= "eventfilter=!Event: Newexten\n";
                $conf .= "\n";
            }
            $conf .= "\n";
        }

        // Configuration for phpagi user
        $conf .= '[phpagi]' . "\n";
        $conf .= 'secret=phpagi' . "\n";
        $conf .= 'deny=0.0.0.0/0.0.0.0' . "\n";
        $conf .= 'permit=127.0.0.1/255.255.255.255' . "\n";
        $conf .= 'read=all' . "\n";
        $conf .= 'write=all' . "\n";
        $conf .= "eventfilter=!Event: Newexten\n";
        $conf .= "\n";

        // Call the hook modules method for generating additional configuration
        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_MANAGER_CONF);

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/manager.conf', $conf);
    }
}