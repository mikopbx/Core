<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\CloudProvisioning;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Configs\SSHConf;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

abstract class CloudProvider
{
    protected const HTTP_TIMEOUT = 3;

    abstract public function provision(): bool;

    /**
     * Updates the SSH keys.
     *
     * @param string $data The SSH keys data.
     */
    protected function updateSSHKeys(string $data): void
    {
        if (empty($data)) {
            return;
        }
        $arrData = explode(':', $data);
        if (count($arrData) === 2) {
            $data = $arrData[1];
        }
        $this->updatePbxSettings(PbxSettingsConstants::SSH_AUTHORIZED_KEYS, $data);
    }

    /**
     * Updates the PBX settings with the provided key and data.
     *
     * @param string $keyName The key name.
     * @param mixed $data The data to be stored.
     */
    public function updatePbxSettings(string $keyName, $data): void
    {
        $setting = PbxSettings::findFirst('key="' . $keyName . '"');
        if (!$setting) {
            $setting = new PbxSettings();
            $setting->key = $keyName;
        }
        $setting->value = $data;
        $result = $setting->save();
        $message = "      |- Update PbxSettings - $keyName ... ";
        SystemMessages::echoToTeletype($message);
        if ($result) {
            SystemMessages::teletypeEchoResult($message);
        } else {
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
        }
        unset($setting);
    }

    /**
     * Updates the LAN settings.
     *
     * @param string $extipaddr The external IP address.
     */
    protected function updateLanSettings(string $extipaddr): void
    {
        /** @var LanInterfaces $lanData */
        $lanData = LanInterfaces::findFirst();
        if ($lanData !== null) {

            if (empty($extipaddr)) {
                PbxSettings::setValue(PbxSettingsConstants::AUTO_UPDATE_EXTERNAL_IP, '1');
            } elseif ($lanData->ipaddr === $extipaddr) {
                $lanData->topology = LanInterfaces::TOPOLOGY_PUBLIC;
            } else {
                $lanData->extipaddr = $extipaddr;
                $lanData->topology = LanInterfaces::TOPOLOGY_PRIVATE;
                PbxSettings::setValue(PbxSettingsConstants::AUTO_UPDATE_EXTERNAL_IP, '1');
            }
            $message = "      |- Update LAN settings external IP: $extipaddr";
            SystemMessages::echoToTeletype($message);
            $result = $lanData->save();
            if ($result) {
                SystemMessages::teletypeEchoResult($message);
            } else {
                SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
            }
        } else {
            $message = "      |- LAN interface not found";
            SystemMessages::echoToTeletype($message);
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
        }
    }

    /**
     * Updates host name
     *
     * @param string $hostname The hostname.
     */
    protected function updateHostName(string $hostname): void
    {
        $this->updatePbxSettings(PbxSettingsConstants::PBX_NAME, $hostname);
        $lanData = LanInterfaces::findFirst();
        if ($lanData !== null) {
            $lanData->hostname = $hostname;
            $lanData->save();
        }
    }

    /**
     * Updates the SSH password.
     */
    protected function updateSSHCredentials(string $sshLogin, string $hashSalt): void
    {
        $data = md5(shell_exec(Util::which('ifconfig')) . $hashSalt . time());
        $this->updatePbxSettings(PbxSettingsConstants::SSH_LOGIN, $sshLogin);
        $this->updatePbxSettings(PbxSettingsConstants::SSH_PASSWORD, $data);
        $this->updatePbxSettings(PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD, '1');
    }

    /**
     * Updates the web password based on the instance name and ID.
     *
     * @param string $webPassword The web password.
     */
    protected function updateWebPassword(string $webPassword): void
    {
        if (empty($webPassword)) {
            return;
        }
        $this->updatePbxSettings(PbxSettingsConstants::WEB_ADMIN_PASSWORD, $webPassword);
        $this->updatePbxSettings(PbxSettingsConstants::CLOUD_INSTANCE_ID, $webPassword);
        $this->updatePbxSettings(PbxSettingsConstants::PBX_DESCRIPTION, PbxSettingsConstants::DEFAULT_CLOUD_PASSWORD_DESCRIPTION);
    }

}
