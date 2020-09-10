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
            $id     = str_replace('mikopbx-', '', $id);
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
     * Инициирует запись разговора на канале.
     *
     * @param      $channel
     * @param      $file_name
     * @param null $sub_dir
     * @param null $full_name
     *
     * @return string
     */
    public static function MixMonitor($channel, $file_name = null, $sub_dir = null, $full_name = null): string
    {
        $res_file           = '';
        $mikoPBXConfig      = new MikoPBXConfig();
        $record_calls       = $mikoPBXConfig->getGeneralSettings('PBXRecordCalls');
        $split_audio_thread = $mikoPBXConfig->getGeneralSettings('PBXSplitAudioThread');

        $file_name = str_replace('/', '_', $file_name);
        if (isset($record_calls) && $record_calls === '1') {
            $am = Util::getAstManager('off');
            if ( ! file_exists($full_name)) {
                $monitor_dir = Storage::getMonitorDir();
                if ($sub_dir === null) {
                    $sub_dir = date('Y/m/d/H/');
                }
                $f = "{$monitor_dir}/{$sub_dir}{$file_name}";
            } else {
                $f         = Util::trimExtensionForFile($full_name);
                $file_name = basename($f);
            }
            if ($split_audio_thread === '1') {
                $options = "abr({$f}_in.wav)t({$f}_out.wav)";
            } else {
                $options = 'ab';
            }
            $nicePath = Util::which('nice');
            $lamePath = Util::which('lame');
            $chmodPath = Util::which('chmod');

            $res        = $am->MixMonitor(
                $channel,
                "{$f}.wav",
                $options,
                "{$nicePath} -n 19 {$lamePath} -b 32 --silent \"{$f}.wav\" \"{$f}.mp3\" && {$chmodPath} o+r \"{$f}.mp3\""
            );
            $res['cmd'] = "MixMonitor($channel, $file_name)";
            self::LogEvent(json_encode($res));
            $res_file = "{$f}.mp3";
            $am->UserEvent('StartRecording', ['recordingfile' => $res_file, 'recchan' => $channel]);
        }

        return $res_file;
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

    /**
     * Останавливает запись разговора на канале.
     *
     * @param $channel
     */
    public static function StopMixMonitor($channel): void
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $record_calls  = $mikoPBXConfig->getGeneralSettings('PBXRecordCalls');

        if (isset($record_calls) && $record_calls === '1') {
            $am         = Util::getAstManager('off');
            $res        = $am->StopMixMonitor($channel);
            $res['cmd'] = "StopMixMonitor($channel)";
            self::LogEvent(json_encode($res));
        }
    }



}