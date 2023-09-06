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


use MikoPBX\Core\System\Util;

class SipNotifyConf extends CoreConfigClass
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
            "Content-Length=>0\n" .
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
            "Content=>key=SPEAKER\n" .
            "Content=>\n\n";

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/pjsip_notify.conf', $conf);
    }
}