<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\Calls\Scripts;
use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Util;

require_once 'Globals.php';

class TestCallsBase {
    public const ACTION_ORIGINATE = 'Originate';
    public const ACTION_GENERAL_ORIGINATE = 'GeneralOriginate';
    public const ACTION_WAIT = 'Wait';

    private string $aNum;
    private string $bNum;
    private string $cNum;
    private string $offNum;

    private array  $sampleCDR;
    private array  $nonStrictComparison;
    private string $testDirName;

    private AsteriskManager $am;
    private int $countFiles;

    public function __construct(){
        $db_data = self::getIdlePeers();
        if(count($db_data) < 3){
            self::printError('Need 3 SIP account (endpoint).');
            exit(1);
        }
        // Отбираем первые учетные записи.
        $this->aNum = $db_data[0];
        $this->bNum = $db_data[1];
        $this->cNum = $db_data[2];

        $offPeers = self::getOffPeers();
        $this->offNum = $offPeers[0]??'';
        $this->am = new AsteriskManager();
        $this->am->connect('127.0.0.1:5039');
        $this->nonStrictComparison = ['duration', 'billsec', 'fileDuration'];
    }

    /**
     * Возвращает список доступных пиров.
     * @return array
     */
    public static function getIdlePeers():array{
        $am = Util::getAstManager('off');
        $result = $am->getPjSipPeers();
        $db_data = array();
        foreach ($result as $peer){
            if($peer['state']!== 'OK' || ! is_numeric($peer['id'])){
                continue;
            }
            $uAgent = $am->getPjSipPeer($peer['id'])['UserAgent']??'';
            if(empty($uAgent)){
                $uAgent = $am->getPjSipPeer($peer['id'])['UserAgent-0']??'';
            }
            if(getenv('USER_AGENT') !== $uAgent){
                continue;
            }
            $db_data[] = $peer['id'];
        }
        return $db_data;
    }

    /** Возвращает недоступные пиры */
    public static function getOffPeers():array{
        $am = Util::getAstManager('off');
        $result = $am->getPjSipPeers();
        $db_data = array();
        foreach ($result as $peer){
            if($peer['state']!== 'OK' && is_numeric($peer['id'])){
                $db_data[] = $peer['id'];
            }
        }
        return $db_data;
    }

    /**
     * Вывод информации об ошибке.
     * @param $text
     */
    public static  function printError($text) : void
    {
        file_put_contents('php://stderr', "\033[01;31m-> TEST_ERROR: ".$text."\033[39m \n");
    }

    /**
     * Вывод информации.
     * @param $text
     */
    public static function printInfo($text) : void
    {
        echo "\033[01;32m-> \033[39m$text \n";
    }

    /**
     * Вывод заголовка.
     * @param $text
     */
    public static  function printHeader($text) : void
    {
        echo "\033[01;35m$text\033[39m \n";
    }

    /**
     * Очистка таблиц CDR.
     */
    protected function cleanCdr():void
    {
        self::printInfo('Clearing the CDR table...');
        // Очистка таблиц.
        $rows = CallDetailRecords::find();
        /** @var CallDetailRecords $row */
        foreach ($rows as $row){
            $row->delete();
        }

        $rows = CallDetailRecordsTmp::find();
        /** @var CallDetailRecords $row */
        foreach ($rows as $row){
            $row->delete();
        }
    }

    /**
     * Совершает звонок и ждет его завершения.
     */
    public function originateWait():void{
        $this->actionOriginate($this->aNum, $this->bNum);
        self::printInfo('Wait end call... ');
        while (count($this->am->GetChannels(false))>0){
            sleep(1);
        }
        sleep(5);
    }

    /**
     * Originate на тестовой станции.
     * @param string $src
     * @param string $dst
     * @return bool
     */
    private function actionOriginate(string $src, string $dst):bool{
        self::printInfo("Start originate... $src to $dst");
        $dirName = getenv('dirName');
        $outgoingDir = "$dirName/logs/spool/outgoing";
        $conf = "Channel: Local/$src@orgn-wait".PHP_EOL.
            "Context: out-to-exten".PHP_EOL.
            "Extension: $dst".PHP_EOL.
            "Priority: 1".PHP_EOL.
            "Setvar: __A_NUM=$this->aNum".PHP_EOL.
            "Setvar: __B_NUM=$this->bNum".PHP_EOL.
            "Setvar: __C_NUM={$this->cNum}".PHP_EOL.
            "Setvar: __OFF_NUM={$this->offNum}".PHP_EOL;
        $tmpFile     = tempnam('/tmp', 'call');
        file_put_contents($tmpFile,$conf);
        Processes::mwExec("mv $tmpFile $outgoingDir/test.call");
        usleep(500000);
        return true;
    }

