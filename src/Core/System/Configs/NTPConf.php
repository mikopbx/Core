<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */
namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class NTPConf extends Injectable
{
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * NTPConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Setup ntp daemon
     */
    public function configure(): void
    {
        $ntp_server = $this->mikoPBXConfig->getGeneralSettings('NTPServer');
        if ( ! empty($ntp_server)) {
            $ntp_conf = "server {$ntp_server}";
        } else {
            $ntp_conf = 'server 0.pool.ntp.org
server 1.pool.ntp.org
server 2.pool.ntp.org';
        }
        Util::fileWriteContent('/etc/ntp.conf', $ntp_conf);

        if (Util::isSystemctl()) {
            return;
        }
        Util::killByName("ntpd");
        usleep(500000);
        $manual_time = $this->mikoPBXConfig->getGeneralSettings('PBXManualTimeSettings');
        if ($manual_time !== '1') {
            $ntpdPath = Util::which('ntpd');
            Util::mwExec($ntpdPath);
        }
    }
}
