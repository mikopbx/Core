<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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


namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;

class ExtensionsOutWorkTimeConf extends CoreConfigClass
{
    public const OUT_WORK_TIME_CONTEXT = 'check-out-work-time';

    /**
     * Генератор extensions, дополнительные контексты.
     * @return string
     */
    public function extensionGenContexts(): string
    {
        return $this->generateOutWorkTimes();
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDialSystem(string $rout_number): string
    {
        // Проверим распискние для входящих внешних звонков.
        return 'same => n,Gosub('.self::OUT_WORK_TIME_CONTEXT.',${EXTEN},1)'. "\n\t";
    }

    /**
     * Описываем нерабочее время.
     *
     * @return string
     */
    private function generateOutWorkTimes(): string
    {
        $conf = "\n\n[playback-exit]\n";
        $conf .= 'exten => '.ExtensionsConf::ALL_NUMBER_EXTENSION.',1,Gosub(dial_outworktimes,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,Playback(${filename})' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => '.ExtensionsConf::DIGIT_NUMBER_EXTENSION.',1,Gosub(dial_outworktimes,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,Playback(${filename})' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf_out_set_var  = '';
        $checkContextsYear = [];
        $conf .= "[".self::OUT_WORK_TIME_CONTEXT."]\n";
        $conf .= $this->getWorkTimeDialplan(ExtensionsConf::ALL_NUMBER_EXTENSION,   $conf_out_set_var, $checkContextsYear);
        $conf .= $this->getWorkTimeDialplan(ExtensionsConf::DIGIT_NUMBER_EXTENSION, $conf_out_set_var, $checkContextsYear);
        $conf .= $conf_out_set_var;

        foreach ($checkContextsYear as $year => $rule){
            $conf .= "[".self::OUT_WORK_TIME_CONTEXT."-{$year}]\n";
            $conf .= 'exten => '.ExtensionsConf::ALL_NUMBER_EXTENSION.",1,NoOp(check time {$year} year)\n\t";
            $conf .= implode("", $rule);
            $conf .= "same => n,return\n\n";

            $conf .= 'exten => '.ExtensionsConf::DIGIT_NUMBER_EXTENSION.",1,NoOp(check time {$year} year)\n\t";
            $conf .= implode("", $rule);
            $conf .= "same => n,return\n\n";
        }

        return $conf;
    }

    /**
     * @param $extension
     * @param $conf_out_set_var
     * @param $checkContextsYear
     * @return string
     */
    private function getWorkTimeDialplan($extension, &$conf_out_set_var, &$checkContextsYear):string
    {
        $conf = 'exten => '.$extension.',1,Set(currentYear=${STRFTIME(,,%Y)})'."\n\t";
        $conf.= 'same => n,GosubIf($["${DIALPLAN_EXISTS('.self::OUT_WORK_TIME_CONTEXT.'-${currentYear},${EXTEN},1)}" == "1"]?'.self::OUT_WORK_TIME_CONTEXT.'-${currentYear},${EXTEN},1)'."\n\t";
        $data = OutWorkTimes::find(['order' => 'date_from']);
        foreach ($data as $out_data) {
            $intervals = $this->getOutWorkIntervals($out_data->date_from, $out_data->date_to);
            foreach ($intervals as $interval){
                $ruleData = $out_data->toArray();
                $ruleData['date_to']    = $interval['date_to'];
                $ruleData['date_from']  = $interval['date_from'];
                $this->generateOutWorkRule($ruleData, $conf_out_set_var, $conf, $checkContextsYear);
            }
        }
        $conf .= "same => n,return\n\n";

        return $conf;
    }

    /**
     * Получает массив интервалов для разных "Годов"
     * @param $date_from
     * @param $date_to
     * @return array
     */
    private function getOutWorkIntervals($date_from, $date_to):array{
        $year_from  = 1*date('Y', (int)$date_from);
        $year_to    = 1*date('Y', (int)$date_to);

        $intervals = [];
        $Year = $year_from;
        if($year_to === $year_from){
            $intervals[] = [
                'date_from' => $date_from,
                'date_to'   => $date_to
            ];
            return $intervals;
        }
        while ($Year <= $year_to){
            if($Year === $year_from){
                $intervals[] = [
                    'date_from' => $date_from,
                    'date_to'   => (string)strtotime('31-12-'.$Year)
                ];
            }elseif ($Year === $year_to){
                $intervals[] = [
                    'date_from' => (string)strtotime('01-01-'.$Year),
                    'date_to'   => $date_to
                ];
            }else{
                $intervals[] = [
                    'date_from' => (string)strtotime('01-01-'.$Year),
                    'date_to'   => (string)strtotime('31-12-'.$Year)
                ];
            }
            $Year++ ;
        }
        return $intervals;
    }

    /**
     * Формирование правила переключателя по времени.
     * @param array  $out_data
     * @param string $conf_out_set_var
     * @param string $conf
     * @param array  $checkContextsYear
     */
    private function generateOutWorkRule(array $out_data, string & $conf_out_set_var, string & $conf, array & $checkContextsYear):void{
        $year_from = '';
        if ( !empty($out_data['date_from']) && !empty($out_data['date_to'])) {
            $year_from = date('Y', (int)$out_data['date_to']);
        }

        $timesArray = $this->getTimesInterval($out_data);
        $weekdays   = $this->getWeekDayInterval($out_data);

        [$mDays,    $months]  = $this->initDaysMonthsInterval($out_data);
        [$appName,  $appdata] = $this->initRuleAppData($out_data, $conf_out_set_var);

        foreach ($timesArray as $times){
            $rule = "same => n,{$appName}($times,$weekdays,$mDays,$months?{$appdata})\n\t";
            if(empty($year_from)){
                $conf .= $rule;
            }else{
                $checkContextsYear[$year_from][] = $rule;
            }
        }
    }

    /**
     * Получает интервалы времени.
     * @param array $out_data
     * @return array
     */
    private function getTimesInterval(array $out_data): array{
        $time_from  = $out_data['time_from'];
        $time_to    = $out_data['time_to'];
        if (empty($time_from) && empty($time_to)) {
            $intervals = ['*'];
        } else {
            $time_from  = $this->normaliseTime($time_from);
            $time_to    = $this->normaliseTime($time_to, '23:59');
            if(strtotime($time_from) > strtotime($time_to)){
                $intervals=[
                    "{$time_from}-23:59",
                    "00:00-{$time_to}"
                ];
            }else{
                $intervals=[
                    "{$time_from}-{$time_to}"
                ];
            }
        }
        return $intervals;
    }

    /**
     * Нормализация времени в приемлемый формат.
     * @param        $srcTime
     * @param string $defVal
     * @return string
     */
    private function normaliseTime($srcTime, $defVal = '00:00'):string{
        $time = (empty($srcTime)) ? $defVal : $srcTime;
        return (strlen($time) === 4) ? "0{$time}" : $time;
    }

    /**
     * Устанавливает тип и данные приложения.
     * @param        $ruleData
     * @param string $conf_out_set_var
     * @return string[]
     */
    private function initRuleAppData($ruleData, string &$conf_out_set_var): array{
        if ('extension' === $ruleData['action']) {
            $appName = 'GotoIfTime';
            $appdata = "internal,{$ruleData['extension']},1";
        } else {
            /** @var SoundFiles $res */
            $res = SoundFiles::findFirst($ruleData['audio_message_id']);
            $audio_message = ($res === null) ? '' : Util::trimExtensionForFile($res->path);

            $dialplanName = "work-time-set-var-{$ruleData['id']}";

            if (strpos($conf_out_set_var, $dialplanName) === false) {
                $conf_out_set_var .= "[{$dialplanName}]\n" .
                    'exten => '.ExtensionsConf::ALL_NUMBER_EXTENSION.',1,Set(filename=' . $audio_message . ')'."\n\t" .
                        'same => n,Goto(playback-exit,${EXTEN},1)'."\n\n";
            }
            $appName = 'ExecIfTime';
            $appdata = 'Goto(' . $dialplanName . ',${EXTEN},1)';
        }
        return array($appName, $appdata);
    }

    /**
     * Возвращает диапазон дней недели.
     * @param array $out_data
     * @return string
     */
    private function getWeekDayInterval(array $out_data): string{
        $weekday_from = (string)$out_data['weekday_from'];
        $weekday_to = (string)$out_data['weekday_to'];
        $arr_weekday = [null, "mon", "tue", "wed", "thu", "fri", "sat", "sun"];
        if (empty($weekday_from) && empty($weekday_to)) {
            $weekdays = '*';
        } else {
            $weekday_from = (empty($weekday_from)) ? '1' : $weekday_from;
            $weekday_to = (empty($weekday_to)) ? '7' : $weekday_to;
            $weekdays = "{$arr_weekday[$weekday_from]}-{$arr_weekday[$weekday_to]}";
        }
        return $weekdays;
    }

    /**
     * Возвращает диапазон месяцев.
     * @param array $out_data
     * @return string[]
     */
    private function initDaysMonthsInterval(array $out_data): array{
        $date_from = $out_data['date_from'];
        $date_to = $out_data['date_to'];
        if (empty($date_from)) {
            $mDays = '*';
            $months = '*';
        } else {
            $mDays = strtolower(date("j", (int)$date_from));
            $months = strtolower(date("M", (int)$date_from));
            if (!empty($date_to)) {
                $mDays .= "-" . strtolower(date("j", (int)$date_to));
                $months .= "-" . strtolower(date("M", (int)$date_to));
            }
        }
        return array($mDays, $months);
    }


}