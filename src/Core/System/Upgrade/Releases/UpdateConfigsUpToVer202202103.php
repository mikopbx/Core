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

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer202202103 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2022.2.103';

	/**
     * Class constructor.
     */
    public function __construct()
    {
    }

    /**
     * https://github.com/mikopbx/Core/issues/269
     */
    public function processUpdate():void
    {
        $this->updateFirewallRules();
        $this->updateCodecs();
        $this->updateExtensions();
    }

    /**
     * Обновление TLS порта для сетевого экрана.
     * @return void
     */
    private function updateFirewallRules():void{
        $colName = PbxSettingsConstants::TLS_PORT;
        $portTls = PbxSettings::getValueByKey(PbxSettingsConstants::TLS_PORT);

        /** @var NetworkFilters $net */
        $nets = NetworkFilters::find(['columns' => 'id']);
        foreach ($nets as $net){
            $ruleTls = FirewallRules::findFirst([
                                                    "portFromKey='$colName' AND networkfilterid='$net->id'",
                                                    'columns' => 'id']
            );
            if($ruleTls){
                continue;
            }
            $rules   = FirewallRules::findFirst([
                                                    "portFromKey='SIPPort' AND networkfilterid='$net->id'",
                                                    'columns' => 'action,networkfilterid,category,description']
            );
            if(!$rules){
                continue;
            }

            $ruleTls = FirewallRules::findFirst(["portFromKey='$colName' AND networkfilterid='$net->id'"]);
            if($ruleTls){
                continue;
            }
            $ruleTls = new FirewallRules();
            foreach ($rules->toArray() as $key => $value){
                $ruleTls->$key = $value;
            }
            $ruleTls->portfrom    = $portTls;
            $ruleTls->portto      = $portTls;
            $ruleTls->protocol    = 'tcp';
            $ruleTls->portFromKey = $colName;
            $ruleTls->portToKey   = $colName;
            $ruleTls->save();
        }

        $db_data = Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            if(!empty($sip_peer->registration_type)){
                continue;
            }
            if($sip_peer->noregister === '0'){
                $sip_peer->registration_type = Sip::REG_TYPE_OUTBOUND;
            }else{
                $sip_peer->registration_type = Sip::REG_TYPE_NONE;
            }
            $sip_peer->save();
        }
    }

    /**
     * Update codecs.
     */
    private function updateCodecs():void
    {
        $availCodecs = [
            'g729'  => 'G.729',
        ];
        $this->addNewCodecs($availCodecs);

        /** @var Codecs $codecForRemove */
        $codecForRemove = Codecs::findFirst("name='g719'");
        if($codecForRemove!==null){
            $codecForRemove->delete();
        }
    }

    /**
     * Adds new codecs from $availCodecs array if it doesn't exist
     *
     * @param array $availCodecs
     */
    private function addNewCodecs(array $availCodecs): void
    {
        foreach ($availCodecs as $availCodec => $desc) {
            $codecData = Codecs::findFirst('name="' . $availCodec . '"');
            if ($codecData === null) {
                $codecData = new Codecs();
            } elseif ($codecData->description === $desc) {
                unset($codecData);
                continue;
            }
            $codecData->name = $availCodec;
            $codecData->type        = 'audio';
            $codecData->disabled    = '1';
            $codecData->description = $desc;
            if ( ! $codecData->save()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Can not update codec info ' . $codecData->name . ' from \MikoPBX\Common\Models\Codecs',
                    LOG_ERR
                );
            }
        }
    }

    private function updateExtensions():void
    {
        $extensions = [
            IncomingRoutingTable::ACTION_VOICEMAIL,
        ];
        foreach ($extensions as $extension){
            $data                = Extensions::findFirst('number="' . $extension . '"');
            if ($data===null) {
                $data                    = new Extensions();
                $data->number            = $extension;
            }
            $data->type              = Extensions::TYPE_SYSTEM;
            $data->callerid          = 'System Extension';
            $data->public_access     = 0;
            $data->show_in_phonebook = 1;
            $data->save();
        }
    }
}