    /**
     * Originate на тестовой станции.
     * @param string $src
     * @param string $dst
     */
    private function actionOriginateGeneral(string $src, string $dst){
        self::printInfo("Start originate (general)... $src to $dst");
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $outgoingDir = dirname($monitorDir) . "/outgoing";
        $conf = "Channel: Local/$src@internal-originate".PHP_EOL.
            "Context: all_peers".PHP_EOL.
            "Extension: $dst".PHP_EOL.
            "Priority: 1".PHP_EOL.
            "Callerid: $src".PHP_EOL.
            "Setvar: __pt1c_cid=$dst".PHP_EOL;

        $tmpFile     = tempnam('/tmp', 'call');
        file_put_contents($tmpFile,$conf);
        Processes::mwExec("mv $tmpFile $outgoingDir/test.call");
        usleep(500000);
    }

    /**
     * Запуск теста из скрипта start.php с автоматическим exit code.
     * @param array $sampleCDR
     * @param array|null $rules
     * @param int $countFiles
     */
    public static function executeTest(array $sampleCDR, ?array $rules = null, int $countFiles = 0): void
    {
        $testName = basename(dirname(debug_backtrace()[0]['file']));
        $test = new self();
        $success = $test->runTest($testName, $sampleCDR, $rules, $countFiles);
        exit($success ? 0 : 1);
    }

    /**
     * Старт работы теста.
     * @param string $testName
     * @param array  $sampleCDR
     * @param ?array  $rules
     * @param int $countFiles
     * @return bool true если тест прошёл успешно
     */
    public function runTest(string $testName, array $sampleCDR, ?array $rules=null, int $countFiles=0): bool{

        self::printHeader('Start test '. $testName .' ...');
        self::printInfo("aNum: $this->aNum, bNum: $this->bNum, cNum: $this->cNum, offNum: $this->offNum");
        $this->testDirName = $testName;
        $this->sampleCDR   = $sampleCDR;
        $this->countFiles  = $countFiles;

        $this->cpConfig();
        $this->cleanCdr();

        $this->initSampleCdr();
        if(empty($rules)){
            $this->originateWait();
        }else{
            $this->invokeRules($rules);
        }
        $success = $this->checkCdr();
        $this->sampleCDR            = [];
        $this->nonStrictComparison  = [];

        if($success){
            self::printInfo("End test - PASSED\n");
        }else{
            self::printError("End test - FAILED\n");
        }
        return $success;
    }

    /**
     * @param $rules
     */
    private function invokeRules($rules):void{
        foreach ($rules as $rule){
            [$action] = $rule;
            $method = "invoke{$action}";
            if (method_exists($this, $method)){
                $this->$method($rule);
            }
        }
        self::printInfo('Wait end call...');
        while (count($this->am->GetChannels(false))>0){
            sleep(1);
        }
    }

    private function invokeOriginate($rule):void{
        [$action, $src, $dst] = $rule;
        if($action !== self::ACTION_ORIGINATE){
            return;
        }
        if(property_exists(self::class, $src)){
            $src = $this->$src;
        }
        if(property_exists(self::class, $dst)){
            $dst = $this->$dst;
        }

        $i=0;
        while ($i<=5){
            $i++;
            if($this->actionOriginate($src, $dst)){
                break;
            }
        }
    }

    /**
     * Originate на основной (тестируемой) АТС.
     * @param array $rule
     * @throws \Exception
     */
    private function invokeGeneralOriginate(array $rule):void{
        [$action, $src, $dst] = $rule;
        if($action !== self::ACTION_GENERAL_ORIGINATE){
            return;
        }
        if(property_exists(self::class, $src)){
            $src = $this->$src;
        }
        if(property_exists(self::class, $dst)){
            $dst = $this->$dst;
        }
        $this->actionOriginateGeneral($src, $dst);
    }

    private function invokeWait($rule):void{
        [$action, $time] = $rule;
        if($action !== self::ACTION_WAIT && !is_numeric($time)){
            return;
        }
        self::printInfo('Waiting : '.$time."s.");
        sleep($time);
    }

