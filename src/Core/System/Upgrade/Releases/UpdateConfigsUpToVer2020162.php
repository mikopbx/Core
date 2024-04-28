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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Core\System\Util;
use Phalcon\Config as ConfigAlias;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer2020162 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2020.1.62';

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

    public function processUpdate():void
    {
        $sqlite3Path = Util::which('sqlite3');

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
            Processes::mwExec("{$sqlite3Path}  {$astdb_file} 'DELETE FROM astdb WHERE key LIKE \"/UserBuddyStatus/SIP%\"'");
        }

        PBX::checkCodec('ilbc', 'iLBC', 'audio');
        PBX::checkCodec('opus', 'Opus Codec', 'audio');

        $PrivateKey = $this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY);
        $PublicKey  = $this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY);
        if (empty($PrivateKey) || empty($PublicKey)) {
            $certs = Util::generateSslCert();
            $this->mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY, $certs['PrivateKey']);
            $this->mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY, $certs['PublicKey']);
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
        }
    }
}