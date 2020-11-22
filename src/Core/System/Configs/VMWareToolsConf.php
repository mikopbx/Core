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
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;

class VMWareToolsConf
{
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * VMWareToolsConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }


    /**
     * Configure and starts VMWareTools
     */
    public function configure(): void
    {
        Processes::killByName("vmtoolsd");
        $virtualHW = $this->mikoPBXConfig->getGeneralSettings('VirtualHardwareType');
        if ('VMWARE' === $virtualHW) {
            $conf = "[logging]\n"
                . "log = false\n"
                . "vmtoolsd.level = none\n"
                . ";vmsvc.data = /dev/null\n"
                . "vmsvc.level = none\n";

            $dirVM = '/etc/vmware-tools';
            if(!file_exists($dirVM)){
                Util::mwMkdir($dirVM);
            }

            file_put_contents("{$dirVM}/tools.conf", $conf);
            $vmtoolsdPath = Util::which('vmtoolsd');
            Processes::mwExec("{$vmtoolsdPath} --background=/var/run/vmtoolsd.pid > /dev/null 2> /dev/null");
        }
    }
}