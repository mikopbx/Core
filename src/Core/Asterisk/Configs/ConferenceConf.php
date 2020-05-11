<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Core\Modules\Config\ConfigClass;


class ConferenceConf extends ConfigClass
{

    /**
     * Возвращает включения в контекст internal
     *
     * @return string
     */
    public function getIncludeInternal(): string
    {
        // Включаем контексты.
        $conf = '';

        // $conf.= "include => conference-rooms \n";
        return $conf;
    }

    /**
     * Возвращает включения в контекст internal-transfer
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string
    {
        // Генерация внутреннего номерного плана.
        $result = '';

        // $result.= "include => conference-rooms \n";
        return $result;
    }

    /**
     * Возвращает номерной план для internal контекста.
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        $conf = '';
        $data = ConferenceRooms::find(['order' => 'extension']);
        foreach ($data as $conference) {
            $conf .= "exten => {$conference->extension},1,Goto(conference-rooms,{$conference->extension},1)" . "\n";
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
        $data = ConferenceRooms::find(['order' => 'extension']);
        foreach ($data as $conference) {
            $conf .= "exten => {$conference->extension},1,Goto(conference-rooms,{$conference->extension},1)" . "\n";
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
        $PBXRecordCalls = $this->mikoPBXConfig->getGeneralSettings('PBXRecordCalls');
        $rec_options    = ($PBXRecordCalls === '1') ? 'r' : '';

        // Генерация внутреннего номерного плана.
        $conf = '';
        $conf .= "[conference-rooms] \n";
        $data = ConferenceRooms::find(['order' => 'extension']);
        foreach ($data as $conference) {
            $conf .= 'exten => ' . $conference->extension . ',1,NoOp(---)' . "\n\t";
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
        $data = ConferenceRooms::find(['order' => 'extension']);
        foreach ($data as $conference) {
            $conf .= "exten => {$conference->extension},hint,Custom:{$conference->extension} \n";
        }

        return $conf;
    }

}