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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 *  Class GetRecord
 *  Delete an internal number and all its dependencies including mobile and forwarding settings.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class GetRecordAction extends \Phalcon\Di\Injectable
{

    /**
     * Gets extension data for existing or for the new record
     *
     * @param string $id ID of the extension to be received.
     * @return PBXApiResult Result of the delete operation.
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.id = :ext_id: AND Extensions.type="' . Extensions::TYPE_SIP.'"',
            'bind' => [
                'ext_id' => $id
            ],
            'columns' => [
                'id' => 'Extensions.id',
                'number' => 'Extensions.number',
                'user_id' => 'Users.id',
                'user_username' => 'Users.username',
                'user_email' => 'Users.email',
                'user_avatar'=>  'Users.avatar',
                'fwd_ringlength'=>'ExtensionForwardingRights.ringlength',
                'fwd_forwardingonbusy'=>'ExtensionForwardingRights.forwardingonbusy',
                'fwd_forwardingonunavailable'=>'ExtensionForwardingRights.forwardingonunavailable',
                'fwd_forwarding'=>'ExtensionForwardingRights.forwarding',
                'mobile_number'=>'ExternalPhones.extension',
                'mobile_uniqid'=>'ExternalPhones.uniqid',
                'mobile_dialstring'=>'ExternalPhones.dialstring',
                'sip_enableRecording' =>'Sip.enableRecording',
                'sip_dtmfmode' =>'Sip.dtmfmode',
                'sip_manualattributes' => 'Sip.manualattributes',
                'sip_uniqid' => 'Sip.uniqid',
                'sip_secret' => 'Sip.secret',
                'sip_networkfilterid'=>'Sip.networkfilterid',
                'sip_transport' => 'Sip.transport'
            ],
            'joins' => [
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid' ,
                    2 => 'Users',
                    3 => 'INNER',
                ],
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension = Extensions.number',
                    2 => 'Sip',
                    3 => 'LEFT',
                ],
                'ExtensionsExternal' => [
                    0 => Extensions::class,
                    1 => 'ExtensionsExternal.userid = Users.id AND ExtensionsExternal.type="' . Extensions::TYPE_EXTERNAL.'"',
                    2 => 'ExtensionsExternal',
                    3 => 'LEFT',
                ],
                'ExternalPhones' => [
                    0 => ExternalPhones::class,
                    1 => 'ExternalPhones.extension = ExtensionsExternal.number',
                    2 => 'ExternalPhones',
                    3 => 'LEFT',
                ],
                'ExtensionForwardingRights' => [
                    0 => ExtensionForwardingRights::class,
                    1 => 'ExtensionForwardingRights.extension = Extensions.number',
                    2 => 'ExtensionForwardingRights',
                    3 => 'LEFT',
                ],

            ],
        ];
        $extension = Di::getDefault()->get('modelsManager')->createBuilder($parameters)
            ->getQuery()
            ->getSingleResult();

        if (!$extension) {
            $dataFromRequest = [];
        } else {
            $dataFromRequest = $extension->toArray();
            $dataFromRequest['sip_manualattributes']=base64_decode($dataFromRequest['sip_manualattributes']);
        }

        $dataStructure = new DataStructure($dataFromRequest);
        $res->data = $dataStructure->toArray();
        return  $res;
    }
}