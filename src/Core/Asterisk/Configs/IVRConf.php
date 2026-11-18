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

use MikoPBX\Common\Library\DialplanEntityIdentity;
use MikoPBX\Common\Models\{IvrMenu, IvrMenuActions, Sip, SoundFiles};
use MikoPBX\Core\System\{Processes, SystemMessages, Util};

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
            if (! in_array($len, $arr_lens)) {
                $arr_lens[] = $len;
            }
        }

        // Fetch IVR menus from the database
        $db_data = $this->getIvrMenus(true);

        // Generate internal dial plan.
        $conf = '';
        foreach ($db_data as $ivr) {
            // An empty findFirst() condition would select an unrelated first sound file.
            $audioMessageId = $ivr['audio_message_id'] ?? '';
            /** @var SoundFiles|null $res */
            $res           = $audioMessageId === '' ? null : SoundFiles::findFirst($audioMessageId);
            $storedPath    = $res === null ? '' : (string)$res->path;

            $timeout_wait_exten = max((int)$ivr['timeout'], 0);
            $numberOfRepeat     = (int)$ivr['number_of_repeat'];
            // Resolve by base name so legacy DB rows (.mp3 path) still play when
            // only the .wav sibling survived the upgrade. Falls back to the
            // built-in 'vm-enter-num-to-call' only when nothing on disk matches.
            $audio_message = SoundFiles::resolveAsteriskAudioPath($storedPath);
            if ($audio_message === '') {
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
            $conf          .= 'same => n(ivr_start),ExecIf($[${try_count} > ' . $numberOfRepeat . ']?StopMixMonitor())' . "\n\t";
            $conf          .= 'same => n,GotoIf($[${try_count} > ' . $numberOfRepeat . ']?internal,' . $ivr['timeout_extension'] . ',1)' . "\n\t";
            $conf          .= 'same => n,Set(try_count=$[${try_count} + 1])' . "\n\t";
            $conf          .= "same => n,Set(TIMEOUT(digit)=2) \n\t";
            $conf          .= "same => n,Background($audio_message) \n\t";
            if ($timeout_wait_exten > 0) {
                $conf .= "same => n,WaitExten($timeout_wait_exten) \n";
            } else {
                $conf .= "same => n,Goto(t,1)\n";
            }

            // Fetch IVR menu actions from the database
            $res = IvrMenuActions::find([
                'conditions' => 'ivr_menu_id = :uniqid:',
                'bind' => ['uniqid' => $ivr['uniqid']],
            ]);
            foreach ($res as $ext) {
                // Digits and destination are written verbatim into extensions.conf.
                if (
                    !DialplanEntityIdentity::isConfigSafeDigits($ext->digits)
                    || !DialplanEntityIdentity::isConfigSafeDestination($ext->extension)
                ) {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        'Skipped IVR menu action with invalid digits or destination: ' . json_encode($ext->id),
                        LOG_WARNING
                    );
                    continue;
                }
                $conf .= "exten => $ext->digits,1," . 'Set(__IVR_DTMF=${IVR_DTMF},' . "$ext->digits)\n";
                $conf .= "\tsame => n,StopMixMonitor()\n";
                $conf .= "\tsame => n,Goto(internal,$ext->extension,1)\n";
            }

            // Handle invalid and timeout extensions.
            $conf .= 'exten => i,1,Set(__IVR_DTMF=${IVR_DTMF},i)' . "\n";
            $conf .= "\tsame => n,Goto(s,ivr_start)\n";
            $conf .= 'exten => t,1,Set(__IVR_DTMF=${IVR_DTMF},t)' . "\n";
            $conf .= "\tsame => n,Goto(s,ivr_start)\n";

            // Add support for entering any internal extension.
            if ($ivr['allow_enter_any_internal_extension'] === '1') {
                foreach ($arr_lens as $len) {
                    $extension = Util::getExtensionX($len);
                    $conf      .= 'exten => _' . $extension . ',1,ExecIf($["${DIALPLAN_EXISTS(internal,${EXTEN},1)}" == "0"]?Goto(i,1))' . "\n\t";
                    $conf      .= 'same => n,ExecIf($["${PJSIP_ENDPOINT(${EXTEN},auth)}x" == "x"]?Goto(i,1))' . "\n\t";
                    $conf      .= 'same => n,Set(__IVR_DTMF=${IVR_DTMF},${EXTEN})' . "\n\t";
                    $conf      .= 'same => n,StopMixMonitor()' . "\n\t";
                    $conf      .= 'same => n,Goto(internal,${EXTEN},1)' . "\n";
                }
            }
        }

        return $conf;
    }

    /**
     * Returns IVR menus whose extension and timeout destination are safe to write into extensions.conf.
     *
     * The uniqid is only used as a bound query parameter, so it is not checked here.
     *
     * @param bool $logSkipped Log skipped menus; set by one caller per generated file.
     * @return array<int, array<string, mixed>>
     */
    private function getIvrMenus(bool $logSkipped = false): array
    {
        $menus = [];
        foreach (IvrMenu::find()->toArray() as $ivr) {
            $timeoutExtension = $ivr['timeout_extension'] ?? '';
            if (
                !DialplanEntityIdentity::isConfigSafeExtension($ivr['extension'])
                || ($timeoutExtension !== '' && !DialplanEntityIdentity::isConfigSafeDestination($timeoutExtension))
            ) {
                if ($logSkipped) {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        'Skipped IVR menu with an invalid extension or timeout destination: '
                        . json_encode($ivr['uniqid']),
                        LOG_WARNING
                    );
                }
                continue;
            }
            $menus[] = $ivr;
        }

        return $menus;
    }

    /**
     * Generates the hints.
     *
     * @return string The generated hints.
     */
    public function extensionGenHints(): string
    {
        $conf    = '';
        $db_data = $this->getIvrMenus();
        foreach ($db_data as $ivr) {
            $conf .= "exten => {$ivr['extension']},hint,Custom:{$ivr['extension']} \n";
        }

        return $conf;
    }

    /**
     * Retrieves the duration of a sound file.
     *
     * @param string $filename The file name.
     * @return float|int The duration of the sound file.
     */
    public function getSoundFileDuration(string $filename): float|int
    {
        $result = 7;
        if (file_exists($filename)) {
            $ffprobe = Util::which('ffprobe');
            if (!empty($ffprobe)) {
                $cmd = "$ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '$filename' 2>/dev/null";
                Processes::mwExec($cmd, $out);
                $duration = (float)trim(implode('', $out));
                if ($duration > 0) {
                    $result = (int)ceil($duration);
                }
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
        $db_data      = $this->getIvrMenus();
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
        $db_data = $this->getIvrMenus();
        foreach ($db_data as $ivr) {
            $conf .= 'exten => _' . $ivr['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . " \n\t";
            $conf .= 'same => n,Set(__QUEUE_SRC_CHAN=${EMPTY})' . " \n\t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " \n";
        }

        return $conf;
    }
}
