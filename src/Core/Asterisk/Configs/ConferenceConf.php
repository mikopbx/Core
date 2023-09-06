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

use MikoPBX\Common\Models\ConferenceRooms;


class ConferenceConf extends CoreConfigClass
{

    protected string $description = 'confbridge.conf';
    protected function generateConfigProtected(): void
    {
        $conf = "";
        file_put_contents($this->config->path('asterisk.astetcdir') . '/confbridge.conf', $conf);
    }

    /**
     * Возвращает номерной план для internal контекста.
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        $conf = '';
        $data = self::getConferenceExtensions();
        foreach ($data as $conference) {
            $conf .= "exten => {$conference},1,Goto(conference-rooms,{$conference},1)" . "\n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * @return string
     */
    public function extensionGenInternalTransfer(): string
    {
        $conf = '';
        $data = self::getConferenceExtensions();
        foreach ($data as $conference) {
            $conf .= "exten => {$conference},1,Goto(conference-rooms,{$conference},1)" . "\n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Генерация дополнительных контекстов.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        $PBXRecordCalls = $this->generalSettings['PBXRecordCalls'];
        // Генерация внутреннего номерного плана.
        $conf  = "[hangup_handler_meetme]\n\n";
        $conf .= "exten => s,1,AGI(cdr_connector.php,hangup_chan_meetme)\n\t";
        $conf .= "same => n,return\n\n";
        $conf .= "[conference-rooms] \n";
        $data = $this->getConferences();
        foreach ($data as $conference => $pin) {
            $conf .= 'exten => ' . $conference . ',1,NoOp(---)' . "\n\t";
            // Если это Local канал, к примеру вызов через IVR, то попробуем корректно перенаправить вызов.
            // Ищем реальный канал. Local будут отправлены в hangup
            $conf .= 'same => n,Set(bridgePeer=${CHANNEL})' . "\n\t";
            $conf .= 'same => n,Set(i=1)' . "\n\t";
            $conf .= 'same => n,While($[${i} < 10])' . "\n\t";
            $conf .= 'same => n,ExecIf($[ "${bridgePeer:0:5}" != "Local" ]?ExitWhile())' . "\n\t";
            $conf .= 'same => n,ExecIf($[ "${bridgePeer:0:5}" == "Local" ]?Set(pl=${IF($["${CHANNEL:-1}" == "1"]?2:1)}))' . "\n\t";
            $conf .= 'same => n,ExecIf($[ "${bridgePeer:0:5}" == "Local" ]?Set(bridgePeer=${IMPORT(${CUT(bridgePeer,\;,1)}\;${pl},BRIDGEPEER)}))' . "\n\t";
            $conf .= 'same => n,ExecIf($[ "${bridgePeer}x" == "x" ]?ExitWhile())' . "\n\t";
            $conf .= 'same => n,Set(i=$[${i} + 1])' . "\n\t";
            $conf .= 'same => n,EndWhile' . "\n\t";
            $conf .= 'same => n,ExecIf($[ "${bridgePeer}" != "${CHANNEL}" && "${bridgePeer:0:5}" != "Local" && "${bridgePeer}x" != "x" ]?ChannelRedirect(${bridgePeer},${CONTEXT},${EXTEN},${PRIORITY}))' . "\n\t";

            // Если всеже это Local и не вышло определить оригинальный канал, то завершаем вызов.
            $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Hangup())' . "\n\t";
            // В конференцию попадет лишь реальный канал PJSIP
            $conf .= 'same => n,AGI(cdr_connector.php,meetme_dial)' . "\n\t";
            $conf .= 'same => n,Answer()' . "\n\t";
            $conf .= 'same => n,Gosub(set-answer-state,${EXTEN},1)' . PHP_EOL."\t";
            $conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler_meetme,s,1)' . "\n\t";
            if($PBXRecordCalls === '1'){
                // Запускаем запись разговоров.
                $conf .= 'same => n,Set(CONFBRIDGE(bridge,record_file)=${MEETME_RECORDINGFILE}.wav)' . "\n\t";
                $conf .= 'same => n,Set(CONFBRIDGE(bridge,record_file_timestamp)=false)' . "\n\t";
                $conf .= 'same => n,Set(CONFBRIDGE(bridge,record_conference)=yes)' . "\n\t";
            }
            $conf .= 'same => n,Set(CONFBRIDGE(bridge,video_mode)=follow_talker)' . "\n\t";
            $conf .= 'same => n,Set(CONFBRIDGE(user,talk_detection_events)=yes)' . "\n\t";
            $conf .= 'same => n,Set(CONFBRIDGE(user,quiet)=yes)' . "\n\t";
            if(!empty($pin)){
                $conf .= "same => n,Set(CONFBRIDGE(user,pin)=$pin)" . "\n\t";
            }
            $conf .= 'same => n,Set(CONFBRIDGE(user,music_on_hold_when_empty)=yes)' . "\n\t";
            $conf .= 'same => n,ConfBridge(${EXTEN})' . "\n\t";
            $conf .= 'same => n,Hangup()' . "\n\n";
        }

        return $conf;
    }

    /**
     * Генерация хинтов.
     *
     * @return string
     */
    public function extensionGenHints(): string
    {
        $conf = '';
        $data = self::getConferenceExtensions();
        foreach ($data as $conference) {
            $conf .= "exten => {$conference},hint,Custom:{$conference} \n";
        }

        return $conf;
    }

    /**
     * Возвращает массив номеров конференц комнат.
     * @return array
     */
    public static function getConferenceExtensions():array
    {
        $confExtensions = [];
        $filter = [
            'order' => 'extension',
            'columns' => 'extension'
        ];

        $conferences = ConferenceRooms::find($filter)->toArray();
        foreach ($conferences as $conference){
            $confExtensions[] = $conference['extension'];
        }
        return $confExtensions;
    }

    /**
     * Возвращает массив номеров конференц комнат.
     * @return array
     */
    private function getConferences():array
    {
        $confExtensions = [];
        $filter = [
            'order' => 'extension',
            'columns' => 'extension,pinCode'
        ];

        $conferences = ConferenceRooms::find($filter)->toArray();
        foreach ($conferences as $conference){
            $confExtensions[$conference['extension']] = $conference['pinCode'];
        }
        return $confExtensions;
    }

}