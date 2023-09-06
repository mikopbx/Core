<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionDialCreateChan {
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $chan = $data['dst_chan']??'';
        if(!empty($chan)){
            $worker->addActiveChan($chan);
        }
        $filter = self::getFilter($data);
        $row_create = false;
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            if ( ! is_object($row)) {
                continue;
            }
            ///
            // Проверим, если более одного канала SIP/256 при входящем.
            $column_chan_name = ('ORIGINATE' === $row->dialstatus) ? 'src_chan' : 'dst_chan';

            if ( ! empty($row->$column_chan_name) && $data['dst_chan'] !== $row->$column_chan_name) {
                if ($row_create) {
                    continue;
                }
                // Необходимо дублировать строку звонка.
                $new_row = new CallDetailRecordsTmp();
                $f_list  = $row->toArray();
                foreach ($f_list as $attribute => $value) {
                    if ($attribute === 'id') {
                        continue;
                    }
                    $new_row->writeAttribute($attribute, $value);
                }
                $new_row->writeAttribute($column_chan_name, $data['dst_chan']);
                $new_row->writeAttribute('UNIQUEID', $data['UNIQUEID'] . '_' . $data['dst_chan']);
                // Подмена $row;
                $row        = $new_row;
                $row_create = true;
            }
            // конец проверки
            ///
            if ($row->dialstatus === 'ORIGINATE') {
                $account_col = 'from_account';
                // При оригинации меняется местами srs_chan в поле dst_chan.
                $row->writeAttribute('src_chan', $data['dst_chan']);
            } else {
                $account_col = 'to_account';
                $row->writeAttribute('dst_chan', $data['dst_chan']);
            }

            if (isset($data['to_account']) && ! empty($data['to_account'])) {
                $row->writeAttribute($account_col, $data['to_account']);
            }
            if (isset($data['dst_call_id']) && ! empty($data['dst_call_id'])) {
                $row->writeAttribute('dst_call_id', $data['dst_call_id']);
            }
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_dial_create_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    /**
     * Получаем фильтр для отбора CDR.
     * @param $data
     * @return array
     */
    private static function getFilter($data): array{
        if (isset($data['org_id'])) {
            // Вероятно необходимо переопределить искать по двум ID.
            // Применимо только для Originate, когда в качестве звонящего используем два канала
            // мобильный и внутренний номер.
            $filter = [
                '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:org_id:) AND endtime = ""',
                'bind' => ['UNIQUEID' => $data['UNIQUEID'], 'org_id' => $data['org_id'],],
            ];
        } else {
            $filter = [
                'UNIQUEID=:UNIQUEID: AND answer = "" AND endtime = ""',
                'bind' => [
                    'UNIQUEID' => $data['UNIQUEID'],
                ],
            ];
        }
        return $filter;
    }

    // checkMultipleRegistrations

}