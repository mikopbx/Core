<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionVoicemailStart {
    /**
     * Обработка события начала телефонного звонка.
     * @param $worker
     * @param $data
     */
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        InsertDataToDB::execute($data);
        ActionAppEnd::execute($worker, $data);
    }
}