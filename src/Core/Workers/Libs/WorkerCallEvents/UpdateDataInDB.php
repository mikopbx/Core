<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;

class UpdateDataInDB {

    public static function execute($data):void
    {
        if (empty($data['UNIQUEID'])) {
            Util::sysLogMsg(__FUNCTION__, 'UNIQUEID is empty ' . json_encode($data), LOG_DEBUG);
            return;
        }
        $filter = [
            "UNIQUEID=:id:",
            'bind' => ['id' => $data['UNIQUEID'],],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        $m_data = CallDetailRecordsTmp::findFirst($filter);
        if ($m_data === null) {
            return;
        }
        $f_list = $m_data->toArray();
        foreach ($data as $attribute => $value) {
            if ( ! array_key_exists($attribute, $f_list)) {
                continue;
            }
            if ('UNIQUEID' === $attribute) {
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if ( ! $res) {
            Util::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
        }

        self::sendUserEventData($m_data, $data);

        if($res && $m_data->work_completed === "1"){
            // Удаляем данные из временной таблицы, они уже перемещены в постоянную.
            $m_data->delete();
        }

    }

    /**
     * @param CallDetailRecordsTmp $m_data
     * @param                      $data
     */
    private static function sendUserEventData(CallDetailRecordsTmp $m_data, $data): void{
        /**
         * Отправка UserEvent
         */
        $insert_data = $m_data->toArray();
        if ($insert_data['work_completed'] === "1") {
            $insert_data['action'] = "hangup_update_cdr";
            $insert_data['GLOBAL_STATUS'] = $data['GLOBAL_STATUS'] ?? $data['disposition'];
            unset(
                $insert_data['src_chan'],
                $insert_data['dst_chan'],
                $insert_data['work_completed'],
                $insert_data['did'],
                $insert_data['id'],
                $insert_data['from_account'],
                $insert_data['to_account'],
                $insert_data['appname'],
                $insert_data['is_app'],
                $insert_data['transfer']
            );
            $am = Util::getAstManager('off');
            $am->UserEvent('CdrConnector', ['AgiData' => base64_encode(json_encode($insert_data))]);
        }
    }
}