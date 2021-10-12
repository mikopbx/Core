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

use MikoPBX\Common\Models\{CallDetailRecordsTmp, Extensions, ModelsBase, Users};
use MikoPBX\Core\System\{BeanstalkClient, Processes, Util};
use Throwable;

/**
 * Class WorkerCdr
 * Обработка записей CDR. Заполение длительности звонков.
 */
class WorkerCdr extends WorkerBase
{

    public const SELECT_CDR_TUBE = 'select_cdr_tube';
    public const UPDATE_CDR_TUBE = 'update_cdr_tube';

    private BeanstalkClient $client_queue;
    private array $internal_numbers  = [];
    private array $no_answered_calls = [];


    /**
     * Entry point
     *
     * @param $argv
     *
     */
    public function start($argv): void
    {
        $this->client_queue = new BeanstalkClient(self::SELECT_CDR_TUBE);
        $this->client_queue->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        $this->initSettings();

        while ($this->needRestart === false) {
            $result = $this->getTempCdr();
            if (!empty($result)) {
                $this->updateCdr($result);
            }
            $this->client_queue->wait();
        }
    }

    /**
     * Возвращает все завершенные временные CDR.
     * @return array
     */
    private function getTempCdr():array
    {
        $filter = [
            'work_completed<>1 AND endtime<>""',
            'columns'=> 'start,answer,src_num,dst_num,dst_chan,endtime,linkedid,recordingfile,dialstatus,UNIQUEID',
            'order' => 'answer',
            'miko_result_in_file' => true,
            'miko_tmp_db' => true,
        ];
        $client = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        try {
            $result   = $client->request(json_encode($filter), 2);
            $filename = json_decode($result, true, 512, JSON_THROW_ON_ERROR);
        }catch (Throwable $e){
            $filename = '';
        }
        $result_data = [];
        if (file_exists($filename)) {
            try {
                $result_data = json_decode(file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
            }catch (Throwable $e){
                Util::sysLogMsg('SELECT_CDR_TUBE', 'Error parse response.');
            }
        }

        return $result_data;
    }

    /**
     * Fills settings
     */
    private function initSettings(): void
    {
        $this->internal_numbers  = [];
        $this->no_answered_calls = [];

        $usersClass = Users::class;
        $parameters = [
            'columns'=>[
                'email'=>'email',
                'language'=>'language',
                'number'=>'Extensions.number'
            ],
            'joins'      => [
                'Extensions' => [
                    0 => Extensions::class,
                    1 => "Extensions.userid={$usersClass}.id",
                    2 => 'Extensions',
                    3 => 'INNER',
                ],
            ],
            'cache' => [
                'key'=> ModelsBase::makeCacheKey(Users::class, 'Workers-WorkerCdr-initSettings'),
                'lifetime' => 300,
            ]
        ];

        $results   = Users::find($parameters);
        foreach ($results as $record) {
            if (empty($record->email)) {
                continue;
            }
            $this->internal_numbers[$record->number] = [
                'email'    => $record->email,
                'language' => $record->language,
            ];
        }
    }

    /**
     * Обработчик результата запроса.
     * @param $result
     */
    private function updateCdr($result): void
    {
        $this->initSettings();
        $arr_update_cdr = [];
        // Получаем идентификаторы активных каналов.
        $channels_id = $this->getActiveIdChannels();
        foreach ($result as $row) {
            if (array_key_exists($row['linkedid'], $channels_id)) {
                // Цепочка вызовов еще не завершена.
                continue;
            }

            $start      = strtotime($row['start']);
            $answer     = strtotime($row['answer']);
            $end        = strtotime($row['endtime']);
            $dialstatus = trim($row['dialstatus']);

            $duration = max(($end - $start), 0);
            $billsec  = ($end && $answer) ? ($end - $answer) : 0;

            [$disposition, $row] = $this->setDisposition($billsec, $dialstatus, $row);
            [$row, $billsec]     = $this->checkBillsecMakeRecFile($billsec, $row);

            $data = [
                'work_completed' => 1,
                'duration'       => $duration,
                'billsec'        => $billsec,
                'disposition'    => $disposition,
                'UNIQUEID'       => $row['UNIQUEID'],
                'recordingfile'  => ($disposition === 'ANSWERED') ? $row['recordingfile'] : '',
                'tmp_linked_id'  => $row['linkedid'],
            ];

            $arr_update_cdr[] = $data;
            $this->checkNoAnswerCall(array_merge($row, $data));
        }

        $this->setStatusAndPublish($arr_update_cdr);
        $this->notifyByEmail();
    }

    /**
     * Функция позволяет получить активные каналы.
     * Возвращает ассоциативный массив. Ключ - Linkedid, значение - массив каналов.
     *
     * @return array
     */
    private function getActiveIdChannels(): array
    {
        $am           = Util::getAstManager('off');
        return $am->GetChannels(true);
    }

    /**
     * Анализируем не отвеченные вызовы. Наполняем временный массив для дальнейшей обработки.
     *
     * @param $row
     */
    private function checkNoAnswerCall($row): void
    {
        if ($row['disposition'] === 'ANSWERED') {
            $this->no_answered_calls[$row['linkedid']]['ANSWERED'] = true;
            return;
        }
        if ( ! array_key_exists($row['dst_num'], $this->internal_numbers)) {
            // dst_num - не является номером сотрудника. Это исходящий.
            return;
        }
        $is_internal = false;
        if ((array_key_exists($row['src_num'], $this->internal_numbers))) {
            // Это внутренний вызов.
            $is_internal = true;
        }

        $this->no_answered_calls[$row['linkedid']][] = [
            'from_number' => $row['src_num'],
            'to_number'   => $row['dst_num'],
            'start'       => $row['start'],
            'answer'      => $row['answer'],
            'endtime'     => $row['endtime'],
            'email'       => $this->internal_numbers[$row['dst_num']]['email'],
            'language'    => $this->internal_numbers[$row['dst_num']]['language'],
            'is_internal' => $is_internal,
            'duration'    => $row['duration'],
            'NOANSWER'    => true
        ];
    }


    /**
     * Постановка задачи в очередь на оповещение по email.
     */
    private function notifyByEmail(): void
    {
        foreach ($this->no_answered_calls as $call) {
            $this->client_queue->publish(json_encode($call), WorkerNotifyByEmail::class);
        }
        $this->no_answered_calls = [];
    }

    /**
     * @param array $arr_update_cdr
     */
    private function setStatusAndPublish(array $arr_update_cdr): void{
        $idForDelete = [];

        foreach ($arr_update_cdr as $data) {
            $linkedId = $data['tmp_linked_id'];
            $data['GLOBAL_STATUS'] = $data['disposition'];
            if (isset($this->no_answered_calls[$linkedId]['ANSWERED'])) {
                $data['GLOBAL_STATUS'] = 'ANSWERED';
                // Это отвеченный вызов (на очередь). Удаляем из списка.
                $idForDelete[$linkedId]=true;
            }
            unset($data['tmp_linked_id']);
            $this->client_queue->publish(json_encode($data), self::UPDATE_CDR_TUBE);
        }

        // Чистим память.
        foreach ($idForDelete as $linkedId => $data){
            unset($this->no_answered_calls[$linkedId]);
        }
    }

    /**
     * @param int $billsec
     * @param     $row
     * @return array
     */
    private function checkBillsecMakeRecFile(int $billsec, $row): array{
        if ($billsec <= 0) {
            $row['answer'] = '';
            $billsec = 0;

            if (!empty($row['recordingfile'])) {
                if($row['dst_chan'] === "App:{$row['dst_num']}"){
                    // Для приложения не может быть записи разговора.
                    // Запись должна относится к конечному устройству.
                    $row['recordingfile'] = '';
                }else{
                    // Удаляем файлы
                    $p_info = pathinfo($row['recordingfile']);
                    $fileName = $p_info['dirname'] . '/' . $p_info['filename'];
                    $file_list = [$fileName . '.mp3', $fileName . '.wav', $fileName . '_in.wav', $fileName . '_out.wav',];
                    foreach ($file_list as $file) {
                        if (!file_exists($file) || is_dir($file)) {
                            continue;
                        }
                        Processes::mwExec("rm -rf '{$file}'");
                    }
                }
            }
        } elseif (trim($row['recordingfile']) !== '') {
            // Если каналов не существует с ID, то можно удалить временные файлы.
            $p_info = pathinfo($row['recordingfile']);
            // Запускаем процесс конвертации в mp3
            $wav2mp3Path = Util::which('wav2mp3.sh');
            $nicePath = Util::which('nice');
            Processes::mwExecBg("{$nicePath} -n -19 {$wav2mp3Path} '{$p_info['dirname']}/{$p_info['filename']}'");
            // В последствии конвертации (успешной) исходные файлы будут удалены.
        }
        return array($row, $billsec);
    }

    /**
     * @param int    $billsec
     * @param string $dialstatus
     * @param        $row
     * @return array
     */
    private function setDisposition(int $billsec, string $dialstatus, $row): array{
        $disposition = 'NOANSWER';
        if ($billsec > 0) {
            $disposition = 'ANSWERED';
        } elseif ('' !== $dialstatus) {
            $disposition = ($dialstatus === 'ANSWERED') ? $disposition : $dialstatus;
        }

        if ($disposition !== 'ANSWERED') {
            if (file_exists($row['recordingfile']) && !is_dir($row['recordingfile'])) {
                Processes::mwExec("rm -rf {$row['recordingfile']}");
            }
        } elseif (!empty($row['recordingfile']) &&
            !file_exists(Util::trimExtensionForFile($row['recordingfile']) . '.wav') &&
            !file_exists($row['recordingfile'])) {
            /** @var CallDetailRecordsTmp $rec_data */
            $rec_data = CallDetailRecordsTmp::findFirst("linkedid='{$row['linkedid']}' AND dst_chan='{$row['dst_chan']}'");
            if ($rec_data !== null) {
                $row['recordingfile'] = $rec_data->recordingfile;
            }
        }
        return array($disposition, $row);
    }

}

// Start worker process
WorkerCdr::startWorker($argv??null);