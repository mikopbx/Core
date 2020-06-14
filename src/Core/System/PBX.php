<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{ExtensionsConf,
    FeaturesConf,
    HttpConf,
    IAXConf,
    IndicationConf,
    ManagerConf,
    ModulesConf,
    MusicOnHoldConf,
    SIPConf,
    VoiceMailConf
};
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
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'core stop now'");
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
            $systemctlPath = Util::which('systemctl');
            Util::mwExecBg("{$systemctlPath} restart asterisk");
        } else {
            $safe_asteriskPath = Util::which('safe_asterisk');
            Util::mwExecBg("{$safe_asteriskPath} -fn");
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
        $di           = Di::getDefault();
        $asteriskPath = Util::which('asterisk');
        if ($di === null) {
            return;
        }
        $max_size    = 2;
        $log_dir     = System::getLogDir() . '/asterisk/';
        $text_config = "{$log_dir}{$f_name} {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
    start 0
    rotate 9
    size {$max_size}M
    missingok
    noolddir
    postrotate
        {$asteriskPath} -rx 'logger reload' > /dev/null 2> /dev/null
    endscript
}";
        $varEtcPath  = $di->getShared('config')->path('core.varEtcPath');
        $path_conf   = $varEtcPath . '/asterisk_logrotate_' . $f_name . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}{$f_name}") > $mb10) {
            $options = '-f';
        }
        $logrotatePath = Util::which('logrotate');
        Util::mwExecBg("{$logrotatePath} {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     * Перезапуск модуля features.
     *
     * @return array
     */
    public static function featuresReload(): array
    {
        $featuresConf = new FeaturesConf();
        $featuresConf->generateConfig();
        $result       = [
            'result' => 'Success',
        ];
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'module reload features'", $arr_out);
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
        $featuresConf->generateConfig();
        $result       = [
            'result' => 'Success',
        ];
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'core reload'", $arr_out);
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
        $managerCong = new ManagerConf();
        $managerCong->generateConfig();

        $httpConf = new HttpConf();
        $httpConf->generateConfig();

        $result       = [
            'result' => 'Success',
            'data'   => '',
        ];
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'module reload manager'", $arr_out);
        $out = implode(' ', $arr_out);
        if ( ! "Module 'manager' reloaded successfully." === $out) {
            $result['result'] = 'ERROR';
        }
        $result['data'] .= $out;

        Util::mwExec("{$asteriskPath} -rx 'module reload http'", $arr_out);
        $out = implode(' ', $arr_out);
        if ( ! "Module 'http' reloaded successfully." === trim($out)) {
            $result['result'] = 'ERROR';
        }
        $result['data'] .= " $out";

        return $result;
    }

    public static function musicOnHoldReload(): array
    {
        $o = new MusicOnHoldConf();
        $o->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'module reload manager'");

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
        $o = new VoiceMailConf();
        $o->generateConfig();
        $result       = [
            'result' => 'Success',
        ];
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'voicemail reload'", $arr_out);
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
        $pbx->generateConfig();
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'core restart now'", $arr_out);

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
     * Reload SIP
     */
    public static function sipReload(): array
    {
        $di     = Di::getDefault();
        $result = [
            'result'  => 'ERROR',
            'message' => '',
        ];
        if ($di === null) {
            return $result;
        }
        $network = new Network();

        $topology    = 'public';
        $extipaddr   = '';
        $exthostname = '';
        $networks    = $network->getEnabledLanInterfaces();
        foreach ($networks as $if_data) {
            $lan_config = $network->getInterface($if_data['interface']);
            if (null === $lan_config['ipaddr'] || null === $lan_config['subnet']) {
                continue;
            }
            if (trim($if_data['internet']) === '1') {
                $topology    = trim($if_data['topology']);
                $extipaddr   = trim($if_data['extipaddr']);
                $exthostname = trim($if_data['exthostname']);
            }
        }
        $old_hash   = '';
        $varEtcPath = $di->getShared('config')->path('core.varEtcPath');
        if (file_exists($varEtcPath . '/topology_hash')) {
            $old_hash = file_get_contents($varEtcPath . '/topology_hash');
        }
        $now_hadh = md5($topology . $exthostname . $extipaddr);

        $sip = new SIPConf();
        $sip->generateConfig();


        $out = [];
        if ($old_hash === $now_hadh) {
            $asteriskPath = Util::which('asterisk');
            Util::mwExec("{$asteriskPath} -rx 'module reload acl'", $out);
            Util::mwExec("{$asteriskPath} -rx 'core reload'", $out);
            $out_data = trim(implode('', $out));
            if ($out_data !== '') {
                $result['message'] .= $out_data;
            }
        } else {
            // Завершаем каналы.
            $asteriskPath = Util::which('asterisk');
            Util::mwExec("{$asteriskPath} -rx 'channel request hangup all'", $out);
            usleep(500000);
            Util::mwExec("{$asteriskPath} -rx 'core restart now'", $out);
            $out_data = trim(implode('', $out));
            if ($out_data !== '') {
                $result['message'] .= $out_data;
            }
        }

        if ($result['message'] === '') {
            $result['result'] = 'Success';
        }

        return $result;
    }

    /**
     * Перезапуск модуля IAX2;
     */
    public static function iaxReload(): array
    {
        $result = [
            'result' => 'ERROR',
        ];
        $iax    = new IAXConf();
        $iax->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Util::mwExec("{$asteriskPath} -rx 'iax2 reload'");
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Ожидаем полной загрузки asterisk.
     *
     * @return bool
     */
    public static function waitFullyBooted(): bool
    {
        $time_start = microtime(true);
        $result     = false;
        $out        = [];
        if (Util::isSystemctl()) {
            $options = '';
        } else {
            $options = '-t';
        }
        $timeoutPath  = Util::which('timeout');
        $asteriskPath = Util::which('asterisk');
        while (true) {
            $execResult = Util::mwExec(
                "{$timeoutPath} {$options} 1 {$asteriskPath} -rx'core waitfullybooted'",
                $out
            );
            if ($execResult === 0 && implode('', $out) === 'Asterisk has fully booted.') {
                $result = true;
                break;
            }
            $time = microtime(true) - $time_start;
            if ($time > 60) {
                Util::sysLogMsg(__CLASS__, 'Error: Asterisk has not booted');
                break;
            }
        }

        return $result;
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
        foreach ($this->arrObject as $appClass) {
            $appClass->generateConfig();
        }
        self::dialplanReload();
        if ($this->booting) {
            echo "   |- dialplan reload \033[32;1mdone\033[0m \n";
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
    public static function dialplanReload(): array
    {
        $di      = Di::getDefault();
        $booting = $di->getRegistry()->booting;
        $result  = [
            'result' => 'ERROR',
        ];
        if ($di === null) {
            return $result;
        }

        $extensions = new ExtensionsConf();
        $extensions->generateConfig();
        if ($booting !== true) {
            $path_asterisk = Util::which('asterisk');
            Util::mwExec("{$path_asterisk} -rx 'dialplan reload'");
            Util::mwExec("{$path_asterisk} -rx 'module reload pbx_lua.so'");
        }

        $result['result'] = 'Success';

        return $result;
    }

}