    /**
     * Инициализация эталона таблицы CDR.
     */
    private function initSampleCdr():void{
        self::printInfo("Init sample cdr table...");
        foreach ($this->sampleCDR as $index => $row) {
            foreach ($row as $key => $value){
                if(property_exists(self::class, $value)){
                    $this->sampleCDR[$index][$key] = $this->$value;
                }
            }
        }
    }

    /**
     * Сравнение CDR с эталоном.
     * @return bool true если CDR совпадает с эталоном
     */
    protected function checkCdr(): bool
    {
        $expectedCount = count($this->sampleCDR);
        $filter = [
            'work_completed=1',
            'columns' => '*'
        ];

        // Ожидаем появления нужного количества CDR записей (polling вместо sleep(15))
        $maxWait = 30;
        $rows = [];
        for ($waited = 0; $waited < $maxWait; $waited++) {
            sleep(1);
            $rows = CDRDatabaseProvider::getCdr($filter);
            if (count($rows) >= $expectedCount) {
                break;
            }
            if ($waited % 5 === 4) {
                self::printInfo("Waiting for CDR... got " . count($rows) . " of $expectedCount ($waited" . "s)");
            }
        }

        $success = true;
        if(count($rows) !== $expectedCount){
            self::printError('Call history compromised. Count:'.count($rows).", need: ".$expectedCount);
            return false;
        }
        self::printInfo('Create CDR successfully');

        $checkedIndexes = [];
        $rcFiles = [];
        foreach ($rows as $row){
            $wavFile = Util::trimExtensionForFile($row['recordingfile'].'.wav');
            if(!file_exists($row['recordingfile']) && !file_exists($wavFile)){
                if($row['billsec'] > 0 && $this->countFiles === 0){
                    self::printError("File not found '{$row['recordingfile']}'");
                    $success = false;
                }
            }else{
                $rcFiles[$row['recordingfile']] = 1;
                Processes::mwExec("soxi {$row['recordingfile']} | grep Duration | awk '{print $3}' | awk -F '.'  '{print $1}'", $out);
                $timeData = explode(':', implode($out));
                $d = (int)($timeData[0]??0);
                $h = (int)($timeData[1]??0);
                $s = (int)($timeData[2]??0);
                $seconds = $s + 60*$h + $d*24*60;
                $row['fileDuration'] = (string)$seconds;
                self::printInfo('Rec. file:'.basename($row['recordingfile']).", sox duration: ".implode($out).", duration: ".$row['fileDuration']);
            }
            $ok = true;
            foreach ($this->sampleCDR as $index => $cdrS){
                $ok = true;
                if(in_array($index, $checkedIndexes, true)){
                    continue;
                }
                foreach ($cdrS as $key => $data){
                    if(in_array($key, $this->nonStrictComparison, true)){
                        $valRow     = (int) $row[$key];
                        $valSample  = (int) $data;
                        $values = [$valSample, ($valSample-1), ($valSample+1)];
                        if($key === 'fileDuration' && $this->countFiles > 0){
                            $ok = true;
                        }else{
                            $ok = min($ok, in_array($valRow, $values));
                        }
                    }elseif($row[$key] === $data){
                        $ok = min($ok, true);
                    }else{
                        $ok = false;
                    }
                    if(!$ok){
                        break;
                    }
                }
                if($ok){
                    $checkedIndexes[] = $index;
                    break;
                }
            }
            if(!$ok){
                self::printError("CDR mismatch: ".json_encode($row));
                return false;
            }

        }
        if($this->countFiles > 0 && count($rcFiles) !== $this->countFiles){
            self::printError("Recording file count mismatch: got ".count($rcFiles).", expected ".$this->countFiles);
            return false;
        }
        return $success;
    }

    protected function cpConfig(): void
    {
        $rootDir = dirname(__DIR__);
        $confDir = __DIR__."/{$this->testDirName}/configs";
        $astConf = "{$rootDir}/asterisk/asterisk.conf";

        self::printInfo("Copying configuration files...");
        Processes::mwExec("cp -R {$confDir}/* {$rootDir}/asterisk/");

        $cmdAsterisk = Util::which(PBX::PROC_NAME);
        self::printInfo("Reload dialplan... ");
        Processes::mwExec("{$cmdAsterisk} -C '{$astConf}' -rx 'dialplan reload'");

        // Ожидаем загрузки dialplan (polling вместо sleep(5))
        for ($i = 0; $i < 10; $i++) {
            usleep(500000);
            Processes::mwExec("{$cmdAsterisk} -C '{$astConf}' -rx 'dialplan show orgn-wait'", $out);
            if (!empty($out)) {
                break;
            }
        }
    }
}