<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2020
 *
 */

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;
use Phalcon\Di;
use Phalcon\Di\Injectable;

class BeanstalkConf extends Injectable
{
    public const PROC_NAME='beanstalkd';
    /**
     * Restarts Beanstalk server
     */
    public function reStart(): void
    {
        $config = $this->getDI()->get('config')->beanstalk;

        $beanstalkdPath = Util::which(self::PROC_NAME);
        $conf = "-l {$config->host} -p {$config->port} -z 524280";
        if (Util::isSystemctl()) {
            $systemCtrlPath = Util::which('systemctl');
            Processes::mwExec("{$systemCtrlPath} restart beanstalkd.service");
        } else {
            Processes::killByName(self::PROC_NAME);
            Processes::mwExecBg("{$beanstalkdPath} {$conf}");
        }
        while (true) {
            $pid = Processes::getPidOfProcess(self::PROC_NAME);
            if (empty($pid)) {
                Util::echoWithSyslog(' - Wait for start beanstalkd deamon ...' . PHP_EOL);
                sleep(2);
            } else {
                break;
            }
        }
    }
}