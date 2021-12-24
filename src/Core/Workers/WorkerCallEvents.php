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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Core\System\{BeanstalkClient, MikoPBXConfig, Storage, Util};
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\SelectCDR;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\UpdateDataInDB;
use Phalcon\Text;

class WorkerCallEvents extends WorkerBase
{
    public    array $mixMonitorChannels = [];
    protected bool  $record_calls       = true;
    protected bool  $split_audio_thread = false;
    public    array $checkChanHangupTransfer = [];
    public const TIMOUT_CHANNEL_TUBE = 'CleanChannelTimout';


    /**
     * Инициирует запись разговора на канале.
     *
     * @param string    $channel
     * @param ?string   $file_name
     * @param ?string   $sub_dir
     * @param ?string   $full_name
     *
     * @return string
     */
    public function MixMonitor($channel, $file_name = null, $sub_dir = null, $full_name = null): string
    {
        $resFile = $this->mixMonitorChannels[$channel]??'';
        if($resFile !== ''){
            return $resFile;
        }
        $resFile           = '';
        $file_name = str_replace('/', '_', $file_name);
        if ($this->record_calls) {
            [$f, $options] = $this->setMonitorFilenameOptions($full_name, $sub_dir, $file_name);
            $arr = $this->am->GetChannels(false);
            if(!in_array($channel, $arr, true)){
                return '';
            }
            $srcFile = "{$f}.wav";
            $resFile = "{$f}.mp3";
            $this->am->MixMonitor($channel, $srcFile, $options);
            $this->mixMonitorChannels[$channel] = $resFile;
            $this->am->UserEvent('StartRecording', ['recordingfile' => $resFile, 'recchan' => $channel]);
        }
        return $resFile;
    }

    /**
     * @param string|null $full_name
     * @param string|null $sub_dir
     * @param string|null $file_name
     * @return array
     */
    public function setMonitorFilenameOptions(?string $full_name, ?string $sub_dir, ?string $file_name): array{
        if (!file_exists((string)$full_name)) {
            $monitor_dir = Storage::getMonitorDir();
            if ($sub_dir === null) {
                $sub_dir = date('Y/m/d/H/');
            }
            $f = "{$monitor_dir}/{$sub_dir}{$file_name}";
        } else {
            $f = Util::trimExtensionForFile($full_name);
        }
        if ($this->split_audio_thread) {
            $options = "abSr({$f}_in.wav)t({$f}_out.wav)";
        } else {
            $options = 'ab';
        }
        return array($f, $options);
    }

    /**
     * Останавливает запись разговора на канале.
     * @param string $channel
     */
    public function StopMixMonitor($channel): void
    {
        if(isset($this->mixMonitorChannels[$channel])){
            unset($this->mixMonitorChannels[$channel]);
        }else{
            return;
        }
        if ($this->record_calls) {
            $this->am->StopMixMonitor($channel);
        }
    }

    /**
     *
     * @param $params
     */
    public function start($params): void
    {
        $this->mixMonitorChannels       = [];
        $this->checkChanHangupTransfer  = [];
        $mikoPBXConfig            = new MikoPBXConfig();
        $this->record_calls       = $mikoPBXConfig->getGeneralSettings('PBXRecordCalls') === '1';
        $this->split_audio_thread = $mikoPBXConfig->getGeneralSettings('PBXSplitAudioThread') === '1';
        $this->am                 = Util::getAstManager('off');

        // PID сохраняем при начале работы Worker.
        $client = new BeanstalkClient(self::class);
        $client->subscribe(self::class, [$this, 'callEventsWorker']);
        $client->subscribe(WorkerCdr::SELECT_CDR_TUBE, [$this, 'selectCDRWorker']);
        $client->subscribe(WorkerCdr::UPDATE_CDR_TUBE, [$this, 'updateCDRWorker']);
        $client->subscribe(self::TIMOUT_CHANNEL_TUBE,  [$this, 'cleanTimeOutChannel']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->setErrorHandler([$this, 'errorHandler']);

        while ($this->needRestart === false) {
            $client->wait();
        }
    }

    /**
     * Обработчик событий изменения состояния звонка.
     *
     * @param array | BeanstalkClient $tube
     */
    public function callEventsWorker($tube): void
    {
        $data      = json_decode($tube->getBody(), true);
        $funcName = "Action_".$data['action']??'';
        if ( method_exists($this, $funcName) ) {
            $this->$funcName($data);
        }
        $className = __NAMESPACE__.'\Libs\WorkerCallEvents\\'.Text::camelize($funcName, '_');
        if( method_exists($className, 'execute') ){
            $className::execute($this, $data);
        }

        $tube->reply(json_encode(true));
    }

    /**
     * Получения CDR к обработке.
     *
     * @param array | BeanstalkClient $tube
     */
    public function updateCDRWorker($tube): void
    {
        $task    = $tube->getBody();
        $data = json_decode($task, true);
        UpdateDataInDB::execute($data);
        $tube->reply(json_encode(true));
    }

    /**
     * Получения CDR к обработке.
     *
     * @param array | BeanstalkClient $tube
     */
    public function cleanTimeOutChannel($tube): void
    {
        $task        = $tube->getBody();
        $taskData    = json_decode($task, true);
        $srcChannel  = $taskData['srcChannel']??'';
        $this->am->SetVar($srcChannel, "MASTER_CHANNEL(M_DIALSTATUS)", 'ANSWER');
        $tube->reply(json_encode(true));
    }
    /**
     * @param array | BeanstalkClient $tube
     */
    public function selectCDRWorker($tube): void
    {
        $filter   = json_decode($tube->getBody(), true);
        $res_data = SelectCDR::execute($filter);
        $tube->reply($res_data);
    }

    public function errorHandler($m): void
    {
        Util::sysLogMsg(self::class . '_ERROR', $m, LOG_ERR);
    }
}


// Start worker process
WorkerCallEvents::startWorker($argv??null);