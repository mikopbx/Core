<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Config as ConfigAlias;
use Phalcon\Di\Injectable;

/**
 * Upgrade from 6.2.110 to 6.4
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer64 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '6.4.1';

    private ConfigAlias $config;
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * Class constructor.
     */
    public function __construct()
    {
        $this->config = $this->getDI()->getShared('config');
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Main function
     */
    public function processUpdate():void
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
                $extension = Extensions::findFirst("number = '{$app_number}'");
                if ($extension === null) {
                    $extension                    = new Extensions();
                    $extension->number            = $app_number;
                    $extension->type              = Extensions::TYPE_DIALPLAN_APPLICATION;
                    $extension->callerid          = $d_app->name;
                    $extension->show_in_phonebook = '1';
                    $extension->save();
                }
            }
        } else {
            $d_app->applicationlogic = $app_logic;
            $d_app->type             = 'plaintext';
            $d_app->save();
        }
    }
}