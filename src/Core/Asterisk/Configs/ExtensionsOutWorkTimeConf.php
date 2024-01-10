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
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;

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
     * Generates the extension contexts for out of work time configurations.
     *
     * @return string The generated configuration.
     */
    public function extensionGenContexts(): string
    {
        $this->generateOutWorkTimes();
        return $this->conf;
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
        return  'same => n,ExecIf($["${CONTEXT}" == "public-direct-dial"]?Set(contextID=none-incoming))' . PHP_EOL . "\t" .
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
        $this->conf = "\n\n[playback-exit]\n";
        $this->conf .= 'exten => ' . ExtensionsConf::ALL_EXTENSION . ',1,Gosub(dial_outworktimes,${EXTEN},1)' . "\n\t";
        $this->conf .= 'same => n,Playback(${filename})' . "\n\t";
        $this->conf .= 'same => n,Hangup()' . "\n";
        $this->conf .= 'exten => _[hit],1,Hangup()' . PHP_EOL . PHP_EOL;

        $this->getWorkTimeDialplan(ExtensionsConf::ALL_EXTENSION);
    }

    /**
     * Retrieves the data for the routes.
     *
     * @return array The routes data.
     */
    private function getRoutesData(): array
    {
        $parameters = [
            'columns' => 'routId,timeConditionId',
        ];
        $allowedRouts  = OutWorkTimesRouts::find($parameters);
        $allowedRulesIds = array_column($allowedRouts->toArray(), 'routId');
        $filter = [
            'order' => 'priority',
            'conditions' => 'id>1'
        ];
        $rules = IncomingRoutingTable::find($filter);
        $routesData = [];
        foreach ($rules as $rule) {
            $provider = $rule->Providers;
            if ($provider) {
                $modelType = ucfirst($provider->type);
                $provByType = $provider->$modelType;
                if (get_class($provider->$modelType) === Iax::class) {
                    $context_id = "{$provider->uniqid}-incoming";
                } else {
                    $context_id = SIPConf::getContextId($provByType->host . $provByType->port);
                }
            } else {
                $context_id = 'none-incoming';
            }
            $routesData[$rule->id] = [
                'context' => $context_id,
                'did' => empty($rule->number) ? ExtensionsConf::ALL_EXTENSION : $rule->number,
                'enable' => in_array($rule->id, $allowedRulesIds, true)
            ];
        }

        $trueContext = [];
        $confByContext = [];
        foreach ($routesData as $didData) {
            if(($trueContext[$didData['context']]??false) === true){
                continue;
            }
            $confByContext[$didData['context']][$didData['did']] = ($didData['enable']) ? '' : false;
            if ($didData['enable']) {
                $trueContext[$didData['context']] = true;
            }
        }
        foreach ($confByContext as $key => $val) {
            if (!isset($trueContext[$key])) {
                unset($confByContext[$key]);
            }
        }
        unset($trueContext);

        $tcData = [];
        foreach ($allowedRouts as $tcRoute) {
            if(!isset($routesData[$tcRoute->routId])){
                continue;
            }
            $tcData["" . $tcRoute->timeConditionId][] = $routesData[$tcRoute->routId];
        }
        return [$tcData, $confByContext];
    }

    /**
     * Generates the work time dialplan configuration.
     *
     * @param string $extension The extension.
     *
     * @return void
     */
    private function getWorkTimeDialplan($extension): void
    {
        [$routesData, $confByContext] = $this->getRoutesData();
        $checkContextsYear = [];
        $conf_out_set_var = '';
        $data = OutWorkTimes::find(['order' => 'date_from'])->toArray();
        $this->conf .= "[" . self::OUT_WORK_TIME_CONTEXT . "]\n";
        $this->conf .= 'exten => ' . $extension . ',1,Set(currentYear=${STRFTIME(,,%Y)})' . "\n\t";
        $this->conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-${contextID},${EXTEN},1)}" == "1"]?${CONTEXT}-${contextID},${EXTEN},1)' . "\n\t";
        $this->conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-${currentYear},${EXTEN},1)}" == "1"]?${CONTEXT}-${currentYear},${EXTEN},1)' . "\n\t";
        foreach ($data as $ruleData) {
            if ($ruleData['allowRestriction'] !== '1') {
                // Restrictions for the route are not allowed for this rule.
                unset($routesData[$ruleData['id']]);
            }
            if (isset($routesData[$ruleData['id']])) {
                continue;
            }
            $intervals = $this->getOutWorkIntervals($ruleData['date_from'], $ruleData['date_to']);
            foreach ($intervals as $interval) {
                $ruleData['date_to'] = $interval['date_to'];
                $ruleData['date_from'] = $interval['date_from'];
                $this->generateOutWorkRule($ruleData, $conf_out_set_var, $this->conf, $checkContextsYear);
            }
        }
        $this->conf .= "same => n,return\n\n";
        $this->conf .= 'exten => _[hit],1,Hangup()' . PHP_EOL;
        $this->conf .= $conf_out_set_var;

        foreach ($checkContextsYear as $year => $rule) {
            $this->conf .= "[" . self::OUT_WORK_TIME_CONTEXT . "-{$year}]\n";
            $this->conf .= 'exten => ' . ExtensionsConf::ALL_EXTENSION . ",1,NoOp(check time {$year} year)\n\t";
            $this->conf .= implode("", $rule);
            $this->conf .= "same => n,return\n";
            $this->conf .= 'exten => _[hit],1,Hangup()' . PHP_EOL;
        }

        foreach ($confByContext as $contextKey => &$confContext) {
            $checkContextsYear = [];
            $conf_out_set_var = '';
            $this->conf .= "[" . self::OUT_WORK_TIME_CONTEXT . "-$contextKey]\n";
            $dialplanDid = [];
            foreach ($confContext as $did => $confDid) {
                if ($confDid === false) {
                    // This DID should not participate in "out of work time".
                    continue;
                }
                if (!isset($dialplanDid[$did])) {
                    $dialplanDid[$did] = '';
                }
                foreach ($data as $ruleData) {
                    $didPreArray = $routesData[$ruleData['id']] ?? [];
                    if (empty($didPreArray)) {
                        continue;
                    }
                    $didArray = array_column($didPreArray, 'did');
                    if (!isset($routesData[$ruleData['id']]) || !in_array((string)$did, $didArray, true)) {
                        continue;
                    }
                    $intervals = $this->getOutWorkIntervals($ruleData['date_from'], $ruleData['date_to']);
                    foreach ($intervals as $interval) {
                        $ruleData['date_to'] = $interval['date_to'];
                        $ruleData['date_from'] = $interval['date_from'];
                        $checkContextsYearDid = [];
                        $this->generateOutWorkRule($ruleData, $conf_out_set_var, $dialplanDid[$did], $checkContextsYearDid);
                        $checkContextsYear[$did][] = $checkContextsYearDid;
                    }
                }

                $tmpConf = [];
                foreach ($data as $ruleData) {
                    $didPreArray = $routesData[$ruleData['id']] ?? [];
                    if (empty($didPreArray)) {
                        continue;
                    }
                    $didArray = array_column($didPreArray, 'did');
                    if ($confDid === false) {
                        $dialplan = '';
                    } elseif (!isset($routesData[$ruleData['id']]) || !in_array((string)$did, $didArray, true)) {
                        continue;
                    } else {
                        $dialplan = 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-${currentYear},${EXTEN},1)}" == "1"]?${CONTEXT}-${currentYear},${EXTEN},1)' . "\n\t";
                        $dialplan .= $dialplanDid[$did];
                    }
                    $tmpConf[$did] = 'exten => ' . ExtensionsConf::getExtenByDid($did) . ',1,NoOp()' . "\n\t";
                    $tmpConf[$did] .= $dialplan;
                    $tmpConf[$did] .= "same => n,return\n\n";
                }
                $this->conf .= implode('', $tmpConf);
            }
            $this->conf .= 'exten => _[hit],1,Hangup()' . PHP_EOL . PHP_EOL;
            $confYear = [];
            foreach ($checkContextsYear as $did => $tmpArr) {
                foreach ($tmpArr as $years) {
                    foreach ($years as $year => $rule) {
                        if (!isset($confYear[$year])) {
                            $confYear[$year][$did] = '';
                        }
                        $confYear[$year][$did] .= implode("\n\t", $rule);
                    }
                }
            }
            foreach ($confYear as $year => $ruleData) {
                $this->conf .= "[" . self::OUT_WORK_TIME_CONTEXT . "-$contextKey-{$year}]\n";
                foreach ($ruleData as $did => $rule) {
                    $this->conf .= 'exten => ' . ExtensionsConf::getExtenByDid($did) . ",1,NoOp(check time {$year} year)\n\t";
                    $this->conf .= $rule;
                    $this->conf .= "same => n,return\n";
                }
                $this->conf .= 'exten => _[hit],1,Hangup()' . PHP_EOL . PHP_EOL;
            }
            $this->conf .= $conf_out_set_var;
        }
    }

    /**
     * Get the out-of-work intervals based on the provided date range.
     *
     * @param int $date_from The starting date.
     * @param int $date_to The ending date.
     *
     * @return array An array of intervals.
     */
    private function getOutWorkIntervals($date_from, $date_to): array
    {
        $year_from = 1 * date('Y', (int)$date_from);
        $year_to = 1 * date('Y', (int)$date_to);

        $intervals = [];
        $Year = $year_from;
        if ($year_to === $year_from) {
            $intervals[] = [
                'date_from' => $date_from,
                'date_to' => $date_to
            ];
            return $intervals;
        }
        while ($Year <= $year_to) {
            if ($Year === $year_from) {
                $intervals[] = [
                    'date_from' => $date_from,
                    'date_to' => (string)strtotime('31-12-' . $Year)
                ];
            } elseif ($Year === $year_to) {
                $intervals[] = [
                    'date_from' => (string)strtotime('01-01-' . $Year),
                    'date_to' => $date_to
                ];
            } else {
                $intervals[] = [
                    'date_from' => (string)strtotime('01-01-' . $Year),
                    'date_to' => (string)strtotime('31-12-' . $Year)
                ];
            }
            $Year++;
        }
        return $intervals;
    }

    /**
     * Generate the out-of-work rule based on the provided data.
     *
     * @param array $out_data The data for the out-of-work rule.
     * @param string  &$conf_out_set_var The output string for the SET variables.
     * @param string  &$conf The output string for the configuration.
     * @param array   &$checkContextsYear An array to store the rules for each year.
     *
     * @return void
     */
    private function generateOutWorkRule(array $out_data, string &$conf_out_set_var, string &$conf, array &$checkContextsYear): void
    {
        $year_from = '';
        if (!empty($out_data['date_from']) && !empty($out_data['date_to'])) {
            $year_from = date('Y', (int)$out_data['date_to']);
        }

        $timesArray = $this->getTimesInterval($out_data);
        $weekdays = $this->getWeekDayInterval($out_data);

        [$mDays, $months] = $this->initDaysMonthsInterval($out_data);
        [$appName, $appdata] = $this->initRuleAppData($out_data, $conf_out_set_var);

        foreach ($timesArray as $times) {
            $rule = "same => n,{$appName}($times,$weekdays,$mDays,$months?{$appdata})\n\t";
            if (empty($year_from)) {
                $conf .= $rule;
            } else {
                $checkContextsYear[$year_from][] = $rule;
            }
        }
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
        $time_from = $out_data['time_from'];
        $time_to = $out_data['time_to'];
        if (empty($time_from) && empty($time_to)) {
            $intervals = ['*'];
        } else {
            $time_from = $this->normaliseTime($time_from);
            $time_to = $this->normaliseTime($time_to, '23:59');
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
     * @return array An array containing the application name and data.
     */
    private function initRuleAppData($ruleData, string &$conf_out_set_var): array
    {
        if ('extension' === $ruleData['action']) {
            $appName = 'GotoIfTime';
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
            $appName = 'ExecIfTime';
            $appdata = 'Goto(' . $dialplanName . ',${EXTEN},1)';
        }
        return array($appName, $appdata);
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

}