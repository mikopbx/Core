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


use MikoPBX\Core\System\Util;

/**
 * Class SipNotifyConf
 *
 * Represents the sip_notify.conf configuration file.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class SipNotifyConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'sip_notify.conf';

    /**
     * Generate the configuration content for sip_notify.conf.
     *
     * This method generates the configuration content for the sip_notify.conf file,
     * including the definitions for Yealink and Snom phone notifications.
     */
    protected function generateConfigProtected(): void
    {
        // Yealink phone reboot notification
        // CLI> sip notify yealink-reboot autoprovision_user
        // autoprovision_user - id sip account
        $conf = '';
        $conf .= "[yealink-reboot]\n" .
            "Event=>check-sync\;reboot=true\n" .
            "Content-Length=>0\n" .
            "Content=>\n\n";

        // Snom phone reboot notification
        $conf .= "[snom-reboot]\n" .
            "Event=>check-sync\;reboot=true\n" .
            "Content=>\n\n";

        // Yealink action OK notification
        $conf .= "[yealink-action-ok]\n" .
            "Content-Type=>message/sipfrag\n" .
            "Event=>ACTION-URI\n" .
            "Content=>key=SPEAKER\n" .
            "Content=>\n\n";

        // Example
        // CLI> sip notify yealink-action-ok autoprovision_user
        // http://support.yealink.com/faq/faqInfo?id=173

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/pjsip_notify.conf', $conf);
    }
}