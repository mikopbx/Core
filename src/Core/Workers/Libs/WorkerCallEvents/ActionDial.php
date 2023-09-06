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
        $chan = $data['src_chan']??'';
        if(!empty($chan)){
            $worker->addActiveChan($chan);
        }
        InsertDataToDB::execute($data);
        ActionAppEnd::execute($worker, $data);
    }
}