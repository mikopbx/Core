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
        $rec_options    = ($PBXRecordCalls === '1') ? 'r' : '';

        // Генерация внутреннего номерного плана.
        $conf = '';
        $conf .= "[hangup_handler_meetme]\n\n";
        $conf .= "exten => s,1,AGI(cdr_connector.php,hangup_chan_meetme)\n\t";
        $conf .= "same => n,return\n\n";
        $conf .= "[conference-rooms] \n";
        $data = self::getConferenceExtensions();
        foreach ($data as $conference) {
            $conf .= 'exten => ' . $conference . ',1,NoOp(---)' . "\n\t";
            $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Hangup())' . "\n\t";
            $conf .= 'same => n,AGI(cdr_connector.php,meetme_dial)' . "\n\t";
            $conf .= 'same => n,Answer()' . "\n\t";
            $conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler_meetme,s,1)' . "\n\t";
            $conf .= 'same => n,Meetme(${EXTEN},qdMT' . $rec_options . ')' . "\n\t";
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
    public static function getConferenceExtensions():array{
        $confExtensions = [];
        $conferences = ConferenceRooms::find(['order' => 'extension', 'columns' => 'extension'])->toArray();
        foreach ($conferences as $conference){
            $confExtensions[] = $conference['extension'];
        }
        return $confExtensions;
    }

}