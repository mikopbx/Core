<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{ExtensionsConf,
    FeaturesConf,
    HttpConf,
    IndicationConf,
    ManagerConf,
    ModulesConf,
    OtherConf};
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\Workers\WorkerAmiListener;
use MikoPBX\Core\Workers\WorkerCallEvents;
use Phalcon\Di;

/**
 * Class PBX
 *
 * @package MikoPBX\Core\System
 */
class PBX
{
    /**
     * @var bool
     */
    public $booting;
    private $di; // Link to the dependency injector
    private $arrObject;
    private $arr_gs;
    /**
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    private $mikoPBXConfig;

    /**
     * PBX constructor.
     */
    public function __construct()
    {
        $this->di            = Di::getDefault();
        $this->mikoPBXConfig = new MikoPBXConfig();
        $this->arr_gs        = $this->mikoPBXConfig->getGeneralSettings();
        $this->booting       = $this->di->getRegistry()->booting;
        $this->arrObject     = $this->di->getShared('pbxConfModules');
    }

    /**
     * Перезапуск процесса Asterisk.
     */
    public static function restart(): void
    {
        $pbx = new PBX();
        $pbx->stop();
        $pbx->start();
    }

    /**
     * Остановка процесса Asterisk.
     */
    public function stop(): void
    {
        Util::killByName('safe_asterisk');
        sleep(1);
        Util::mwExec("asterisk -rx 'core stop now'");
        Util::processWorker('', '', WorkerCallEvents::class, 'stop');
        Util::processWorker('', '', WorkerAmiListener::class, 'stop');
        Util::killByName('asterisk');
    }

    /**
     * Запуск процесса Asterisk.
     *
     */
    public function start(): void
    {
        Network::startSipDump();
        if (Util::isSystemctl()) {
            Util::mwExecBg('systemctl restart asterisk');
        } else {
            Util::mwExecBg('/usr/sbin/safe_asterisk -fn');
        }
    }

    public static function logRotate(): void
    {
        self::rotatePbxLog('messages');
        self::rotatePbxLog('security_log');
        self::rotatePbxLog('error');
    }

