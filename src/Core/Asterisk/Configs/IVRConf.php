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

use MikoPBX\Common\Models\{IvrMenu, IvrMenuActions, Sip, SoundFiles};
use MikoPBX\Core\System\{Processes, Util};

/**
 * Class IVRConf
 *
 * Represents a configuration class for IVR.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class IVRConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 560;

    /**
     * Generates the additional contexts.
     *
     * @return string The generated contexts.
     */
    public function extensionGenContexts(): string
    {
        $arr_lens = [];
        $db_data  = Sip::find("type = 'peer' AND ( disabled <> '1')")->toArray();
        /** @var Sip $sip_peer */
        foreach ($db_data as $sip_peer) {
            $len = strlen($sip_peer['extension']);
            if ( ! in_array($len, $arr_lens)) {
                $arr_lens[] = $len;
            }
        }

        // Fetch IVR menus from the database
        $db_data = IvrMenu::find()->toArray();

        // Generate internal dial plan.
        $conf = '';
        foreach ($db_data as $ivr) {
            /** @var \MikoPBX\Common\Models\SoundFiles $res */
            $res           = SoundFiles::findFirst($ivr['audio_message_id']);
            $audio_message = $res === null ? '' : (string)$res->path;

            $timeout_wait_exten = max($ivr['timeout'], 0);
            if (file_exists($audio_message)) {
                $audio_message = Util::trimExtensionForFile($audio_message);
            } else {
                $audio_message = 'vm-enter-num-to-call';
            }

            // Configure IVR extension context.
            $conf          .= "[ivr-{$ivr['extension']}] \n";
            $conf          .= 'exten => s,1,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
            $conf          .= "same => n,Set(NEED_MONITOR=1)\n\t";
            $conf          .= "same => n,Set(APPEXTEN={$ivr['extension']})\n\t";
            $conf          .= 'same => n,Gosub(dial_app,${EXTEN},1)' . "\n\t";
            $conf          .= 'same => n,Answer()' . "\n\t";
            $conf          .= 'same => n,Set(try_count=0);' . "\n\t";
            $conf          .= 'same => n(ivr_start),ExecIf($[${try_count} > ' . $ivr['number_of_repeat'] . ']?StopMixMonitor())' . "\n\t";
            $conf          .= 'same => n,GotoIf($[${try_count} > ' . $ivr['number_of_repeat'] . ']?internal,' . $ivr['timeout_extension'] . ',1)' . "\n\t";
            $conf          .= 'same => n,Set(try_count=$[${try_count} + 1])' . "\n\t";
            $conf          .= "same => n,Set(TIMEOUT(digit)=2) \n\t";
            $conf          .= "same => n,Background({$audio_message}) \n\t";
            if ($timeout_wait_exten > 0) {
                $conf .= "same => n,WaitExten({$timeout_wait_exten}) \n";
            } else {
                $conf .= "same => n,Goto(t,1)\n";
            }

            // Fetch IVR menu actions from the database
            $res = IvrMenuActions::find("ivr_menu_id = '{$ivr['uniqid']}'");
            foreach ($res as $ext) {
                $conf .= "exten => {$ext->digits},1,StopMixMonitor()\n";
                $conf .= "\tsame => n,Goto(internal,{$ext->extension},1)\n";
            }

            // Handle invalid and timeout extensions.
            $conf .= "exten => i,1,Goto(s,ivr_start)\n";
            $conf .= "exten => t,1,Goto(s,ivr_start)\n";

            // Add support for entering any internal extension.
            if ($ivr['allow_enter_any_internal_extension'] === '1') {
                foreach ($arr_lens as $len) {
                    $extension = Util::getExtensionX($len);
                    $conf      .= 'exten => _' . $extension . ',1,ExecIf($["${DIALPLAN_EXISTS(internal,${EXTEN},1)}" == "0"]?Goto(i,1))' . "\n\t";
                    $conf      .= 'same => n,ExecIf($["${PJSIP_ENDPOINT(${EXTEN},auth)}x" == "x"]?Goto(i,1))' . "\n\t";
                    $conf      .= 'same => n,StopMixMonitor()' . "\n\t";
                    $conf      .= 'same => n,Goto(internal,${EXTEN},1)' . "\n";
                }
            }
        }

        return $conf;
    }

    /**
     * Generates the hints.
     *
     * @return string The generated hints.
     */
    public function extensionGenHints(): string
    {
        $conf    = '';
        $db_data = IvrMenu::find()->toArray();
        foreach ($db_data as $ivr) {
            $conf .= "exten => {$ivr['extension']},hint,Custom:{$ivr['extension']} \n";
        }

        return $conf;
    }

    /**
     * Retrieves the duration of a sound file.
     *
     * @param string $filename The file name.
     * @return int The duration of the sound file.
     */
    public function getSoundFileDuration($filename)
    {
        $result = 7;
        if (file_exists($filename)) {
            $soxiPath = Util::which('soxi');
            $awkPath  = Util::which('awk');
            $grepPath = Util::which('grep');
            Processes::mwExec(
                "{$soxiPath}  {$filename} 2>/dev/null | {$grepPath} Duration | {$awkPath}  '{ print $3}'",
                $out
            );
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
     * Generates the internal dialplan for IVR.
     *
     * @return string The generated internal dialplan.
     */
    public function extensionGenInternal(): string
    {
        $ivr_ext_conf = '';
        $db_data      = IvrMenu::find()->toArray();
        foreach ($db_data as $ivr) {
            $ivr_ext_conf .= "exten => {$ivr['extension']},1,Goto(ivr-{$ivr['extension']},s,1)" . "\n";
        }
        $ivr_ext_conf .= "\n";

        return $ivr_ext_conf;
    }

    /**
     * Generates the internal transfer dialplan for IVR.
     *
     * @return string The generated internal transfer dialplan.
     */
    public function extensionGenInternalTransfer(): string
    {
        $conf    = '';
        $db_data = IvrMenu::find()->toArray();
        foreach ($db_data as $ivr) {
            $conf .= 'exten => _' . $ivr['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . " \n\t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " \n";
        }

        return $conf;
    }

}