<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */

namespace MikoPBX\Tests\Calls\Scripts;
use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\System\Util;

require_once 'Globals.php';

class TestCallsBase {
    public const ACtION_ORIGINATE = 'Originate';
    public const ACtION_WAIT = 'Wait';

    private string $aNum;
    private string $bNum;
    private string $cNum;

    private array  $sampleCDR;
    private array  $nonStrictComparison;
    private string $testDirName;

    private AsteriskManager $am;

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

        $this->am = new AsteriskManager();
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
            $db_data[] = $peer['id'];
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

    private function actionOriginate(string $src, string $dst):void{
        $this->am->connect('127.0.0.1:5039');
        self::printInfo("Start originate... $src to $dst");
        $result = $this->am->Originate(
            'Local/'.$src.'@orgn-wait',
            $dst,
            'out-to-exten',
            '1',
            null,
            null,
            '1',
            null,
            "__A_NUM={$this->aNum},__B_NUM={$this->bNum},__C_NUM={$this->cNum}",
            null,
            '0');
        self::printInfo('Result originate: '.$result['Response']??'none');
        // $this->am->disconnect();
    }

    /**
     * Старт работы теста.
     * @param string $testName
     * @param array  $sampleCDR
     * @param ?array  $rules
     */
    public function runTest(string $testName, array $sampleCDR, ?array $rules=null): void{

        self::printHeader('Start test '. $testName .' ...');
        $this->testDirName = $testName;
        $this->sampleCDR   = $sampleCDR;

        $this->cpConfig();
        $this->cleanCdr();

        $this->initSampleCdr();
        if(count($rules) === 0 ){
            $this->originateWait();
        }else{
            $this->invokeRules($rules);
        }

        $this->checkCdr();
        $this->sampleCDR            = [];
        $this->nonStrictComparison  = [];

        self::printInfo("End test\n");
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
        // echo "--\n";
        while (count($this->am->GetChannels(false))>0){
            sleep(1);
        }
    }

    private function invokeOriginate($rule):void{
        [$action, $src, $dst] = $rule;
        if($action !== self::ACtION_ORIGINATE){
            return;
        }
        if(property_exists(self::class, $src)){
            $src = $this->$src;
        }
        if(property_exists(self::class, $dst)){
            $dst = $this->$dst;
        }

        $this->actionOriginate($src, $dst);
    }

    private function invokeWait($rule):void{
        [$action, $time] = $rule;
        if($action !== self::ACtION_WAIT && !is_numeric($time)){
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
                if(in_array($value, ['aNum', 'bNum', 'cNum'])){
                    $this->sampleCDR[$index][$key] = $this->$value;
                }
            }
        }
    }

    /**
     * Сравнение CDR с эталоном.
     */
    protected function checkCdr(): void
    {
        sleep(4);
        // Проверяем результат.
        $rows = CallDetailRecords::find()->toArray();
        if(count($rows) !== count($this->sampleCDR)){
            self::printError('Call history compromised. Count:'.count($rows).", need: ".count($this->sampleCDR));
            return;
        }
        self::printInfo('Create CDR successfully');
        foreach ($rows as $index => $row){
            if(!file_exists($row['recordingfile'])){
                if($row['billsec'] > 0){
                    self::printError("File not found '{$row['recordingfile']}'");
                }
            }else{
                Util::mwExec("soxi {$row['recordingfile']} | grep Duration | awk '{print $3}' | awk -F '.'  '{print $1}'", $out);
                $timeData = explode(':', implode($out));
                $d = (int)($timeData[0]??0);
                $h = (int)($timeData[1]??0);
                $s = (int)($timeData[2]??0);
                $seconds = $s + 60*$h + $d*24*60;
                $row['fileDuration'] = (string)$seconds;
                self::printInfo('Rec. file:'.basename($row['recordingfile']).", sox duration: ".implode($out).", duration: ".$row['fileDuration']);
            }
            $cdrS = $this->sampleCDR[$index];
            foreach ($cdrS as $key => $data){
                if(in_array($key, $this->nonStrictComparison, true)){
                    $valRow     = (int) $row[$key];
                    $valSample  = (int) $data;
                    $values = [$valSample, ($valSample-1), ($valSample+1)];
                    if( !in_array($valRow, $values) ){
                        self::printError("Index row '{$index}', key '{$key}' {$valRow} !== {$data}");
                    }
                }elseif($row[$key] !== $data){
                    self::printError("Index row '{$index}', key '{$key}' {$row[$key]} !== {$data}");
                }
            }
        }
    }

    protected function cpConfig(): void
    {
        $rootDir = dirname(__DIR__);
        $confDir = __DIR__."/{$this->testDirName}/configs";
        $astConf = "{$rootDir}/asterisk/asterisk.conf";

        self::printInfo("Copying configuration files...");
        Util::mwExec("cp -R {$confDir}/* {$rootDir}/asterisk/");

        $cmdAsterisk = Util::which('asterisk');
        self::printInfo("Reload dialplan... ");
        Util::mwExec("{$cmdAsterisk} -C '{$astConf}' -rx 'dialplan reload'");
        // Util::mwExec("asterisk -C '{$astConf}' -rx 'module reload res_pjsip.so'");
        sleep(5);
    }
}