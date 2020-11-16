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
use Phalcon\Di;
use Phalcon\Di\Injectable;

class BeanstalkConf extends Injectable
{
    /**
     * Restarts Beanstalk server
     */
    public function reStart(): void
    {
        $config = $this->getDI()->get('config')->beanstalk;

        $beanstalkdPath = Util::which('beanstalkd');
        $conf = "-l {$config->host} -p {$config->port} -z 524280";
        if (Util::isSystemctl()) {
            $systemCtrlPath = Util::which('systemctl');
            Util::mwExec("{$systemCtrlPath} restart beanstalkd.service");
        } else {
            Util::killByName('beanstalkd');
            Util::mwExecBg("{$beanstalkdPath} {$conf}");
        }
        while (true) {
            $pid = Util::getPidOfProcess('beanstalkd');
            if (empty($pid)) {
                Util::echoWithSyslog(' - Wait for start beanstalkd deamon ...' . PHP_EOL);
                sleep(2);
            } else {
                break;
            }
        }
    }
}