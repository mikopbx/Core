<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once 'globals.php';

use Models\CallDetailRecordsTmp;

/**
 * Class WorkerCdr
 * Обработка записей CDR. Заполение длительности звонков.
 */
class WorkerCdr{

    /** @var array */
    private $filter;
    private $client_queue;
    private $timeout = 10;
    private $internal_numbers  = [];
    private $no_answered_calls = [];

    /**
     * WorkerCdr constructor.
     */
    function __construct(){
        $this->client_queue = new BeanstalkClient('select_cdr');

        $this->filter = [
            '(work_completed<>1 OR work_completed IS NULL) AND endtime IS NOT NULL',
            'miko_tmp_db' => true,
            'columns' => 'start,answer,src_num,dst_num,dst_chan,endtime,linkedid,recordingfile,dialstatus,UNIQUEID',
            'miko_result_in_file' => true,
        ];

        $this->init_settings();
    }

    private function init_settings(){
        $g = $GLOBALS['g'];
        $this->internal_numbers = [];
        $this->no_answered_calls= [];

        try{
            $users = Models\Users::find();
        }catch (PDOException $e){
            $users = [];
            if($e->errorInfo[1]==17 ){
                // Обновляем схему базыданных.
                init_db($g['m_di'], $g['phalcon_settings']);
                $users = Models\Users::find();
                // Если и тут будет исключение, то какая то другая, более грубая ошибка. Будем ловить...
            }
        }
        foreach ($users as $user){
            if(empty($user->email)){
                continue;
            }
            try{
                foreach ($user->Extensions as $exten){
                    $this->internal_numbers[$exten->number] = [
                        'email'     => $user->email,
                        'language'  => $user->language,
                    ];
                }
            }catch (\Exception $e){
                \Util::sys_log_msg('WorkerCdr', $e->getMessage());
            }

        }
    }

    /**
     * Callback функция для обработки ответа.
     * @param $message
     */
    public function callback($message) {
        $this->UpdateCdr($message);
    }

    /**
     * Функция позволяет получить активные каналы.
     * Возвращает ассоциативный массив. Ключ - Linkedid, значение - массив каналов.
     * @return array
     */
    private function get_active_id_channels(){
        $am = Util::get_am('off');
        $active_chans = $am->GetChannels(true);
        $am->Logoff();
        return $active_chans;
    }

    /**
     * Обработчик результата запроса.
     * @param \BeanstalkClient $message
     */
    private function UpdateCdr($message) {
        $this->init_settings();
        $result_data = $message->getBody();
        // Получаем результат.
        $result = json_decode($result_data, true);
        if(file_exists($result)){
            $file_data = json_decode(file_get_contents($result), true);
            unlink($result);
            $result = $file_data;
        }
        if(!is_array($result) && !is_object($result)){
            return;
        }
        if(count($result) < 1){
            return;
        }
        $arr_update_cdr = [];
        // Получаем идентификаторы активных каналов.
        $channels_id = $this->get_active_id_channels();
        foreach($result as $row){
            if( array_key_exists($row['linkedid'], $channels_id) ){
                // Цепочка вызовов еще не завершена.
                continue;
            }
            if(trim($row['recordingfile']) !== ''){
                // Если каналов не существует с ID, то можно удалить временные файлы.
                $p_info = pathinfo($row['recordingfile']);
                $fname = $p_info['dirname'].'/'.$p_info['filename'].'.wav';
                if(file_exists($fname)){
                    @unlink($fname);
                }
            }
            $start 		= strtotime($row['start']);
            $answer 	= strtotime($row['answer']);
            $end 		= strtotime($row['endtime']);
            $dialstatus = trim($row['dialstatus']);

            $duration 	= max(($end - $start), 0);
            $billsec  	= ($end != 0 && $answer !=0)?($end - $answer):0;

            $disposition = 'NOANSWER';
            if($billsec > 0){
                $disposition = 'ANSWERED';
            }else if('' !== $dialstatus){
                $disposition = ($dialstatus==='ANSWERED')?$disposition:$dialstatus;
            }

            if($billsec <= 0){
                $row['answer'] = '';
                $billsec = 0;

                if(!empty($row['recordingfile'])){
                    $p_info = pathinfo($row['recordingfile']);
                    $file_list = [
                        $p_info['dirname'].'/'.$p_info['filename'].'.mp3',
                        $p_info['dirname'].'/'.$p_info['filename'].'.wav',
                        $p_info['dirname'].'/'.$p_info['filename'].'_in.wav',
                        $p_info['dirname'].'/'.$p_info['filename'].'_out.wav'
                    ];
                    foreach ($file_list as $file){
                        if(!file_exists($file)){
                            continue;
                        }
                        @unlink($file);
                    }
                }
            }

            if($disposition!=='ANSWERED'){
                if(file_exists($row['recordingfile'])){
                    @unlink($row['recordingfile']);
                }
            }elseif ( !file_exists(Util::trim_extension_file($row['recordingfile']).'wav') && !file_exists($row['recordingfile'])){
                /** @var CallDetailRecordsTmp $rec_data */
                $rec_data = CallDetailRecordsTmp::findFirst("linkedid='{$row['linkedid']}' AND dst_chan='{$row['dst_chan']}'");
                if($rec_data){
                    $row['recordingfile'] = $rec_data->recordingfile;
                }
            }

            $data = [
                'work_completed' => 1,
                'duration'       => $duration,
                'billsec'        => $billsec,
                'disposition'    => $disposition,
                'UNIQUEID'       => $row['UNIQUEID'],
                'recordingfile'  => ($disposition === 'ANSWERED')?$row['recordingfile']:'',
                'tmp_linked_id'    => $row['linkedid'],
            ];

            $arr_update_cdr[] = $data;
            $this->check_no_answer_call(array_merge($row, $data));
        }

        foreach ($arr_update_cdr as $data){
            $linkedid  = $data['tmp_linked_id'];
            $data['GLOBAL_STATUS'] = $data['disposition'];
            if( isset($this->no_answered_calls[$linkedid]) &&
                isset($this->no_answered_calls[$linkedid]['NOANSWER']) &&
                $this->no_answered_calls[$linkedid]['NOANSWER'] == false){

                $data['GLOBAL_STATUS'] = 'ANSWERED';
            }
            unset($data['tmp_linked_id']);
            $this->client_queue->publish(json_encode($data), null, 'update_cdr');
        }

        $this->notify_by_email();


    }

