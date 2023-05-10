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

use MikoPBX\Core\System\Util;

class ExtensionsInterception extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 610;

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
                // Нужно проверить значение M_DIALSTATUS в канале INTECEPTION_CNANNEL
                // Если вызов отвечен, то перехватывать не следует.
                'same => n,Set(M_DIALSTATUS=${IMPORT(${INTECEPTION_CNANNEL},M_DIALSTATUS)})'.PHP_EOL."\t".
                'same => n,ExecIf($[ "${M_DIALSTATUS}" == "ANSWER" ]?Hangup())'.PHP_EOL."\t".
                'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . PHP_EOL."\t".
                'same => n,Set(FROM_CHAN=${INTECEPTION_CNANNEL})' . PHP_EOL."\t".
                'same => n,Set(MASTER_CHANNEL(M_TIMEOUT_CHANNEL)=${INTECEPTION_CNANNEL})' . PHP_EOL."\t".
                'same => n,Gosub(set-answer-state,${EXTEN},1)' . PHP_EOL."\t".
                'same => n,Gosub(dial_interception,${EXTEN},1)' . PHP_EOL."\t".
                'same => n,Gosub(dial_answer,${EXTEN},1)' . PHP_EOL."\t".
                'same => n,Bridge(${INTECEPTION_CNANNEL},Tk)' . PHP_EOL."\t".
                'same => n,Hangup()' . PHP_EOL;
    }

    public static function testOriginate($providerId = 'SIP-1611151795', $src = '203', $dest_number = '79257184233'):void{
        $am = Util::getAstManager('off');
        $channels=$am->GetChannels();
        $interceptionChannel = '';
        foreach ($channels as $linkedId => $linkedIdData){
            foreach ($linkedIdData as $tmpChannel){
                if(strpos($tmpChannel, 'PJSIP/'.$providerId) === false){
                    continue;
                }
                $interceptionChannel  = $tmpChannel;
                $interceptionLinkedId = $linkedId;
            }
        }
        if(empty($interceptionChannel)){
            Util::sysLogMsg('Interception', "Chan for $providerId not found...");
            return;
        }
        $variable    = "pt1c_cid={$dest_number},ALLOW_MULTY_ANSWER=1,_INTECEPTION_CNANNEL={$interceptionChannel},_OLD_LINKEDID={$interceptionLinkedId}";
        $channel     = "Local/{$src}@internal-originate";
        $context     = 'interception-bridge';
        $am->Originate($channel, $dest_number, $context, '1', null, null, null, $src, $variable, null, false);
    }
}