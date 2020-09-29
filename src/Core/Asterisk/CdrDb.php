<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\Asterisk;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\{MikoPBXConfig, Storage, Util};
use MikoPBX\Common\Models\CallEventsLogs;
use Phalcon\Di;

/**
 * Вспомогательные методы.
 */
class CdrDb
{
    /**
     * Сохраниение лога по звонку.
     *
     * @param $data
     */
    public static function LogEvent($data): void
    {
        if (is_file('/tmp/debug')) {
            file_put_contents('/tmp/dial_log', $data . "\n", FILE_APPEND);
        }
    }

    /**
     * Возвращает путь к базе данных истории звонков.
     *
     * @param string $id
     *
     * @return string
     */
    public static function getPathToDB($id = ''): string
    {
        $di = Di::getDefault();

        if ($id == '' && $di !== null) {
            $dbname = $di->getShared('config')->path('cdrDatabase.dbfile');
        } else {
            $id     = (int) str_replace('mikopbx-', '', $id);
            $dbname = 'cdr/' . date("Y/m/d/H/", $id) . $id . ".db";
        }

        return $dbname;
    }

    /**
     * Проверка базы данных на наличие "Битых" строк
     */
    public static function checkDb(): void
    {
        $am          = Util::getAstManager('off');
        $channels_id = $am->GetChannels(true);

        /** @var CallDetailRecordsTmp $data_cdr */
        /** @var CallDetailRecordsTmp $row_cdr */
        $data_cdr = CallDetailRecordsTmp::find();
        foreach ($data_cdr as $row_cdr) {
            if (array_key_exists($row_cdr->linkedid, $channels_id)) {
                continue;
            }
            $date = CallEventsLogs::maximum(
                ['linkedid = "'.$row_cdr->linkedid.'"', 'column' => 'eventtime']
            );
            if ( ! $row_cdr->endtime) {
                if ($date) {
                    $row_cdr->endtime = $date;
                } elseif ($row_cdr->answer) {
                    $row_cdr->endtime = $row_cdr->answer;
                } else {
                    $row_cdr->endtime = $row_cdr->start;
                }
                $row_cdr->save();
            }
        }
    }

    /**
     * Формирует путь к файлу записи без расширения.
     *
     * @param $file_name
     *
     * @return string
     */
    public static function MeetMeSetRecFilename($file_name): string
    {
        $monitor_dir = Storage::getMonitorDir();
        $sub_dir     = date("Y/m/d/H/");

        return "{$monitor_dir}/{$sub_dir}{$file_name}";
    }
}