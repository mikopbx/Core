<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */
namespace MikoPBX\Core\System;

use Exception;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{
    ConferenceConf,
    DialplanApplicationConf,
    ExtensionsConf,
    ExternalPhonesConf,
    IAXConf,
    IVRConf,
    MikoAjamConf,
    OtherConf,
    ParkConf,
    QueueConf,
    SIPConf};
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Common\Models\{
    AsteriskManagerUsers,
    Codecs,
    NetworkFilters,
    PbxExtensionModules
};
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
    private $di; // Link to the dependency injector
    private $arrObject;
    private $arr_gs;

    /**
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    private $mikoPBXConfig;

    /**
     * @var bool
     */
    public $booting;

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
     * Возвращает массив инициализированных модулей АТС.
     *
     * @param $exeption_class
     *
     * @return array
     */
    public static function initAdditionalModules($exeption_class = null): array
    {
        $arrObject = [];
        $arr       = [
            ExternalPhonesConf::class,
            OtherConf::class,
            SIPConf::class,
            IAXConf::class,
            IVRConf::class,
            ParkConf::class,
            ConferenceConf::class,
            QueueConf::class,
            DialplanApplicationConf::class,
            MikoAjamConf::class,
        ];

        // Подключение классов.
        foreach ($arr as $value) {
            if ($value === $exeption_class) {
                continue;
            }
            if (class_exists($value)) {
                $arrObject[] = new $value();
            }
        }
        $modules = PbxExtensionModules::find('disabled=0');
        foreach ($modules as $value) {
            $class_name = str_replace('Module', '', $value->uniqid);
            $path_class = "\\Modules\\{$value->uniqid}\\Lib\\{$class_name}Conf";
            if (class_exists($path_class)) {
                try {
                    $arrObject[] = new $path_class();
                } catch (Exception $e) {
                    Util::sysLogMsg('INIT_MODULE', "Fail init module '{$value->uniqid}' ." . $e->getMessage());
                }
            }
        }

        return $arrObject;
    }


    /**
     * Перезапуск процесса Asterisk.
     */
    public static function restart(): void
    {
        self::stop();
        self::start();
    }

    public static function logRotate(): void
    {
        self::rotatePbxLog('messages');
        self::rotatePbxLog('security_log');
        self::rotatePbxLog('error');
    }

    public static function rotatePbxLog($f_name)
    {
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
        $varEtcPath  = Di::getDefault()->getConfig()->path('core.varEtcPath');
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
        $pbx = new PBX();
        $pbx->featuresGenerate();
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
        $pbx = new PBX();
        $pbx->featuresGenerate();
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
        $pbx = new PBX();
        $pbx->managerConfGenerate();
        $pbx->httpConfGenerate();

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
        $c = new MikoPBXConfig();
        $o->generateConfig($c->getGeneralSettings());
        Util::mwExec("asterisk -rx 'module reload manager'");
        $result = [
            'result' => 'Success',
            'data'   => '',
        ];

        return $result;
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
        $pbx = new PBX();
        $pbx->modulesConfGenerate();
        $arr_out = [];
        Util::mwExec("asterisk -rx 'core restart now'", $arr_out);
        $result = [
            'result' => 'Success',
            'data'   => '',
        ];

        return $result;
    }


    public static function checkCodec($name, $desc, $type)
    {
        $codec = Codecs::findFirst('name="' . $name . '"');
        if ( ! $codec) {
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
            self::stop();
        }
        /**
         * Создание конфигурационных файлов.
         */
        if ($this->booting) {
            echo '   |- generate modules.conf... ';
        }
        $this->modulesConfGenerate();
        if ($this->booting) {
            echo "\033[32;1mdone\033[0m \n";
        }

        if ($this->booting) {
            echo '   |- generate manager.conf... ';
        }
        $this->managerConfGenerate();
        $this->httpConfGenerate();
        if ($this->booting) {
            echo "\033[32;1mdone\033[0m \n";
        }

        foreach ($this->arrObject as $appClass) {
            $appClass->generateConfig($this->arr_gs);
        }
        $this->featuresGenerate();
        $this->indicationConfGenerate();

        if ($this->booting) {
            echo '   |- generate extensions.conf... ';
        }
        $this->dialplanReload();
        if ($this->booting) {
            echo "\033[32;1mdone\033[0m \n";
        }

        // Создание базы данных истории звонков.
        $di = Di::getDefault();
        /** @var \Phalcon\Db\Adapter\Pdo\Sqlite $connection */
        $connection = $di->get('dbCDR');
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
     * Остановка процесса Asterisk.
     */
    public static function stop(): void
    {
        Util::killByName('safe_asterisk');
        sleep(1);
        Util::mwExec("asterisk -rx 'core stop now'");
        Util::processWorker('', '', WorkerCallEvents::class, 'stop');
        Util::processWorker('', '', WorkerAmiListener::class, 'stop');
        Util::killByName('asterisk');
    }

    /**
     * Создание конфига modules.conf
     */
    private function modulesConfGenerate(): void
    {
        $conf = "[modules]\n" .
            "autoload=no\n";

        $modules = [];
        //$modules[]='res_odbc.so';
        //$modules[]='res_config_odbc.so';
        //$modules[]='pbx_realtime.so';
        //$modules[]='res_sorcery_realtime.so';
        //$modules[]='res_config_sqlite3.so';

        $modules[] = 'app_mixmonitor.so';
        $modules[] = 'app_cdr.so';
        $modules[] = 'app_exec.so';
        $modules[] = 'app_dial.so';
        $modules[] = 'app_directed_pickup.so';
        $modules[] = 'app_echo.so';
        $modules[] = 'app_meetme.so';
        $modules[] = 'app_milliwatt.so';
        $modules[] = 'app_originate.so';
        $modules[] = 'app_playback.so';
        $modules[] = 'app_playtones.so';
        $modules[] = 'app_read.so';
        $modules[] = 'app_stack.so';
        $modules[] = 'app_verbose.so';
        $modules[] = 'app_voicemail.so';
        $modules[] = 'chan_dahdi.so';
        $modules[] = 'chan_iax2.so';

        $modules[] = 'codec_alaw.so';
        $modules[] = 'codec_dahdi.so';
        $modules[] = 'codec_g722.so';
        $modules[] = 'codec_g726.so';
        $modules[] = 'codec_gsm.so';
        $modules[] = 'codec_ulaw.so';
        $modules[] = 'codec_adpcm.so';
        $modules[] = 'codec_speex.so';

        $modules[] = 'codec_opus.so';
        $modules[] = 'codec_resample.so';
        // $modules[]='codec_g729a.so';
        // $modules[]='codec_siren14.so';
        // $modules[]='codec_siren7.so';
        $modules[] = 'codec_a_mu.so';
        $modules[] = 'codec_ilbc.so';
        $modules[] = 'codec_lpc10.so';
        $modules[] = 'codec_silk.so';

        $modules[] = 'format_ogg_speex.so';
        $modules[] = 'format_gsm.so';
        $modules[] = 'format_pcm.so';
        $modules[] = 'format_wav.so';
        $modules[] = 'format_wav_gsm.so';
        $modules[] = 'format_ogg_vorbis.so';
        $modules[] = 'format_mp3.so';

        $modules[] = 'format_g726.so';
        $modules[] = 'format_h263.so';
        $modules[] = 'format_h264.so';
        $modules[] = 'format_g723.so';
        $modules[] = 'format_g719.so';

        $modules[] = 'func_callerid.so';
        $modules[] = 'func_speex.so';
        $modules[] = 'func_channel.so';
        $modules[] = 'func_config.so';
        $modules[] = 'func_cut.so';
        $modules[] = 'func_cdr.so';
        $modules[] = 'func_devstate.so';
        $modules[] = 'func_db.so';
        $modules[] = 'func_logic.so';
        $modules[] = 'func_strings.so';
        $modules[] = 'func_periodic_hook.so';
        $modules[] = 'pbx_config.so';
        $modules[] = 'pbx_loopback.so';
        $modules[] = 'pbx_spool.so';
        $modules[] = 'res_agi.so';
        $modules[] = 'res_limit.so';
        $modules[] = 'res_musiconhold.so';
        $modules[] = 'res_rtp_asterisk.so';
        $modules[] = 'res_srtp.so';
        $modules[] = 'res_convert.so';
        $modules[] = 'res_timing_dahdi.so';
        $modules[] = 'res_mutestream.so';
        // $modules[]='cdr_sqlite3_custom.so';
        // $modules[]='cdr_manager.so';
        // $modules[]='cel_sqlite3_custom.so';
        $modules[] = 'func_timeout.so';
        $modules[] = 'res_parking.so';
        // $modules[]='app_authenticate.so';
        // $modules[]='app_page.so';
        $modules[] = 'app_queue.so';
        $modules[] = 'app_senddtmf.so';
        $modules[] = 'app_userevent.so';
        $modules[] = 'app_chanspy.so';
        // Необходимое для работы переадресаций.
        $modules[] = 'bridge_simple.so';
        // Прочие bridge модули. Один из них необходим для работы парковки.
        $modules[] = 'bridge_holding.so';
        $modules[] = 'bridge_builtin_features.so';
        $modules[] = 'bridge_builtin_interval_features.so';
        // $modules[]='bridge_native_rtp.so';
        // $modules[]='bridge_softmix.so';
        // $modules[]='chan_bridge_media.so';
        $modules[] = 'app_mp3.so';
        $modules[] = 'pbx_lua.so';
        $modules[] = 'app_stack.so';
        $modules[] = 'func_dialplan.so';

        if (file_exists('/offload/asterisk/modules/res_pjproject.so')) {
            $modules[] = 'res_crypto.so';
            $modules[] = 'res_pjproject.so';
            $modules[] = 'res_speech.so';
            $modules[] = 'res_sorcery_astdb.so';
            $modules[] = 'res_sorcery_config.so';
            $modules[] = 'res_sorcery_memory.so';

            $modules[] = 'chan_pjsip.so';
            $modules[] = 'func_pjsip_endpoint.so';
            $modules[] = 'res_http_websocket.so';
            $modules[] = 'res_musiconhold.so';
            $modules[] = 'res_pjproject.so';
            $modules[] = 'res_pjsip_acl.so';
            $modules[] = 'res_pjsip_authenticator_digest.so';
            $modules[] = 'res_pjsip_caller_id.so';
            $modules[] = 'res_pjsip_dialog_info_body_generator.so';
            $modules[] = 'res_pjsip_diversion.so';
            $modules[] = 'res_pjsip_dtmf_info.so';
            $modules[] = 'res_pjsip_endpoint_identifier_anonymous.so';
            $modules[] = 'res_pjsip_endpoint_identifier_ip.so';
            $modules[] = 'res_pjsip_endpoint_identifier_user.so';
            $modules[] = 'res_pjsip_exten_state.so';
            $modules[] = 'res_pjsip_header_funcs.so';
            $modules[] = 'res_pjsip_logger.so';
            $modules[] = 'res_pjsip_messaging.so';
            $modules[] = 'res_pjsip_mwi_body_generator.so';
            $modules[] = 'res_pjsip_mwi.so';
            $modules[] = 'res_pjsip_nat.so';
            $modules[] = 'res_pjsip_notify.so';
            $modules[] = 'res_pjsip_one_touch_record_info.so';
            $modules[] = 'res_pjsip_outbound_authenticator_digest.so';
            $modules[] = 'res_pjsip_outbound_publish.so';
            $modules[] = 'res_pjsip_outbound_registration.so';
            $modules[] = 'res_pjsip_path.so';
            $modules[] = 'res_pjsip_pidf_body_generator.so';
            $modules[] = 'res_pjsip_pidf_digium_body_supplement.so';
            $modules[] = 'res_pjsip_pidf_eyebeam_body_supplement.so';
            $modules[] = 'res_pjsip_publish_asterisk.so';
            $modules[] = 'res_pjsip_pubsub.so';
            $modules[] = 'res_pjsip_refer.so';
            $modules[] = 'res_pjsip_registrar.so';
            $modules[] = 'res_pjsip_rfc3326.so';
            $modules[] = 'res_pjsip_sdp_rtp.so';
            $modules[] = 'res_pjsip_send_to_voicemail.so';
            $modules[] = 'res_pjsip_session.so';
            $modules[] = 'res_pjsip.so';
            $modules[] = 'res_pjsip_t38.so';
            $modules[] = 'res_pjsip_transport_websocket.so';
            $modules[] = 'res_pjsip_xpidf_body_generator.so';
            $modules[] = 'res_pjsip_dlg_options.so';
            $modules[] = 'res_security_log.so';

            file_put_contents('/etc/asterisk/pjproject.conf', '');
            file_put_contents('/etc/asterisk/sorcery.conf', '');
            file_put_contents('/etc/asterisk/pjsip.conf', '');
            file_put_contents('/etc/asterisk/pjsip_notify.conf', '');
        } else {
            $modules[] = 'chan_sip.so';
            $modules[] = 'app_macro.so';
        }

        foreach ($modules as $key => $value) {
            $conf .= "load => $value\n";
        }

        Util::fileWriteContent('/etc/asterisk/modules.conf', $conf);
        Util::fileWriteContent('/etc/asterisk/codecs.conf', '');
    }

    /**
     * Создание конфига manager.conf
     */
    private function managerConfGenerate(): void
    {
        $vars = [
            'DIALEDPEERNUMBER',
            'BLKVM_CHANNEL',
            'BRIDGEPEER',
            'INTERCHANNEL',
            'FROM_DID',
            'mikoidconf',
            'conf_1c',
            '1cautoanswer',
            'extenfrom1c',
            'spyee',
            'datafrom1c',
            'CDR(lastapp)',
            'CDR(channel)',
            'CDR(src)',
            'CDR(dst)',
            'CDR(recordingfile)',
        ];

        $conf = "[general]\n" .
            "enabled = yes\n" .
            "port = {$this->arr_gs['AMIPort']};\n" .
            "bindaddr = 0.0.0.0\n" .
            "displayconnects = no\n" .
            "allowmultiplelogin = yes\n" .
            "webenabled = yes\n" .
            "timestampevents = yes\n" .
            'channelvars=' . implode(',', $vars) . "\n" .
            "httptimeout = 60\n\n";

        if ($this->arr_gs['AMIEnabled'] === '1') {
            /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $managers */
            /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $user */
            $managers = AsteriskManagerUsers::find();
            $result   = [];
            foreach ($managers as $user) {
                $arr_data = $user->toArray();
                /** @var NetworkFilters $network_filter */
                $network_filter     = NetworkFilters::findFirst($user->networkfilterid);
                $arr_data['permit'] = empty($network_filter) ? '' : $network_filter->permit;
                $arr_data['deny']   = empty($network_filter) ? '' : $network_filter->deny;
                $result[]           = $arr_data;
            }

            foreach ($result as $user) {
                $conf .= '[' . $user['username'] . "]\n";
                $conf .= 'secret=' . $user['secret'] . "\n";

                if (trim($user['deny']) !== '') {
                    $conf .= 'deny=' . $user['deny'] . "\n";
                }
                if (trim($user['permit']) !== '') {
                    $conf .= 'permit=' . $user['permit'] . "\n";
                }

                $keys  = [
                    'call',
                    'cdr',
                    'originate',
                    'reporting',
                    'agent',
                    'config',
                    'dialplan',
                    'dtmf',
                    'log',
                    'system',
                    'verbose',
                    'user',
                ];
                $read  = '';
                $write = '';
                foreach ($keys as $perm) {
                    if ($user[$perm] === 'readwrite') {
                        $read  .= ('' === $read) ? $perm : ",$perm";
                        $write .= ('' === $write) ? $perm : ",$perm";
                    } elseif ($user[$perm] === 'write') {
                        $write .= ('' === $write) ? $perm : ",$perm";
                    } elseif ($user[$perm] === 'read') {
                        $read .= ('' === $read) ? $perm : ",$perm";
                    }
                }
                if ($read !== '') {
                    $conf .= "read=$read\n";
                }

                if ($write !== '') {
                    $conf .= "write=$write\n";
                }
                $conf .= "eventfilter=!UserEvent: CdrConnector\n";
                $conf .= "eventfilter=!Event: Newexten\n";
                $conf .= "\n";
            }
            $conf .= "\n";
        }
        $conf .= '[phpagi]' . "\n";
        $conf .= 'secret=phpagi' . "\n";
        $conf .= 'deny=0.0.0.0/0.0.0.0' . "\n";
        $conf .= 'permit=127.0.0.1/255.255.255.255' . "\n";
        $conf .= 'read=all' . "\n";
        $conf .= 'write=all' . "\n";
        $conf .= "eventfilter=!Event: Newexten\n";
        $conf .= "\n";

        foreach ($this->arrObject as $appClass) {
            $conf .= $appClass->generateManager($this->arr_gs);
        }

        Util::fileWriteContent('/etc/asterisk/manager.conf', $conf);
    }

    /**
     * Генерация http.cong AJAM.
     */
    private function httpConfGenerate(): void
    {
        $enabled = ($this->arr_gs['AJAMEnabled'] === '1') ? 'yes' : 'no';
        $conf    = "[general]\n" .
            "enabled={$enabled}\n" .
            "bindaddr=0.0.0.0\n" .
            "bindport={$this->arr_gs['AJAMPort']}\n" .
            "prefix=asterisk\n" .
            "enablestatic=yes\n\n";

        if ( ! empty($this->arr_gs['AJAMPortTLS'])) {
            $keys_dir = '/etc/asterisk/keys';
            if ( ! is_dir($keys_dir) && ! mkdir($keys_dir) && ! is_dir($keys_dir)) {
                Util::sysLogMsg('httpConfGenerate', sprintf('Directory "%s" was not created', $keys_dir));

                return;
            }
            $WEBHTTPSPublicKey  = $this->arr_gs['WEBHTTPSPublicKey'];
            $WEBHTTPSPrivateKey = $this->arr_gs['WEBHTTPSPrivateKey'];

            if ( ! empty($WEBHTTPSPublicKey) && ! empty($WEBHTTPSPrivateKey)) {
                $s_data = "{$WEBHTTPSPublicKey}\n{$WEBHTTPSPrivateKey}";
            } else {
                // Генерируем сертификат ssl.
                $data   = Util::generateSslCert();
                $s_data = implode("\n", $data);
            }
            $conf .= "tlsenable=yes\n" .
                "tlsbindaddr=0.0.0.0:{$this->arr_gs['AJAMPortTLS']}\n" .
                "tlscertfile={$keys_dir}/ajam.pem\n" .
                "tlsprivatekey={$keys_dir}/ajam.pem\n";
            Util::fileWriteContent("{$keys_dir}/ajam.pem", $s_data);
        }
        Util::fileWriteContent('/etc/asterisk/http.conf', $conf);
    }

    /**
     * Создание конфига features.conf
     */
    private function featuresGenerate(): void
    {
        $pickup_extension = $this->mikoPBXConfig->getPickupExten();
        $conf             = "[general]\n" .
            "featuredigittimeout = {$this->arr_gs['PBXFeatureDigitTimeout']}\n" .
            "atxfernoanswertimeout = {$this->arr_gs['PBXFeatureAtxferNoAnswerTimeout']}\n" .
            "transferdigittimeout = 3\n" .
            "pickupexten = {$pickup_extension}\n" .
            "atxferabort = *0\n" .
            "\n" .
            "[featuremap]\n" .
            "atxfer => {$this->arr_gs['PBXFeatureAttendedTransfer']}\n" .
            "disconnect = *0\n" .
            "blindxfer => {$this->arr_gs['PBXFeatureBlindTransfer']}\n";

        foreach ($this->arrObject as $appClass) {
            $conf .= $appClass->getfeaturemap();
        }

        Util::fileWriteContent('/etc/asterisk/features.conf', $conf);
    }

    /**
     * Создание конфига indication.conf
     *
     * @param string $country
     */
    private function indicationConfGenerate($country = 'ru'): void
    {
        $data = file_get_contents(
            '/usr/www/src/Core/Asterisk/Configs/Samples/indications.conf.sample'
        ); // TODO::ReplaceWith path
        $conf = str_replace('{country}', $country, $data);
        Util::fileWriteContent('/etc/asterisk/indications.conf', $conf);
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

    /**
     * Запуск процесса Asterisk.
     *
     */
    public function start(): void
    {
        Network::startSipDump();
//        if(Util::is_debian()){
//            Util::mwExecBg('systemctl restart asterisk');
//        }else{
        Util::mwExecBg('/usr/sbin/safe_asterisk -fn');
//        }
    }
}
