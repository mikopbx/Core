<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\{IvrMenu, IvrMenuActions, SoundFiles};
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\{Util};

class IVRConf extends ConfigClass
{

    /**
     * Генерация дополнительных контекстов.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        $db_data           = IvrMenu::find()->toArray();
        // Генерация внутреннего номерного плана.
        $conf = '';
        foreach ($db_data as $ivr) {
            /** @var \MikoPBX\Common\Models\SoundFiles $res */
            $res           = SoundFiles::findFirst($ivr['audio_message_id']);
            $audio_message = $res === null ? '' : $res->path;

            $timeout_wait_exten = max($ivr['timeout'], 0);
            if (file_exists($audio_message)) {
                $audio_message = Util::trimExtensionForFile($audio_message);
            } else {
                $audio_message = 'vm-enter-num-to-call';
            }
            $try_count_ivr = $ivr['number_of_repeat'];
            $conf          .= "[ivr-{$ivr['extension']}] \n";
            $conf          .= 'exten => s,1,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
            $conf          .= "same => n,Set(APPEXTEN={$ivr['extension']})\n\t";
            $conf          .= 'same => n,Gosub(dial_app,${EXTEN},1)' . "\n\t";
            $conf          .= 'same => n,Answer()' . "\n\t";
            $conf          .= 'same => n,Set(try_count=0); №6' . "\n\t";
            $conf          .= 'same => n,Set(try_count=$[${try_count} + 1])' . "\n\t";
            $conf          .= 'same => n,GotoIf($[${try_count} > ' . $try_count_ivr . ']?internal,' . $ivr['timeout_extension'] . ',1)' . "\n\t";
            $conf          .= "same => n,Set(TIMEOUT(digit)=2) \n\t";
            $conf          .= "same => n,Background({$audio_message}) \n\t";
            if ($timeout_wait_exten > 0) {
                $conf .= "same => n,WaitExten({$timeout_wait_exten}) \n";
            } else {
                $conf .= "same => n,Goto(t,1)\n";
            }
            $res = IvrMenuActions::find("ivr_menu_id = '{$ivr['uniqid']}'");
            foreach ($res as $ext) {
                $conf .= "exten => {$ext->digits},1,Goto(internal,{$ext->extension},1)\n";
            }
            $conf .= "exten => i,1,Goto(s,6)\n";
            $conf .= "exten => t,1,Goto(s,6)\n";

            if ($ivr['allow_enter_any_internal_extension'] === '1') {
                $extension = Util::getExtensionX($this->generalSettings['PBXInternalExtensionLength']);
                $conf .= 'exten => _' . $extension . ',1,ExecIf($["${PJSIP_ENDPOINT(${EXTEN},auth)}x" == "x"]?Goto(s,1))' . "\n\t";
                $conf .= 'same => n,Goto(internal,${EXTEN},1)' . "\n";
            }
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
        $db_data           = IvrMenu::find()->toArray();
        foreach ($db_data as $ivr) {
            $conf .= "exten => {$ivr['extension']},hint,Custom:{$ivr['extension']} \n";
        }

        return $conf;
    }

    /**
     * Получаем длительность файла.
     *
     * @param $filename
     *
     * @return int
     */
    public function getSoundFileDuration($filename)
    {
        $result = 7;
        if (file_exists($filename)) {
            $soxiPath = Util::which('soxi');
            $awkPath = Util::which('awk');
            $grepPath = Util::which('grep');
            Util::mwExec("{$soxiPath}  {$filename} 2>/dev/null | {$grepPath} Duration | {$awkPath}  '{ print $3}'", $out);
            $time_str = implode($out);
            preg_match_all('/^\d{2}:\d{2}:\d{2}.?\d{0,2}$/', $time_str, $matches, PREG_SET_ORDER, 0);
            if (count($matches) > 0) {
                $data   = date_parse($time_str);
                $result += $data['minute'] * 60 + $data['second'];
            }
        }

        return $result;
    }

    /**
     * Возвращает номерной план для internal контекста.
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        $ivr_ext_conf = '';
        $db_data           = IvrMenu::find()->toArray();
        foreach ($db_data as $ivr) {
            $ivr_ext_conf .= "exten => {$ivr['extension']},1,Goto(ivr-{$ivr['extension']},s,1)" . "\n";
        }
        $ivr_ext_conf .= "\n";

        return $ivr_ext_conf;
    }

    /**
     * @return string
     */
    public function extensionGenInternalTransfer(): string
    {
        $conf = '';
        $db_data           = IvrMenu::find()->toArray();
        foreach ($db_data as $ivr) {
            $conf .= 'exten => _' . $ivr['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . " \n\t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " \n";
        }

        return $conf;
    }

}