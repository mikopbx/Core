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

class RtpConf extends AsteriskConfigClass
{
    protected string $description = 'rtp.conf';

    protected function generateConfigProtected(): void
    {
        $stunConfig = '';
        $stun = trim($this->generalSettings['RTPStunServer']??'');
        if(!empty($stun)){
            $stunConfig = "stunaddr=$stun".PHP_EOL;
        }
        $conf = "[general]\n" .
            $stunConfig.
            "rtpstart={$this->generalSettings['RTPPortFrom']}".PHP_EOL.
            "rtpend={$this->generalSettings['RTPPortTo']}".PHP_EOL.
            PHP_EOL;

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/rtp.conf', $conf);
    }
}