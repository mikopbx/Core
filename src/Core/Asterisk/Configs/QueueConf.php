<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Core\System\{MikoPBXConfig, Util};
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Core\Modules\Config\ConfigClass;

class QueueConf extends ConfigClass
{
    protected $description = 'queues.conf';
    private $db_data;

    /**
     * Генерация конфига очередей. Рестарт модуля очередей.
     */
    static function queueReload()
    {
        $result           = [
            'result' => 'ERROR',
        ];
        $queue            = new QueueConf();
        $mikoPBXConfig           = new MikoPBXConfig();
        $general_settings = $mikoPBXConfig->getGeneralSettings();
        $queue->generateConfig($general_settings);
        $out = [];
        Util::mwExec("asterisk -rx 'queue reload all '", $out);
        $out_data = trim(implode('', $out));
        if ($out_data == '') {
            $result['result'] = 'Success';
        } else {
            $result['result']  = 'ERROR';
            $result['message'] = "$out_data";
        }

        return $result;
    }

    /**
     * Получение настроек.
     */
    public function getSettings()
    {
        // Настройки для текущего класса.
        $this->db_data = $this->getQueueData();
    }

    /**
     * Получение настроек очередей.
     *
     * @return array
     */
    public function getQueueData()
    {
        $arrResult = [];
        $queues    = CallQueues::find();
        foreach ($queues as $queue) {
            $queueUniqid = $queue->uniqid; // идентификатор очереди

            $arrAgents = [];
            $agents    = $queue->CallQueueMembers;
            foreach ($agents as $agent) {
                $arrAgents[] =
                    [
                        'agent'      => $agent->extension,
                        'priority'   => $agent->priority,
                        'isExternal' => ($agent->Extensions->type == "EXTERNAL"),
                    ];
            }
            $arrResult[$queueUniqid]['agents'] = $arrAgents;
            $periodic_announce                 = '';
            if ($queue->SoundFiles != false) {
                $periodic_announce = $queue->SoundFiles->path;
            }
            $arrResult[$queueUniqid]['periodic_announce'] = $periodic_announce;

            foreach ($queue as $key => $value) {
                if ($key == 'callqueuemembers' || $key == "soundfiles") {
                    continue;
                } // эти параметры мы собрали по-своему
                $arrResult[$queueUniqid][$key] = $value;
            }

        }

        return $arrResult; // JSON_PRETTY_PRINT
    }

    /**
     * Возвращает дополнительные контексты для Очереди.
     *
     * @return string
     */
    public function extensionGenContexts()
    {
        // Генерация внутреннего номерного плана.
        $conf = "[queue_agent_answer]\n";
        $conf .= "exten => s,1,NoOp(--- Answer Queue ---)\n\t";
        // $conf .= "same => n,AGI(cdr_connector.php,queue_answer)\n\t";
        $conf .= 'same => n,Gosub(queue_answer,${EXTEN},1)' . "\n\t";
        $conf .= "same => n,Return()\n\n";

        return $conf;
    }

    /**
     * Генерация хинтов.
     *
     * @return string
     */
    public function extensionGenHints()
    {
        $conf = '';
        foreach ($this->db_data as $queue) {
            $conf .= "exten => {$queue['extension']},hint,Custom:{$queue['extension']} \n";
        }

        return $conf;
    }

