<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\Asterisk;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\{Storage, Util};
use MikoPBX\Common\Models\CallEventsLogs;
use Phalcon\Di;

/**
 * Вспомогательные методы.
 */
class CdrDb
{
    /**
     * Возвращает путь к базе данных истории звонков.
     * @return string
     */
    public static function getPathToDB(): string
    {
        $di = Di::getDefault();
        if ($di === null) {
            return '';
        }
        return $di->getShared('config')->path('cdrDatabase.dbfile');
    }

    /**
     * Проверка базы данных на наличие "Битых" строк
     */
    public static function checkDb(): void
    {
        $di = Di::getDefault();
        $booting = ($di->getShared('registry')->booting === true);
        $channels_id = [];
        // Если booting, то asterisk не запущен.
        if(!$booting){
            $am          = Util::getAstManager('off');
            $channels_id = $am->GetChannels();
        }

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