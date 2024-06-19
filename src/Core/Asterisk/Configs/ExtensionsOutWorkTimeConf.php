<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use DateTime;

/**
 * Class ExtensionsOutWorkTimeConf
 *
 * This class handles the generation of additional contexts sections in the extensions.conf file
 * for out of work time configurations.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class ExtensionsOutWorkTimeConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 510;
    public const OUT_WORK_TIME_CONTEXT = 'check-out-work-time';
    private string $conf = '';

    /**
     * Generates core modules config files
     */
    protected function generateConfigProtected(): void
    {
        $config = '';
        /** @var OutWorkTimes $rule */
        $rules = OutWorkTimes::find();
        foreach ($rules as $rule){
            if(empty($rule->calType)){
                continue;
            }
            $config.= "[calendar-$rule->id]".PHP_EOL.
                'type='.$rule->calType.PHP_EOL.
                'url='.$rule->calUrl.PHP_EOL.
                'user='.$rule->calUser.PHP_EOL.
                'secret='.$rule->calSecret.PHP_EOL.
                'refresh=1'.PHP_EOL.
                'timeframe=60'.PHP_EOL.
                'channel = Local/s@calendar-event'.PHP_EOL.
                'app = Playback'.PHP_EOL.
                'appdata = beep'. PHP_EOL.PHP_EOL;
        }
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/calendar.conf', $config);
        $arr_out      = [];
        $pid = Processes::getPidOfProcess('asterisk');
        if(!empty($pid)){
            $asteriskPath = Util::which('asterisk');
            Processes::mwExec("{$asteriskPath} -rx 'module reload res_calendar'", $arr_out);
        }

    }

    /**
     * Generates the extension contexts for out of work time configurations.
     *
     * @return string The generated configuration.
     */
    public function extensionGenContexts(): string
    {
        $this->generateConfigProtected();
        $this->generateOutWorkTimes();
        return $this->conf;
    }


    /**
     *
     * @return string Set global vars.
     */
    public function extensionGlobals(): string
    {
        $configs = '';
        $dbData = Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($dbData as $sipPeer) {
            $context_id = SIPConf::getContextId($sipPeer->host, $sipPeer->port);
            $configs .= "CONTEXT_ID_$sipPeer->uniqid=$context_id".PHP_EOL;
        }
        return $configs;
    }

    /**
     * Generates the customized incoming context for a specific route before dialing system.
     *
     * @param string $rout_number The route number.
     *
     * @return string The generated configuration.
     */
    public function generateIncomingRoutBeforeDialSystem(string $rout_number): string
    {
        // Check the schedule for incoming external calls.
        return  'same => n,NoOp(contextID: ${contextID})' . PHP_EOL . "\t" .
                'same => n,ExecIf($["${CONTEXT}" == "public-direct-dial"]?Set(contextID=none-incoming))' . PHP_EOL . "\t" .
                'same => n,ExecIf($["${contextID}x" == "x"]?Set(contextID=${CONTEXT_ID_${providerID}}))' . PHP_EOL . "\t" .
                'same => n,ExecIf($["${contextID}x" == "x"]?Set(contextID=${CONTEXT}))' . PHP_EOL . "\t" .
                'same => n,GosubIf($["${IGNORE_TIME}" != "1"]?' . self::OUT_WORK_TIME_CONTEXT . ',${EXTEN},1)' . PHP_EOL . "\t";
    }

    /**
     * Generates the out of work time configurations.
     *
     * @return void
     */
    private function generateOutWorkTimes(): void
    {
        $this->conf =   PHP_EOL."[playback-exit]".PHP_EOL.
                        'exten => ' . ExtensionsConf::ALL_EXTENSION . ',1,Gosub(dial_outworktimes,${EXTEN},1)' . PHP_EOL."\t".
                        'same => n,Playback(${filename})' . PHP_EOL. "\t".
                        'same => n,Hangup()'.PHP_EOL.
                        'exten => _[hit],1,Hangup()'.PHP_EOL.PHP_EOL;
        $this->conf .=  '[calendar-event]'.PHP_EOL.
                        'exten  => s,1,NoOp( calendar: ${CALENDAR_EVENT(calendar)}, summary: ${CALENDAR_EVENT(summary)} )'.PHP_EOL."\t".
	                    'same => n,NoOp( description: ${CALENDAR_EVENT(description)} )'.PHP_EOL."\t".
	                    'same => n,NoOp( start: ${CALENDAR_EVENT(start)}, end: ${CALENDAR_EVENT(end)})'.PHP_EOL."\t".
	                    'same => n,NoOp( busystate: ${CALENDAR_EVENT(busystate)} )'.PHP_EOL."\t".
	                    'same => n,answer()'.PHP_EOL."\t".
	                    'same => n,Wait(2)' . PHP_EOL .
	                    'same => n,hangup' . PHP_EOL . PHP_EOL;

        $routesData = $this->getRoutesData();
        $additionalContexts = '';
        $conf_out_set_var = '';
        $data = OutWorkTimes::find(['order'=>'priority, date_from'])->toArray();
        $this->conf .= "[" . self::OUT_WORK_TIME_CONTEXT . "]".PHP_EOL;
        $this->conf .= 'exten => ' . ExtensionsConf::ALL_EXTENSION . ',1,Set(currentYear=${STRFTIME(,,%Y)})' . "\n\t";
        foreach ($data as $ruleData) {
            $contextId = 'check-out-work-time-'.$ruleData['id'];
            $this->conf .= 'same => n,Gosub('.$contextId.',${EXTEN},1)'.PHP_EOL."\t";
            $additionalContexts.= '['.$contextId.']'.PHP_EOL;
            $additionalContexts.= 'exten => _[0-9*#+a-zA-Z]!,1,NoOp()'.PHP_EOL."\t";
            // Restrictions for the route are not allowed for this rule.
            if ($ruleData['allowRestriction'] === '1') {
                $additionalContexts.= 'same => n,ExecIf($["${DIALPLAN_EXISTS('.$contextId.'-${contextID},${EXTEN},1)}" == "0"]?return)'.PHP_EOL."\t";
            }
            if(empty($ruleData['calType'])){
                $this->generateOutWorkRule($ruleData, $conf_out_set_var, $additionalContexts);
            }else{
                $appdata = $this->initRuleAppData($ruleData, $conf_out_set_var);
                $additionalContexts.= 'same => n,GotoIf(${CALENDAR_BUSY(calendar-'.$ruleData['id'].')}?'.$appdata.')'.PHP_EOL."\t";
            }
            $additionalContexts.= 'same => n,return'.PHP_EOL;
            $additionalContexts.= 'exten => _[hit],1,Hangup()'.PHP_EOL;
            $contextData = $routesData[$ruleData['id']]??[];
            foreach ($contextData as $subContext => $arrayDid){
                $additionalContexts.= "[$contextId-$subContext]".PHP_EOL;
                foreach (array_unique($arrayDid) as $did){
                    $additionalContexts .= "exten => $did,1,NoOp(-)" . PHP_EOL;
                }
            }
            $additionalContexts.= PHP_EOL;

        }
        $this->conf .= "same => n,return".PHP_EOL;
        $this->conf .= 'exten => _[hit],1,Hangup()' . PHP_EOL.PHP_EOL;
        $this->conf .= $additionalContexts.PHP_EOL;
        $this->conf .= PHP_EOL.$conf_out_set_var.PHP_EOL;
    }

    /**
     * Retrieves the data for the routes.
     *
     * @return array
     */
    private function getRoutesData(): array
    {
        $parameters = [
            'columns' => 'routId,timeConditionId',
        ];
        $allowedRouts    = OutWorkTimesRouts::find($parameters);

        $conditionsRoute = [];
        foreach ($allowedRouts as $tcRouteData){
            $conditionsRoute[$tcRouteData->routId][] = $tcRouteData->timeConditionId;
        }
        $filter = [
            'order' => 'priority',
            'conditions' => 'id>1'
        ];
        $rules = IncomingRoutingTable::find($filter);
        $routesData = [];
        foreach ($rules as $inRoute) {
            $provider = $inRoute->Providers;
            if ($provider) {
                $modelType = ucfirst($provider->type);
                $provByType = $provider->$modelType;
                if (get_class($provider->$modelType) === Iax::class) {
                    $context_id = "{$provider->uniqid}-incoming";
                }elseif ($provByType->registration_type === Sip::REG_TYPE_INBOUND){
                    $context_id = "{$provider->uniqid}-incoming";
                } else {
                    $context_id = SIPConf::getContextId($provByType->host , $provByType->port);
                }
            } else {
                $context_id = 'none-incoming';
            }
            foreach ($conditionsRoute[$inRoute->id]??[] as $timeConditionId){
                $routesData[$timeConditionId][$context_id][] = empty($inRoute->number) ? ExtensionsConf::ALL_EXTENSION : $inRoute->number;
            }
        }
        return $routesData;
    }

    /**
     * Generate the out-of-work rule based on the provided data.
     *
     * @param array    $srcOutData The data for the out-of-work rule.
     * @param string  &$conf_out_set_var The output string for the SET variables.
     * @param string  &$conf The output string for the configuration.
     *
     * @return void
     */
    private function generateOutWorkRule(array $srcOutData, string &$conf_out_set_var, string &$conf): void
    {
        $intervals = $this->splitIntoMonthlyIntervals($srcOutData['date_from'], $srcOutData['date_to']);
        if(empty($intervals)){
            $timesArray = $this->getTimesInterval($srcOutData);
            $weekdays   = $this->getWeekDayInterval($srcOutData);
            [$mDays, $months] = $this->initDaysMonthsInterval($srcOutData);
            $appdata = $this->initRuleAppData($srcOutData, $conf_out_set_var);
            foreach ($timesArray as $times) {
                $conf .= "same => n,GotoIfTime($times,$weekdays,$mDays,$months?{$appdata})\n\t";
            }
        }else{
            foreach ($intervals as $interval){
                [$srcOutData['date_from'],$srcOutData['date_to']] = $interval;

                $timesArray = $this->getTimesInterval($srcOutData);
                $weekdays   = $this->getWeekDayInterval($srcOutData);

                [$mDays, $months] = $this->initDaysMonthsInterval($srcOutData);
                $appdata = $this->initRuleAppData($srcOutData, $conf_out_set_var);

                $year = 1 * date('Y', $srcOutData['date_from']);
                foreach ($timesArray as $times) {
                    $timeAppData = "GotoIfTime($times,$weekdays,$mDays,$months?{$appdata})";
                    $conf .= 'same => n,ExecIf($["${currentYear}" == "'.$year.'"]?'.$timeAppData.')'."\n\t";
                }
            }
        }
    }

    /**
     * Get intervals from timestamp
     * @param $date_from
     * @param $date_to
     * @return array
     */
    private function splitIntoMonthlyIntervals($date_from, $date_to):array
    {
        if(empty($date_from) || empty($date_to)){
            return [];
        }
        $intervals = [];
        $start = new DateTime();
        $start->setTimestamp($date_from);
        $end = new DateTime();
        $end->setTimestamp($date_to);
        while ($start < $end) {
            $interval_start = clone $start;
            $interval_end = clone $start;
            $interval_end->modify('last day of this month 23:59:59');
            if ($interval_end > $end) {
                $interval_end = $end;
            }
            $intervals[] = [
                $interval_start->getTimestamp(),
                $interval_end->getTimestamp()
            ];
            $start->modify('first day of next month 00:00:00');
        }

        return $intervals;
    }

    /**
     * Get the time intervals based on the provided out-of-work data.
     *
     * @param array $out_data The out-of-work data.
     *
     * @return array The time intervals.
     */
    private function getTimesInterval(array $out_data): array
    {
        $time_from  = $out_data['time_from'];
        $time_to    = $out_data['time_to'];
        if (empty($time_from) && empty($time_to)) {
            $intervals = ['*'];
        } else {
            $time_from  = $this->normaliseTime($time_from);
            $time_to    = $this->normaliseTime($time_to, '23:59');
            if (strtotime($time_from) > strtotime($time_to)) {
                $intervals = [
                    "{$time_from}-23:59",
                    "00:00-{$time_to}"
                ];
            } else {
                $intervals = [
                    "{$time_from}-{$time_to}"
                ];
            }
        }
        return $intervals;
    }

    /**
     * Normalize the time to an acceptable format.
     *
     * @param string $srcTime The source time to be normalized.
     * @param string $defVal The default value to be used if the source time is empty.
     * @return string The normalized time.
     */
    private function normaliseTime($srcTime, $defVal = '00:00'): string
    {
        $time = (empty($srcTime)) ? $defVal : $srcTime;
        return (strlen($time) === 4) ? "0{$time}" : $time;
    }

    /**
     * Initialize the rule application data based on the rule type.
     *
     * @param array $ruleData The rule data.
     * @param string $conf_out_set_var The reference to the configuration variable for output.
     *
     * @return string An array containing the data.
     */
    private function initRuleAppData($ruleData, string &$conf_out_set_var): string
    {
        if (IncomingRoutingTable::ACTION_EXTENSION === $ruleData['action']) {
            $appdata = "internal,{$ruleData['extension']},1";
        } else {
            /** @var SoundFiles $res */
            $res = SoundFiles::findFirst($ruleData['audio_message_id']);
            $audio_message = ($res === null) ? '' : Util::trimExtensionForFile($res->path??'');
            $dialplanName = "work-time-set-var-{$ruleData['id']}";
            if (strpos($conf_out_set_var, "[$dialplanName]") === false
                && strpos($this->conf, "[$dialplanName]") === false) {
                $conf_out_set_var .= "[{$dialplanName}]\n" .
                    'exten => ' . ExtensionsConf::ALL_EXTENSION . ',1,Set(filename=' . $audio_message . ')' . "\n\t" .
                    'same => n,Goto(playback-exit,${EXTEN},1)' . "\n" .
                    'exten => _[hit],1,Hangup()' . PHP_EOL . PHP_EOL;
            }
            $appdata = $dialplanName . ',${EXTEN},1';
        }
        return $appdata;
    }

    /**
     * Returns a string representing the weekday interval.
     *
     * @param array $out_data An array containing the weekday_from and weekday_to values.
     *
     * @return string The weekday interval string.
     */
    private function getWeekDayInterval(array $out_data): string
    {
        // Mapping of weekday numbers to abbreviations
        $arr_weekday = [null, "mon", "tue", "wed", "thu", "fri", "sat", "sun"];

        // Extract weekday_from and weekday_to values
        $weekday_from = (string)$out_data['weekday_from'];
        $weekday_to = (string)$out_data['weekday_to'];

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
     * Initializes the days and months interval based on the provided data.
     *
     * @param array $out_data An array containing the date_from and date_to values.
     *
     * @return array An array containing the days and months interval.
     */
    private function initDaysMonthsInterval(array $out_data): array
    {
        // Extract date_from and date_to values
        $date_from = $out_data['date_from'];
        $date_to = $out_data['date_to'];
        if (empty($date_from)) {
            // If date_from is empty, set mDays and months to '*'
            $mDays = '*';
            $months = '*';
        } else {
            // Convert date_from to lowercase day and month abbreviations
            $mDays = strtolower(date("j", (int)$date_from));
            $months = strtolower(date("M", (int)$date_from));
            if (!empty($date_to)) {
                $mDays .= "-" . strtolower(date("j", (int)$date_to));
                $months .= "-" . strtolower(date("M", (int)$date_to));
            }
        }
        return array($mDays, $months);
    }

    public function generateModulesConf(): string
    {
        return "load => res_calendar.so".PHP_EOL.
               "load => res_calendar_caldav.so".PHP_EOL.
               "load => res_calendar_ews.so".PHP_EOL.
               "load => res_calendar_icalendar.so".PHP_EOL;
    }
}