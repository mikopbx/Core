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

use MikoPBX\Core\System\{BeanstalkClient, Storage, Util};
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\Asterisk\Configs\CelConf;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelAnswer;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\SelectCDR;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\UpdateDataInDB;
use Phalcon\Text;

class WorkerCallEvents extends WorkerBase
{
    public    array $mixMonitorChannels = [];
    protected bool  $record_calls       = true;
    protected bool  $split_audio_thread = false;
    public    array $checkChanHangupTransfer = [];
    private   array $activeChannels = [];

    private array $innerNumbers       = [];
    private array $exceptionsNumbers  = [];
    private bool  $notRecInner        = false;
    public const REC_DISABLE          = 'Conversation recording is disabled';

    /**
     * Наполняем кэш реальных каналов.
     * @param string $channel
     * @return void
     */
    public function addActiveChan(string $channel):void
    {
        if(stripos($channel, 'local') === 0){
            return;
        }
        $this->activeChannels[$channel] = true;
    }

    /**
     * Очищаем кэш реальных каналов.
     * @param string $channel
     * @return void
     */
    public function removeActiveChan(string $channel):void
    {
        unset($this->activeChannels[$channel]);
    }

    /**
     * Проверяет существует ли канал в кэш.
     * @param string $channel
     * @return void
     */
    public function existsActiveChan(string $channel):bool
    {
        return isset($this->activeChannels[$channel]);
    }

    /**
     * @param string $src
     * @param string $dst
     * @param string $error
     * @return bool
     */
    public function enableMonitor(string $src, string $dst):bool
    {
        $src = substr($src,-9);
        $dst = substr($dst,-9);
        $enable = true;
        $isInner = in_array($src, $this->innerNumbers,true) && in_array($dst, $this->innerNumbers,true);
        if(($this->notRecInner && $isInner) ||
            in_array($src, $this->exceptionsNumbers,true) || in_array($dst, $this->exceptionsNumbers,true)){
            $enable = false;
        }
        return $enable;
    }

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
    public function MixMonitor($channel, $file_name = null, $sub_dir = null, $full_name = null, string $actionID=''): string
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
            $this->am->MixMonitor($channel, $srcFile, $options, '', $actionID);
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
     * @param string $actionID
     */
    public function StopMixMonitor($channel, string $actionID=''): void
    {
        if(isset($this->mixMonitorChannels[$channel])){
            unset($this->mixMonitorChannels[$channel]);
        }else{
            return;
        }
        if ($this->record_calls) {
            $this->am->StopMixMonitor($channel, $actionID);
        }
    }

    /**
     *
     * @param $params
     */
    public function start($params): void
    {
        $this->updateRecordingOptions();
        $this->mixMonitorChannels       = [];
        $this->checkChanHangupTransfer  = [];
        $this->am                 = Util::getAstManager('off');

        // PID сохраняем при начале работы Worker.
        $client = new BeanstalkClient(self::class);
        if($client->isConnected() === false){
            Util::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
            sleep(2);
            return;
        }
        $client->subscribe(CelConf::BEANSTALK_TUBE,    [$this, 'callEventsWorker']);
        $client->subscribe(self::class,                [$this, 'otherEvents']);
        $client->subscribe(WorkerCdr::SELECT_CDR_TUBE, [$this, 'selectCDRWorker']);
        $client->subscribe(WorkerCdr::UPDATE_CDR_TUBE, [$this, 'updateCDRWorker']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->setErrorHandler([$this, 'errorHandler']);

        while ($this->needRestart === false) {
            $client->wait();
        }
    }

    /**
     * @return void
     */
    private function updateRecordingOptions():void
    {
        $usersNumbers = [];
        $users = [];
        $filter = [
            'conditions' => 'userid <> "" and userid>0 ',
            'columns' => 'userid,number,type',
            'order' => 'type DESC'
        ];
        $extensionsData = Extensions::find($filter);
        /** @var Extensions $extension */
        foreach ($extensionsData as $extension){
            if($extension->type === "SIP"){
                $usersNumbers[$extension->number][] = $extension->number;
                $users[$extension->userid] = $extension->number;
            }else{
                $internalNumber = $users[$extension->userid]??'';
                if($internalNumber !==''){
                    $usersNumbers[$internalNumber][] = $extension->number;
                }
            }
        }
        unset($users, $extensionsData);
        $filter = [
            'conditions' => 'type="peer"',
            'columns'    => 'extension,enableRecording',
        ];
        $peers = Sip::find($filter);
        foreach ($peers as $peer) {
            $numbers = $usersNumbers[$peer->extension]??[];
            foreach ($numbers as $num){
                $num = substr($num,-9);
                $this->innerNumbers[] = $num;
                if($peer->enableRecording === '0'){
                    $this->exceptionsNumbers[] = $num;
                }
            }
        }
        $this->notRecInner        = PbxSettings::getValueByKey('PBXRecordCallsInner') === '0';
        $this->record_calls       = PbxSettings::getValueByKey('PBXRecordCalls') === '1';
        $this->split_audio_thread = PbxSettings::getValueByKey('PBXSplitAudioThread') === '1';
    }

    /**
     * Ping callback for keep alive check
     *
     * @param BeanstalkClient $message
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
        parent::pingCallBack($message);
        $this->updateRecordingOptions();
    }

    /**
     * @param $tube
     * @param $data
     * @return void
     */
    public function otherEvents($tube, array $data=[]): void
    {
        if(empty($data)){
            $data = json_decode($tube->getBody(), true);
        }
        $funcName = "Action_".$data['action']??'';
        if ( method_exists($this, $funcName) ) {
            $this->$funcName($data);
        }
        $className = __NAMESPACE__.'\Libs\WorkerCallEvents\\'.Text::camelize($funcName, '_');
        if( method_exists($className, 'execute') ){
            $className::execute($this, $data);
        }
    }

    /**
     * Обработчик событий изменения состояния звонка.
     *
     * @param array | BeanstalkClient $tube
     */
    public function callEventsWorker($tube): void
    {
        $data  = json_decode($tube->getBody(), true);
        $event = $data['EventName']??'';
        if('ANSWER' === $event){
            ActionCelAnswer::execute($this, $data);
            return;
        }elseif('USER_DEFINED' !== $event){
            return;
        }
        try {
            $data = json_decode(
                base64_decode($data['AppData']??''),
                true,
                512,
                JSON_THROW_ON_ERROR
            );
        }catch (\Throwable $e){
            $data = [];
        }
        $this->otherEvents($tube, $data);
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