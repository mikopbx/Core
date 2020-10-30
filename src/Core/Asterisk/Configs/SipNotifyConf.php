<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class SipNotifyConf extends ConfigClass
{
    protected string $description = 'sip_notify.conf';

    protected function generateConfigProtected(): void
    {
        // Ребут телефонов Yealink.
        // CLI> sip notify yealink-reboot autoprovision_user
        // autoprovision_user - id sip учетной записи.
        $conf = '';
        $conf .= "[yealink-reboot]\n" .
            "Event=>check-sync\;reboot=true\n" .
            "Content-Length=>0\n".
            "Content=>\n\n";

        $conf .= "[snom-reboot]\n" .
            "Event=>check-sync\;reboot=true\n" .
            "Content=>\n\n";
        // Пример
        // CLI> sip notify yealink-action-ok autoprovision_user
        // http://support.yealink.com/faq/faqInfo?id=173
        $conf .= "[yealink-action-ok]\n" .
            "Content-Type=>message/sipfrag\n" .
            "Event=>ACTION-URI\n" .
            "Content=>key=SPEAKER\n".
            "Content=>\n\n";

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/pjsip_notify.conf', $conf);
    }
}