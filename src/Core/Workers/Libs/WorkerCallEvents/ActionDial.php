<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionDial {
    /**
     * Обработка события начала телефонного звонка.
     * @param $worker
     * @param $data
     */
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $worker->addActiveChan($data['src_chan']);
        InsertDataToDB::execute($data);
        ActionAppEnd::execute($worker, $data);
    }
}