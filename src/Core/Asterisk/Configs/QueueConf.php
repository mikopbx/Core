<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\{Processes, Util};

class QueueConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 570;

    protected string $description = 'queues.conf';

    /**
     * Generates queue.conf and restart asterisk queue module
     */
    public static function queueReload(): void
    {
        $queue = new self();
        $queue->generateConfig();
        $out          = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'queue reload all '", $out);
    }

    /**
     * Возвращает дополнительные контексты для Очереди.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        // Генерация внутреннего номерного плана.
        $conf = PHP_EOL."[queue_agent_answer]".PHP_EOL;
        $conf .= 'exten => s,1,Gosub(queue_answer,${EXTEN},1)' . PHP_EOL."\t";
        $conf .= "same => n,Return()".PHP_EOL.PHP_EOL;

        return $conf;
    }

    /**
     * Генерация хинтов.
     *
     * @return string
     */
    public function extensionGenHints(): string
    {
        $conf    = '';
        $db_data = $this->getQueueData();
        foreach ($db_data as $queue) {
            $conf .= "exten => {$queue['extension']},hint,Custom:{$queue['extension']}".PHP_EOL;
        }

        return $conf;
    }

    /**
     * @return string
     */
    public function extensionGenInternalTransfer(): string
    {
        $conf    = '';
        $db_data = $this->getQueueData();
        foreach ($db_data as $queue) {
            $conf .= 'exten => _' . $queue['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . PHP_EOL. " \t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " ".PHP_EOL;
        }
        $conf .= PHP_EOL;

        return $conf;
    }

    /**
     * Возвращает номерной план для internal контекста.
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        $queue_ext_conf = '';
        $db_data        = $this->getQueueData();
        foreach ($db_data as $queue) {
            $calleridPrefix = preg_replace('/[^a-zA-Zа-яА-Я0-9 ]/ui', '', $queue['callerid_prefix'] ?? '');

            $queue_ext_conf .= "exten => {$queue['extension']},1,NoOp(--- Start Queue ---) \n\t";
            $reservExtension = $queue['redirect_to_extension_if_empty']??'';
            if(!empty($reservExtension)){
                // Проверим, пустая ли очередь.
                $queue_ext_conf .= 'same => n,Set(mLogged=${QUEUE_MEMBER('.$queue['uniqid'].',logged)})'.PHP_EOL."\t";
                $queue_ext_conf .= 'same => n,ExecIf($["${mLogged}" == "0"]?Set(pt1c_UNIQUEID=${UNDEFINED}))'.PHP_EOL."\t";
                $queue_ext_conf .= 'same => n,GotoIf($["${mLogged}" == "0"]?internal,'.$reservExtension.',1)'.PHP_EOL."\t";
            }
            // Направим вызов на очередь.
            $queue_ext_conf .= 'same => n,Set(__QUEUE_SRC_CHAN=${CHANNEL})' . "\n\t";
            $queue_ext_conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
            $queue_ext_conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
            $queue_ext_conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(queue-pre-dial-custom,${EXTEN},1)}" == "1"]?queue-pre-dial-custom,${EXTEN},1)'."\n\t";
            $queue_ext_conf .= "same => n,Answer() \n\t";
            $queue_ext_conf .= 'same => n,Gosub(queue_start,${EXTEN},1)' . "\n\t";
            $options = '';
            if (isset($queue['caller_hear']) && $queue['caller_hear'] === 'ringing') {
                $options .= 'r';
            }
            $ringlength = (trim($queue['timeout_to_redirect_to_extension']) === '') ? 300 : $queue['timeout_to_redirect_to_extension'];
            if ( ! empty($calleridPrefix)) {
                $queue_ext_conf .= "same => n,Set(CALLERID(name)={$calleridPrefix}:" . '${CALLERID(name)}' . ") \n\t";
            }
            $queue_ext_conf .= "same => n,Queue({$queue['uniqid']},kT\${MQ_OPTIONS}{$options},,,{$ringlength},,,queue_agent_answer) \n\t";
            // Оповестим о завершении работы очереди.
            $queue_ext_conf .= 'same => n,Gosub(queue_end,${EXTEN},1)' . "\n\t";

            if (trim($queue['timeout_extension']) !== '') {
                // Если по таймауту не ответили, то выполним переадресацию.
                $queue_ext_conf .= 'same => n,ExecIf($["${QUEUESTATUS}" == "TIMEOUT"]?Goto(internal,' . $queue['timeout_extension'] . ',1))' . " \n\t";
            }
            if (!empty($reservExtension)) {
                // Если пустая очередь, то выполним переадресацию.
                $exp            = '$["${QUEUESTATUS}" == "JOINEMPTY" || "${QUEUESTATUS}" == "LEAVEEMPTY" ]';
                $queue_ext_conf .= 'same => n,ExecIf('.$exp.'?Goto(internal,'.$reservExtension.',1))' . " \n\t";
            }
            $queue_ext_conf .= "\n";
        }

        return $queue_ext_conf;
    }

    /**
     * Создание конфига для очередей.
     *
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        // Генерация конфигурационных файлов.
        $q_conf  = '';
        $db_data = $this->getQueueData();
        foreach ($db_data as $queue_data) {
            $ringinuse        = ($queue_data['recive_calls_while_on_a_call'] === '1') ? 'yes' : 'no';
            $announceposition = ($queue_data['announce_position'] === '1') ? 'yes' : 'no';
            $announceholdtime = ($queue_data['announce_hold_time'] === '1') ? 'yes' : 'no';

            $timeout           = empty($queue_data['seconds_to_ring_each_member']) ? '60' : $queue_data['seconds_to_ring_each_member'];
            $wrapuptime        = empty($queue_data['seconds_for_wrapup']) ? '3' : $queue_data['seconds_for_wrapup'];
            $periodic_announce = '';
            if (trim($queue_data['periodic_announce']) !== '') {
                $announce_file     = Util::trimExtensionForFile($queue_data['periodic_announce']);
                $periodic_announce = "periodic-announce={$announce_file} \n";
            }
            $periodic_announce_frequency = '';
            if (trim($queue_data['periodic_announce_frequency']) !== '') {
                $periodic_announce_frequency = "periodic-announce-frequency={$queue_data['periodic_announce_frequency']} \n";
            }
            $announce_frequency = '';
            if ($announceposition !== 'no' || $announceholdtime !== 'no') {
                $announce_frequency .= "announce-frequency=30 \n";
            }

            $mohClass = empty($queue_data['moh_sound'])?'default':$queue_data['moh_sound'];

            $strategy = $queue_data['strategy'];
            $q_conf .= "[{$queue_data['uniqid']}]; {$queue_data['name']}\n";
            $q_conf .= "musicclass=$mohClass \n";
            $q_conf .= "strategy={$strategy} \n";
            $q_conf .= "timeout={$timeout} \n";
            $q_conf .= "retry=1 \n";
            $q_conf .= "wrapuptime={$wrapuptime} \n";
            $q_conf .= "ringinuse={$ringinuse} \n";
            $q_conf .= $periodic_announce;
            $q_conf .= $periodic_announce_frequency;
            $q_conf .= "joinempty=no \n";
            $q_conf .= "leavewhenempty=no \n";
            $q_conf .= "announce-position={$announceposition} \n";
            $q_conf .= "announce-holdtime={$announceholdtime} \n";
            $q_conf .= "relative-periodic-announce=yes \n";
            $q_conf .= $announce_frequency;

            $penalty = 0;
            foreach ($queue_data['agents'] as $agent) {
                $hint = '';
                if ($agent['isExternal'] === false) {
                    $hint = ",hint:{$agent['agent']}@internal-hints";
                }
                $q_conf .= "member => Local/{$agent['agent']}@internal/n,{$penalty},\"{$agent['agent']}\"{$hint} \n";
            }
            $q_conf .= "\n";
        }

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/queues.conf', $q_conf);
    }

    /**
     * Получение настроек очередей.
     *
     * @return array
     */
    public function getQueueData(): array
    {
        $arrResult = [];
        $queues    = CallQueues::find();
        foreach ($queues as $queue) {
            $queueUniqId = $queue->uniqid; // идентификатор очереди

            $arrAgents = [];
            $agents    = $queue->CallQueueMembers;
            foreach ($agents as $agent) {
                $arrAgents[] =
                    [
                        'agent'      => $agent->extension,
                        'priority'   => $agent->priority,
                        'isExternal' => ($agent->Extensions->type === Extensions::TYPE_EXTERNAL),
                    ];
            }
            $arrResult[$queueUniqId]['agents'] = $arrAgents;
            $arrResult[$queueUniqId]['periodic_announce'] = ($queue->SoundFiles)?$queue->SoundFiles->path:'';
            $arrResult[$queueUniqId]['moh_sound']         = ($queue->MohSoundFiles)?"moh-{$queue->MohSoundFiles->id}":'';

            foreach ($queue as $key => $value) {
                if ($key === 'callqueuemembers' || $key === "soundfiles") {
                    continue;
                } // эти параметры мы собрали по-своему
                $arrResult[$queueUniqId][$key] = $value;
            }
        }

        return $arrResult; // JSON_PRETTY_PRINT
    }
}