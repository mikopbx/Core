<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class SipNotifyConf extends ConfigClass
{
    protected $description = 'sip_notify.conf';

    protected function generateConfigProtected(): void
    {
        // Ребут телефонов Yealink.
        // CLI> sip notify yealink-reboot autoprovision_user
        // autoprovision_user - id sip учетной записи.
        $conf = '';
        $conf .= "[yealink-reboot]\n" .
            "Event=>check-sync\;reboot=true\n" .
            "Content-Length=>0\n";
        $conf .= "\n";

        $conf .= "[snom-reboot]\n" .
            "Event=>check-sync\;reboot=true\n" .
            $conf .= "\n";
        // Пример
        // CLI> sip notify yealink-action-ok autoprovision_user
        // http://support.yealink.com/faq/faqInfo?id=173
        $conf .= "[yealink-action-ok]\n" .
            "Content-Type=>message/sipfrag\n" .
            "Event=>ACTION-URI\n" .
            "Content=>key=SPEAKER\n";

        Util::fileWriteContent($this->config->path('asterisk.confDir') . '/sip_notify.conf', $conf);
    }
}