    /**
     * Анализируем не отвеченные вызовы. Наполняем временный массив для дальнейшей обработки.
     * @param $row
     */
    private function check_no_answer_call($row){
        if($row['disposition'] === 'ANSWERED'){
            $this->no_answered_calls[$row['linkedid']]['NOANSWER'] = false;
            return;
        }
        if(!array_key_exists($row['dst_num'],$this->internal_numbers)){
            // dst_num - не является номером сотрудника. Это исходящий.
            return;
        }
        $is_internal = false;
        if((array_key_exists($row['src_num'],$this->internal_numbers))){
            // Это внутренний вызов.
            $is_internal = true;
        }

        $this->no_answered_calls[$row['linkedid']][] = [
            'from_number'   => $row['src_num'],
            'to_number'     => $row['dst_num'],
            'start'         => $row['start'],
            'answer'        => $row['answer'],
            'endtime'       => $row['endtime'],
            'email'         => $this->internal_numbers[$row['dst_num']]['email'],
            'language'      => $this->internal_numbers[$row['dst_num']]['language'],
            'is_internal'   => $is_internal,
            'duration'      => $row['duration'],
        ];
    }

    /**
     * Постановка задачи в очередь на оповещение по email.
     */
    private function notify_by_email(){
        foreach ($this->no_answered_calls as $call){
            $this->client_queue->publish(json_encode($call), null, 'notify_by_email');
        }
        $this->no_answered_calls = [];
    }

    /**
     * Начало работы.
     */
    public function Start(){
        $this->sendToBeanstalk();
    }

    private function sendToBeanstalk(){
        $result = false;
        while (true) {
            $pid_file = WorkerCdr::get_pid_file();
            file_put_contents($pid_file, getmypid());
            try{
                $result = $this->client_queue->request(json_encode($this->filter),$this->timeout);
            }catch (Exception $e){
                $result = ($result == true)?$result:false;
                $error  = $e->getMessage();
                Util::sys_log_msg('WorkerCdr', $error);
            }

            if($result !== false){
                $this->UpdateCdr($this->client_queue);
            }
            sleep(5);
        }
    }

    static function get_pid_file(){
        return '/var/run/worker_cdr_complete.pid';
    }
}

$worker_proc_name = 'worker_cdr_complete';
if(count($argv)>1 && $argv[1] === 'start') {
    cli_set_process_title($worker_proc_name);
    $worker = new WorkerCdr();
    $worker->Start();
}else{
    cli_set_process_title('worker_cdr_safe_script');
    $pid = \Util::get_pid_process($worker_proc_name);
    $need_start = false;
    if(empty($pid)){
        $need_start = true;
    }else{
        $pid_file = WorkerCdr::get_pid_file();
        if(file_exists($pid_file)){
            $data = filemtime($pid_file);
            if(time() - $data > 10){
                $need_start = true;
                \Util::killbyname($worker_proc_name);
            }
        }else{
            $need_start = true;
        }
    }

    if($need_start){
        \Util::mwexec_bg("/usr/bin/php -f {$argv[0]} start");
    }
}