    public static function rotatePbxLog($f_name): void
    {
        $di = Di::getDefault();

        if ($di === null) {
            return;
        }
        $max_size    = 2;
        $log_dir     = System::getLogDir() . '/asterisk/';
        $text_config = "{$log_dir}{$f_name}" . ' {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
    start 0
    rotate 9
    size ' . $max_size . 'M
    missingok
    noolddir
    postrotate
        /usr/sbin/asterisk -rx "logger reload" > /dev/null 2> /dev/null
    endscript
}';
        $varEtcPath  = $di->getShared('config')->path('core.varEtcPath');
        $path_conf   = $varEtcPath . '/asterisk_logrotate_' . $f_name . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}{$f_name}") > $mb10) {
            $options = '-f';
        }
        Util::mwExecBg("/usr/sbin/logrotate {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     * Перезапуск модуля features.
     *
     * @return array
     */
    public static function featuresReload(): array
    {
        $featuresConf = new FeaturesConf();
        $featuresConf->generateFeaturesConf();
        $result  = [
            'result' => 'Success',
        ];
        $arr_out = [];
        Util::mwExec("asterisk -rx 'module reload features'", $arr_out);
        $out = implode(' ', $arr_out);
        if ( ! "Module 'features' reloaded successfully." === $out) {
            $result['result'] = 'ERROR';
        }
        $result['data'] = $out;

        return $result;
    }



    /**
     * Перезапуск большинства модулей asterisk.
     *
     * @return array
     */
    public static function coreReload(): array
    {
        $featuresConf = new FeaturesConf();
        $featuresConf->generateFeaturesConf();
        $result  = [
            'result' => 'Success',
        ];
        $arr_out = [];
        Util::mwExec("asterisk -rx 'core reload'", $arr_out);
        $out = implode(' ', $arr_out);
        if ('' !== $out) {
            $result['result'] = 'ERROR';
        }
        $result['data'] = $out;

        return $result;
    }

    /**
     * Перезапуск manager модуля.
     *
     * @return array
     */
    public static function managerReload(): array
    {
        $managerCong= new ManagerConf();
        $managerCong->generateManagerConf();

        $httpConf= new HttpConf();
        $httpConf->httpConfGenerate();

        $result  = [
            'result' => 'Success',
            'data'   => '',
        ];
        $arr_out = [];
        Util::mwExec("asterisk -rx 'module reload manager'", $arr_out);
        $out = implode(' ', $arr_out);
        if ( ! "Module 'manager' reloaded successfully." === $out) {
            $result['result'] = 'ERROR';
        }
        $result['data'] .= $out;

        Util::mwExec("asterisk -rx 'module reload http'", $arr_out);
        $out = implode(' ', $arr_out);
        if ( ! "Module 'http' reloaded successfully." === trim($out)) {
            $result['result'] = 'ERROR';
        }
        $result['data'] .= " $out";

        return $result;
    }

    public static function musicOnHoldReload(): array
    {
        $o = new OtherConf();
        $o->generateConfig();
        Util::mwExec("asterisk -rx 'module reload manager'");

        return [
            'result' => 'Success',
            'data'   => '',
        ];
    }

    /**
     * Перезапуск модуля voicemail
     *
     * @return array
     */
    public static function voicemailReload(): array
    {
        $o = new OtherConf();
        $o->voiceMailConfGenerate();
        $result  = [
            'result' => 'Success',
        ];
        $arr_out = [];
        Util::mwExec("asterisk -rx 'voicemail reload'", $arr_out);
        $out = implode(' ', $arr_out);
        if ('Reloading voicemail configuration...' !== $out) {
            $result['result'] = 'ERROR';
        }
        $result['data'] = $out;

        return $result;
    }

    public static function modulesReload(): array
    {
        $pbx = new ModulesConf();
        $pbx->generateModulesConf();
        $arr_out = [];
        Util::mwExec("asterisk -rx 'core restart now'", $arr_out);

        return [
            'result' => 'Success',
            'data'   => '',
        ];
    }



    public static function checkCodec($name, $desc, $type): void
    {
        $codec = Codecs::findFirst('name="' . $name . '"');
        if ($codec === null) {
            /** @var \MikoPBX\Common\Models\Codecs $codec_g722 */
            $codec              = new Codecs();
            $codec->name        = $name;
            $codec->type        = $type;
            $codec->description = $desc;
            $codec->save();
        }
    }

    /**
     * Generates all Asterisk configuration files and (re)starts the Asterisk process
     */
    public function configure(): array
    {
        $result = [
            'result' => 'ERROR',
        ];

        if ( ! $this->booting) {
            $this->stop();
        }
        /**
         * Создание конфигурационных файлов.
         */
        if ($this->booting) {
            echo '   |- generate modules.conf... ';
        }
        $modulesConf = new ModulesConf();
        $modulesConf->generateModulesConf();
        if ($this->booting) {
            echo "\033[32;1mdone\033[0m \n";
        }

        if ($this->booting) {
            echo '   |- generate manager.conf... ';
        }
        $managerCong= new ManagerConf();
        $managerCong->generateManagerConf();

        $httpConf= new HttpConf();
        $httpConf->httpConfGenerate();
        if ($this->booting) {
            echo "\033[32;1mdone\033[0m \n";
        }

        foreach ($this->arrObject as $appClass) {
            $appClass->generateConfig($this->arr_gs);
        }
        $featuresConf = new FeaturesConf();
        $featuresConf->generateFeaturesConf();

        $indicationConf = new IndicationConf();
        $indicationConf->generateIndicationConf();

        if ($this->booting) {
            echo '   |- generate extensions.conf... ';
        }
        $this->dialplanReload();
        if ($this->booting) {
            echo "\033[32;1mdone\033[0m \n";
        }

        // Создание базы данных истории звонков.
        /** @var \Phalcon\Db\Adapter\Pdo\Sqlite $connection */
        $connection = $this->di->get('dbCDR');
        if ( ! $connection->tableExists('cdr')) {
            CdrDb::createDb();
            Util::CreateLogDB();
            RegisterDIServices::recreateDBConnections();
        } else {
            CdrDb::checkDb();
        }

        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Запуск генератора dialplan.
     *
     * @return array
     */
    public function dialplanReload(): array
    {
        global $g;
        $result = [
            'result' => 'ERROR',
        ];

        $extensions = new ExtensionsConf();
        $extensions->generate();
        if ($this->booting !== true) {
            Util::mwExec("asterisk -rx 'dialplan reload'");
            Util::mwExec("asterisk -rx 'module reload pbx_lua.so'");
        }

        $result['result'] = 'Success';

        return $result;
    }
}
