<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;

class InsertDataToDB {

    public static function execute($data):void
    {
        if (empty($data['UNIQUEID'])) {
            Util::sysLogMsg(__FUNCTION__, 'UNIQUEID is empty ' . json_encode($data), LOG_DEBUG);
            return;
        }

        $is_new = false;
        /** @var CallDetailRecordsTmp $m_data */
        $m_data = CallDetailRecordsTmp::findFirst(
            [
                "UNIQUEID=:id: AND linkedid=:linkedid:",
                'bind' => [
                    'id'       => $data['UNIQUEID'],
                    'linkedid' => $data['linkedid']
                ],
            ]
        );
        if ($m_data === null) {
            // Создаем новую строку истории.
            $m_data = new CallDetailRecordsTmp();
            $is_new = true;
        } elseif (self::isOriginateDial($data)) {
            self::processingOriginateData($data, $m_data);
            // Дальнейшая обработка не требуется.
            return;
        }

        self::fillCdrData($m_data, $data, $is_new);
    }

    /**
     * Обработка данных Originate. При Dial этот пакет может прийти дважды.
     * @param $data
     * @param $m_data
     */
    private static function processingOriginateData($data, $m_data):void
    {
        if (empty($m_data->endtime)) {
            // Если это оригинация dial может прийти дважды.
            if(!empty($m_data->src_num) && $m_data->src_num === $data['dst_num']){
                $m_data->dst_num = $data['src_num'];
                $m_data->save();
            }
        }else{
            // Предыдущие звонки завершены. Текущий вызов новый, к примеру через резервного провайдера.
            // Меняем идентификатор предыдущих звонков.
            $m_data->UNIQUEID .= Util::generateRandomString(5);
            // Чистим путь к файлу записи.
            $m_data->recordingfile = "";
            $m_data->save();

            $new_m_data               = new CallDetailRecordsTmp();
            $new_m_data->UNIQUEID     = $data['UNIQUEID'];
            $new_m_data->start        = $data['start'];
            $new_m_data->src_chan     = $m_data->src_chan;
            $new_m_data->src_num      = $m_data->src_num;
            $new_m_data->dst_num      = $data['src_num'];
            $new_m_data->did          = $data['did'];
            $new_m_data->from_account = $data['from_account'];
            $new_m_data->linkedid     = $data['linkedid'];
            $new_m_data->transfer     = $data['transfer'];

            $res = $new_m_data->save();
            if ( ! $res) {
                Util::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
            }
        }
    }

    /**
     * Проверка данных на Originate.
     * @param $data
     * @return bool
     */
    private static function isOriginateDial($data): bool{
        return isset($data['IS_ORGNT']) && $data['IS_ORGNT'] !== false && $data['action'] === 'dial';
    }

    /**
     * @param CallDetailRecordsTmp $m_data
     * @param                      $data
     * @param bool                 $is_new
     */
    private static function fillCdrData(CallDetailRecordsTmp $m_data, $data, bool $is_new): void{
        $f_list = $m_data->toArray();
        // Заполняем данные истроии звонков.
        foreach ($data as $attribute => $value) {
            if (!array_key_exists($attribute, $f_list)) {
                continue;
            }
            if ($is_new === false && 'UNIQUEID' === $attribute) {
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if (!$res) {
            Util::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
        }
    }

}