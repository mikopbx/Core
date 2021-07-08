<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;

class ExtensionsInterception extends CoreConfigClass
{
    /**
     * Prepares additional contexts sections in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        return  '[interception-bridge]' . PHP_EOL.
                'exten => failed,1,Hangup()' . PHP_EOL.
                'exten => _[0-9*#+a-zA-Z][0-9*#+a-zA-Z]!,1,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?Wait(0.2))' . PHP_EOL."\t".
                'same => n,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?ChannelRedirect(${ORIGINATE_SRC_CHANNEL},${CONTEXT},${ORIGINATE_DST_EXTEN},1))' . PHP_EOL."\t".
                'same => n,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?Hangup())' . PHP_EOL."\t".
                'same => n,Set(MASTER_CHANNEL(M_TIMEOUT_CHANNEL)=${INTECEPTION_CNANNEL})' . PHP_EOL."\t".
                'same => n,AGI(/usr/www/src/Core/Asterisk/agi-bin/clean_timeout.php)' . PHP_EOL."\t".
                'same => n,Gosub(dial_interception,${EXTEN},1)' . PHP_EOL."\t".
                'same => n,Gosub(dial_answer,${EXTEN},1)' . PHP_EOL."\t".
                'same => n,Bridge(${INTECEPTION_CNANNEL},tk)' . PHP_EOL."\t".
                'same => n,Hangup()' . PHP_EOL;
    }

}