<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class ManagerConf extends ConfigClass
{
    protected $description = 'manager.conf';

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

        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->generateManagerConf();
        }
        Util::fileWriteContent($this->config->path('asterisk.confDir') .'/manager.conf', $conf);
    }
}