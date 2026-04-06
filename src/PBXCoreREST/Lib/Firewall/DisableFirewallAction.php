<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Firewall;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class DisableAction
 * 
 * Disables the firewall and fail2ban services.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class DisableFirewallAction
{
    /**
     * Disable firewall and fail2ban
     *
     * @return PBXApiResult The result of the disable operation
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Disable Fail2Ban
            $fail2BanEnabled = PbxSettings::findFirstByKey(PbxSettings::PBX_FAIL2BAN_ENABLED);
            if (!$fail2BanEnabled) {
                $fail2BanEnabled = new PbxSettings();
                $fail2BanEnabled->key = PbxSettings::PBX_FAIL2BAN_ENABLED;
            }
            $fail2BanEnabled->value = '0';
            
            if (!$fail2BanEnabled->save()) {
                $errors = $fail2BanEnabled->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = "Failed to disable Fail2Ban: " . $error->getMessage();
                }
                $res->success = false;
                return $res;
            }
            
            // Disable Firewall
            $firewallEnabled = PbxSettings::findFirstByKey(PbxSettings::PBX_FIREWALL_ENABLED);
            if (!$firewallEnabled) {
                $firewallEnabled = new PbxSettings();
                $firewallEnabled->key = PbxSettings::PBX_FIREWALL_ENABLED;
            }
            $firewallEnabled->value = '0';
            
            if (!$firewallEnabled->save()) {
                $errors = $firewallEnabled->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = "Failed to disable Firewall: " . $error->getMessage();
                }
                $res->success = false;
                return $res;
            }
            
            // Firewall will be reloaded automatically by PbxSettings model events
            
            $res->data = [
                'firewallEnabled' => '0',
                'fail2banEnabled' => '0'
            ];
            $res->messages['info'][] = 'Firewall and Fail2Ban have been disabled';
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
}