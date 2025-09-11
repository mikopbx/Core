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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\AvatarHelper;

/**
 * Data structure for employees following Extensions DataStructure pattern from 1 month ago
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from Users model.
     * 
     * @param \MikoPBX\Common\Models\Users $model
     * @return array
     */
    public static function createFromModel(Users $user): array
    {

        $data = self::createForNewEmployee();

        $data['id'] = $user->id;
        $data['user_username'] = $user->username ?? '';
        $data['user_email'] = $user->email ?? '';
        $data['user_avatar'] = AvatarHelper::getAvatarUrl($user->avatar ?? '');

        $sipExtension = Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_SIP,
                'userid' => $user->id
            ]
        ]);

        if ($sipExtension) {
            $data['number'] = $sipExtension->number;
            
            $sipRecord = $sipExtension?->Sip??null;
            if ($sipRecord!==null) {
                $data['sip_secret'] = $sipRecord->secret;
                $data['sip_dtmfmode'] = $sipRecord->dtmfmode;
                $data['sip_transport'] = $sipRecord->transport;
                $data['sip_manualattributes'] = $sipRecord->manualattributes;
                $data['sip_enableRecording'] = $sipRecord->enableRecording === '1';
                
                // Add network filter field with representation
                $data = parent::addNetworkFilterField($data, 'sip_networkfilterid', $sipRecord->networkfilterid ?? 'none');
            }
        
            $extensionForwardingRights = $sipExtension?->ExtensionForwardingRights??null;
            if ($extensionForwardingRights) {
                $data['fwd_ringlength'] = (int)$extensionForwardingRights->ringlength;
            
                // Add forwarding fields with their represent counterparts
                $data = parent::addExtensionField($data, 'fwd_forwarding', $extensionForwardingRights->forwarding);
                $data = parent::addExtensionField($data, 'fwd_forwardingonbusy', $extensionForwardingRights->forwardingonbusy);
                $data = parent::addExtensionField($data, 'fwd_forwardingonunavailable', $extensionForwardingRights->forwardingonunavailable);
            }
        }

        $mobileExtension =  Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_EXTERNAL,
                'userid' => $user->id
            ]
        ]);
    
        if ($mobileExtension) {
            $data['mobile_number'] = $mobileExtension->number;
            $externalPhone = $mobileExtension?->ExternalPhones??null;
            if ($externalPhone!==null) {
                $data['mobile_dialstring'] = $externalPhone->dialstring;
            }
        }
    
        return $data;
    }

    /**
     * Create structure for new employee
     *
     * @return array Default employee data structure
     */
    public static function createForNewEmployee(): array
    {
        $defaultAvatar = '/admin-cabinet/assets/img/unknownPerson.jpg';
        
        $data = [
            'id' => '',  // Empty for new employee
            'user_username' => '',
            'user_email' => '',
            'user_avatar' => $defaultAvatar,
            'number' => Extensions::getNextInternalNumber(),
            'sip_secret' => Sip::generateSipPassword(),
            'sip_enableRecording' => true,
            'sip_dtmfmode' => 'auto',
            'sip_transport' => Sip::TRANSPORT_AUTO,
            'sip_manualattributes' => '',
            'fwd_ringlength' => 45,
            'mobile_number' => '',
            'mobile_dialstring' => '',
        ];
        $data = parent::addNetworkFilterField($data, 'sip_networkfilterid', 'none');
        $data = parent::addExtensionField($data, 'fwd_forwarding', '');
        $data = parent::addExtensionField($data, 'fwd_forwardingonbusy', '');
        $data = parent::addExtensionField($data, 'fwd_forwardingonunavailable', '');

        return $data;
    }
}