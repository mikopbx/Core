<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2020
 */

namespace MikoPBX\Core\System\Upgrade;


use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions as ExtensionsModel;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Util;
use Phalcon\Di;

class UpdateSystemConfig
{
    /**
     * @var \Phalcon\Di\DiInterface|null
     */
    private $di;

    /**
     * @var \Phalcon\Config
     */
    private $config;

    /**
     * @var MikoPBXConfig
     */
    private $mikoPBXConfig;

    /**
     * System constructor.
     */
    public function __construct()
    {
        $this->di     = Di::getDefault();
        $this->config = $this->di->getShared('config');
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Update settings after every new release
     */
    public function updateConfigs(): bool
    {
        $previous_version = str_ireplace('-dev', '', $this->mikoPBXConfig->getGeneralSettings('PBXVersion'));
        $current_version  = str_ireplace('-dev', '', trim(file_get_contents('/etc/version')));
        if ($previous_version !== $current_version) {
            if (version_compare($previous_version, '1.0.0', '<=')) {
                $this->fillInitialSettings();
                $previous_version = '1.0.1';
                Util::echoWithSyslog(' - UpdateConfigs: Upgrade applications up tp '.$previous_version.' ');
                Util::echoGreenDone();

            }

            if (version_compare($previous_version, '6.2.110', '<')) {
                $this->updateConfigsUpToVer62110();
                $previous_version = '6.2.110';
                Util::echoWithSyslog(' - UpdateConfigs: Upgrade applications up tp '.$previous_version.' ');
                Util::echoGreenDone();
            }

            if (version_compare($previous_version, '6.4', '<')) {
                $this->updateConfigsUpToVer64();
                $previous_version = '6.4';
                Util::echoWithSyslog(' - UpdateConfigs: Upgrade applications up tp '.$previous_version.' ');
                Util::echoGreenDone();
            }

            if (version_compare($previous_version, '2020.1.62', '<')) {
                $this->updateConfigsUpToVer2020162();
                $previous_version = '2020.1.62';
                Util::echoWithSyslog(' - UpdateConfigs: Upgrade applications up tp '.$previous_version.' ');
                Util::echoGreenDone();
            }

            if (version_compare($previous_version, '2020.2.314', '<')) {
                $this->updateConfigsUpToVer20202314();
                $previous_version = '2020.2.314';
                Util::echoWithSyslog(' - UpdateConfigs: Upgrade applications up tp '.$previous_version.' ');
                Util::echoGreenDone();
            }

            //...add here new updates //

            $this->mikoPBXConfig->setGeneralSettings('PBXVersion', trim(file_get_contents('/etc/version')));
        }

        return true;
    }

    /**
     * First bootup
     */
    private function fillInitialSettings(): void
    {
        // Обновление конфигов. Это первый запуск системы.
        /** @var \MikoPBX\Common\Models\Sip $peers */
        /** @var \MikoPBX\Common\Models\Sip $peer */
        $peers = Sip::find('type="peer"');
        foreach ($peers as $peer) {
            $peer->secret = md5('' . time() . 'sip' . $peer->id);
            $peer->save();
        }

        /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $managers */
        /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $manager */
        $managers = AsteriskManagerUsers::find();
        foreach ($managers as $manager) {
            $manager->secret = md5('' . time() . 'manager' . $manager->id);
            $manager->save();
        }
    }


    /**
     * Upgrade from * to 6.2.110
     */
    private function updateConfigsUpToVer62110(): void
    {
        /** @var \MikoPBX\Common\Models\Codecs $codec_g722 */
        $codec_g722 = Codecs::findFirst('name="g722"');
        if ($codec_g722 === null) {
            $codec_g722              = new Codecs();
            $codec_g722->name        = 'g722';
            $codec_g722->type        = 'audio';
            $codec_g722->description = 'G.722';
            $codec_g722->save();
        }

        /** @var \MikoPBX\Common\Models\IvrMenu $ivrs */
        /** @var \MikoPBX\Common\Models\IvrMenu $ivr */
        $ivrs = IvrMenu::find();
        foreach ($ivrs as $ivr) {
            if (empty($ivr->number_of_repeat)) {
                $ivr->number_of_repeat = 5;
                $ivr->save();
            }
            if (empty($ivr->timeout)) {
                $ivr->timeout = 7;
                $ivr->save();
            }
        }

        // Чистим мусор.
        /** @var \MikoPBX\Common\Models\PbxExtensionModules $modules */
        $modules = PbxExtensionModules::find();
        foreach ($modules as $module) {
            if ($module->version === '1.0' && empty($module->support_email) && 'МИКО' === $module->developer) {
                $modules->delete();
            }
        }
    }

    /**
     * Upgrade from 6.2.110 to 6.4
     */
    private function updateConfigsUpToVer64(): void
    {
        /** @var \MikoPBX\Common\Models\DialplanApplications $res */
        $app_number = '10000100';
        $app_logic  = base64_encode('1,Goto(voice_mail_peer,voicemail,1)');
        $d_app      = DialplanApplications::findFirst('extension="' . $app_number . '"');
        if ($d_app === null) {
            $d_app                   = new DialplanApplications();
            $d_app->applicationlogic = $app_logic;
            $d_app->extension        = $app_number;
            $d_app->description      = 'Voice Mail';
            $d_app->name             = 'VOICEMAIL';
            $d_app->type             = 'plaintext';
            $d_app->uniqid           = 'DIALPLAN-APPLICATION-' . md5(time());

            if ($d_app->save()) {
                $extension = ExtensionsModel::findFirst("number = '{$app_number}'");
                if ($extension === null) {
                    $extension                    = new ExtensionsModel();
                    $extension->number            = $app_number;
                    $extension->type              = 'DIALPLAN APPLICATION';
                    $extension->callerid          = $d_app->name;
                    $extension->show_in_phonebook = true;
                    $extension->save();
                }
            }
        } else {
            $d_app->applicationlogic = $app_logic;
            $d_app->type             = 'plaintext';
            $d_app->save();
        }
    }

    private function updateConfigsUpToVer2020162(): void
    {
        /** @var \MikoPBX\Common\Models\FirewallRules $rule */
        $result = FirewallRules::find();
        foreach ($result as $rule) {
            /** @var \MikoPBX\Common\Models\NetworkFilters $network_filter */
            $network_filter = NetworkFilters::findFirst($rule->networkfilterid);
            if ($network_filter === null) {
                // Это "битая" роль, необходимо ее удалить. Нет ссылки на подсеть.
                $rule->delete();
            }
        }

        // Корректировка AstDB
        $astdb_file = $this->config->path('astDatabase.dbfile');
        if (file_exists($astdb_file)) {
            // С переходом на PJSIP удалим статусы SIP.
            Util::mwExec("sqlite3  {$astdb_file} 'DELETE FROM astdb WHERE key LIKE \"/UserBuddyStatus/SIP%\"'");
        }

        PBX::checkCodec('ilbc', 'iLBC', 'audio');
        PBX::checkCodec('opus', 'Opus Codec', 'audio');

        $PrivateKey = $this->mikoPBXConfig->getGeneralSettings('WEBHTTPSPrivateKey');
        $PublicKey  = $this->mikoPBXConfig->getGeneralSettings('WEBHTTPSPublicKey');
        if (empty($PrivateKey) || empty($PublicKey)) {
            $certs = Util::generateSslCert();
            $this->mikoPBXConfig->setGeneralSettings('WEBHTTPSPrivateKey', $certs['PrivateKey']);
            $this->mikoPBXConfig->setGeneralSettings('WEBHTTPSPublicKey', $certs['PublicKey']);
        }


        $app_number = '10003246';
        $d_app      = DialplanApplications::findFirst('extension="' . $app_number . '"');
        if ($d_app === null) {
            $app_text                = '1,Answer()' . "\n" .
                'n,AGI(cdr_connector.php,${ISTRANSFER}dial_answer)' . "\n" .
                'n,Echo()' . "\n" .
                'n,Hangup()' . "\n";
            $d_app                   = new DialplanApplications();
            $d_app->applicationlogic = base64_encode($app_text);
            $d_app->extension        = $app_number;
            $d_app->description      = 'Echos audio and video back to the caller as soon as it is received. Used to test connection delay.';
            $d_app->name             = 'Echo test';
            $d_app->type             = 'plaintext';
            $d_app->uniqid           = 'DIALPLAN-APPLICATION-' . md5(time());

            if ($d_app->save()) {
                $extension = ExtensionsModel::findFirst("number = '{$app_number}'");
                if ($extension === null) {
                    $extension                    = new ExtensionsModel();
                    $extension->number            = $app_number;
                    $extension->type              = 'DIALPLAN APPLICATION';
                    $extension->callerid          = $d_app->name;
                    $extension->show_in_phonebook = true;
                    $extension->save();
                }
            }
        }
    }

    /**
     * Update to 2020.2.314
     */
    private function updateConfigsUpToVer20202314(): void
    {
        // Add custom category to all sound files
        $soundFiles = SoundFiles::find();
        foreach ($soundFiles as $sound_file) {
            $sound_file->category = SoundFiles::CATEGORY_CUSTOM;
            $sound_file->update();
        }

        // Add moh files to db and copy them to storage
        $oldMohDir     = $this->config->path('asterisk.astvarlibdir') . '/sounds/moh';
        $currentMohDir = $this->config->path('asterisk.mohdir');
        if ( ! Util::mwMkdir($currentMohDir)) {
            return;
        }
        if(!file_exists($oldMohDir)){
            if(!file_exists('/offload/livecd')){
                Util::sysLogMsg("UpdateConfigsUpToVer20202314", 'Directory sounds/moh not found', LOG_ERR);
            }
            return;
        }
        $files = scandir($oldMohDir);
        foreach ($files as $file) {
            if (in_array($file, ['.', '..'])) {
                continue;
            }
            if (copy($oldMohDir . '/' . $file, $currentMohDir . '/' . $file)) {
                $sound_file           = new SoundFiles();
                $sound_file->path     = $currentMohDir . '/' . $file;
                $sound_file->category = SoundFiles::CATEGORY_MOH;
                $sound_file->name     = $file;
                $sound_file->save();
            }
        }

        // Remove old cache folders
        $mediaMountPoint = $this->config->path('core.mediaMountPoint');
        $oldCacheDirs    = [
            "$mediaMountPoint/mikopbx/cache_js_dir",
            "$mediaMountPoint/mikopbx/cache_img_dir",
            "$mediaMountPoint/mikopbx/cache_css_dir",
        ];
        foreach ($oldCacheDirs as $old_cache_dir) {
            if (is_dir($old_cache_dir)) {
                Util::mwExec("rm -rf $old_cache_dir");
            }
        }
    }

}