    /**
     * @return string
     */
    public function extensionGenInternalTransfer()
    {
        $conf = '';
        foreach ($this->db_data as $queue) {
            $conf .= 'exten => _' . $queue['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . " \n\t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " \n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Создание конфига для очередей.
     *
     * @param $general_settings
     *
     * @return bool
     */
    protected function generateConfigProtected($general_settings)
    {
        $this->extensionGenInternal();
        // Генерация конфигурационных файлов.
        $result = true;

        $q_conf = '';
        foreach ($this->db_data as $queue_data) {

            $joinempty        = (isset($queue_data['joinempty']) && $queue_data['joinempty'] == 1) ? 'yes' : 'no';
            $leavewhenempty   = (isset($queue_data['leavewhenempty']) && $queue_data['leavewhenempty'] == 1) ? 'yes' : 'no';
            $ringinuse        = ($queue_data['recive_calls_while_on_a_call'] == 1) ? 'yes' : 'no';
            $announceposition = ($queue_data['announce_position'] == 1) ? 'yes' : 'no';
            $announceholdtime = ($queue_data['announce_hold_time'] == 1) ? 'yes' : 'no';

            $timeout           = ($queue_data['seconds_to_ring_each_member'] == '') ? '60' : $queue_data['seconds_to_ring_each_member'];
            $wrapuptime        = ($queue_data['seconds_for_wrapup'] == '') ? '3' : $queue_data['seconds_for_wrapup'];
            $periodic_announce = '';
            if (trim($queue_data['periodic_announce']) != '') {
                $announce_file     = Util::trimExtensionForFile($queue_data['periodic_announce']);
                $periodic_announce = "periodic-announce={$announce_file} \n";
            }
            $periodic_announce_frequency = '';
            if (trim($queue_data['periodic_announce_frequency']) != '') {
                $periodic_announce_frequency = "periodic-announce-frequency={$queue_data['periodic_announce_frequency']} \n";
            }
            $announce_frequency = '';
            if ($announceposition !== 'no' || $announceholdtime !== 'no') {
                $announce_frequency .= "announce-frequency=30 \n";
            }

            // liner - под этой стратегией понимаем последовательный вызов агентов очереди.
            // Каждый новый звонок должен инициировать последовательный вызов начиная с первого агента.
            $strategy = ('linear' === $queue_data['strategy']) ? 'ringall' : $queue_data['strategy'];

            $q_conf .= "[{$queue_data['uniqid']}]; {$queue_data['name']}\n";
            $q_conf .= "musicclass=default \n";
            $q_conf .= "strategy={$strategy} \n";
            $q_conf .= "timeout={$timeout} \n";
            $q_conf .= "wrapuptime={$wrapuptime} \n";
            $q_conf .= "ringinuse={$ringinuse} \n";
            $q_conf .= "$periodic_announce";
            $q_conf .= "$periodic_announce_frequency";
            $q_conf .= "joinempty={$joinempty} \n";
            $q_conf .= "leavewhenempty={$leavewhenempty} \n";
            $q_conf .= "announce-position={$announceposition} \n";
            $q_conf .= "announce-holdtime={$announceholdtime} \n";
            $q_conf .= "$announce_frequency";

            $penalty = 0;
            foreach ($queue_data['agents'] as $agent) {
                if ('linear' === $queue_data['strategy']) {
                    $penalty++;
                }
                $hint = '';
                if ($agent['isExternal'] != true) {
                    $hint = ",hint:{$agent['agent']}@internal-hints";
                }
                $q_conf .= "member => Local/{$agent['agent']}@internal/n,{$penalty},\"{$agent['agent']}\"{$hint} \n";
            }
            $q_conf .= "\n";
        }

        Util::fileWriteContent($this->astConfDir . '/queues.conf', $q_conf);

        return $result;
    }

    /**
     * Возвращает номерной план для internal контекста.
     *
     * @return string
     */
    public function extensionGenInternal()
    {
        $queue_ext_conf = '';
        foreach ($this->db_data as $queue) {
            $queue_ext_conf .= "exten => {$queue['extension']},1,NoOp(--- Start Queue ---) \n\t";
            $queue_ext_conf .= "same => n,Answer() \n\t";
            $queue_ext_conf .= 'same => n,Set(__QUEUE_SRC_CHAN=${CHANNEL})' . "\n\t";
            $queue_ext_conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
            $queue_ext_conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
            // $queue_ext_conf .= 'same => n,AGI(cdr_connector.php,queue_start)'."\n\t";
            $queue_ext_conf .= 'same => n,Gosub(queue_start,${EXTEN},1)' . "\n\t";

            $options = '';
            if (isset($queue['caller_hear']) && $queue['caller_hear'] === 'ringing') {
                $options .= 'r'; // Установить КПВ (гудки) вместо Музыки на Удержании для ожидающих в очереди
            }
            $ringlength     = (trim($queue['timeout_to_redirect_to_extension']) == '') ? 120 : $queue['timeout_to_redirect_to_extension'];
            $queue_ext_conf .= "same => n,Queue({$queue['uniqid']},kT{$options},,,{$ringlength},,,queue_agent_answer,s,1) \n\t";
            // Оповестим о завершении работы очереди.
            // $queue_ext_conf .= 'same => n,AGI(cdr_connector.php,queue_end)'."\n\t";
            $queue_ext_conf .= 'same => n,Gosub(queue_end,${EXTEN},1)' . "\n\t";

            if (trim($queue['timeout_extension']) !== '') {
                // Если по таймауту не ответили, то выполним переадресацию.
                $queue_ext_conf .= 'same => n,ExecIf($["${QUEUESTATUS}" == "TIMEOUT"]?Goto(internal,' . $queue['timeout_extension'] . ',1))' . " \n\t";
            }
            if (trim($queue['redirect_to_extension_if_empty']) !== '') {
                // Если пустая очередь, то выполним переадресацию.
                $exp            = '$["${QUEUESTATUS}" == "JOINEMPTY" || "${QUEUESTATUS}" == "LEAVEEMPTY" ]';
                $queue_ext_conf .= 'same => n,ExecIf(' . $exp . '?Goto(internal,' . $queue['redirect_to_extension_if_empty'] . ',1))' . " \n\t";
            }
            $queue_ext_conf .= "\n";
        }

        return $queue_ext_conf;
    }
}