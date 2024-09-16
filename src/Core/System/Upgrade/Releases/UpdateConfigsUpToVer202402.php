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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;
use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Config as ConfigAlias;

class UpdateConfigsUpToVer202402 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2024.2.3';

	private ConfigAlias $config;
    private MikoPBXConfig $mikoPBXConfig;
    private bool $isLiveCD;

	/**
     * Class constructor.
     */
    public function __construct()
    {
        $this->config = $this->getDI()->getShared('config');
        $this->mikoPBXConfig = new MikoPBXConfig();
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

	/**
     * Main function
     */
    public function processUpdate():void
    {
  		if ($this->isLiveCD) {
            return;
        }
        $this->updateSearchIndex();
        $this->updateFirewallRulesForIAX();
    }

    private function updateSearchIndex():void
    {
        $parameters = [
            'models' => [
                'Users' => Users::class,
            ],
            'joins' => [
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'INNER',
                ],
                'Extensions' => [
                    0 => Extensions::class,
                    1 => 'Extensions.userid=Users.id and Extensions.is_general_user_number = "1" and Extensions.type="' . Extensions::TYPE_SIP . '"',
                    2 => 'Extensions',
                    3 => 'INNER',
                ],
                'ExternalExtensions' => [
                    0 => Extensions::class,
                    1 => 'ExternalExtensions.userid=Users.id and Extensions.is_general_user_number = "1" and ExternalExtensions.type="' . Extensions::TYPE_EXTERNAL . '"',
                    2 => 'ExternalExtensions',
                    3 => 'LEFT',
                ],
            ],
            'columns' => [
                'extensionId'=>'Extensions.id',
                'user_username'=>'Users.username',
                'user_email'=>'Users.email',
                'extension_number'=>'Extensions.number',
                'mobile_number'=>'ExternalExtensions.number',
                'extension_callerid'=>'Extensions.callerid',
            ]
        ];
        $query = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery();
        $selectedUsers = $query->execute()->toArray();
        foreach ($selectedUsers as $record) {
            $extension = Extensions::findFirst($record['extensionId']);
            if (!$extension) {
                continue;
            }
            // Collect data for the search index
            $username = mb_strtolower($record['user_username']??'');
            $callerId = mb_strtolower($record['extension_callerid']??'');
            $email = mb_strtolower($record['user_email']??'');
            $internalNumber = mb_strtolower($record['extension_number']??'');
            $mobileNumber = mb_strtolower($record['mobile_number']??'');

            // Combine all fields into a single string
            $extension->search_index =  $username . ' ' . $callerId . ' ' . $email . ' ' . $internalNumber . ' ' . $mobileNumber;
            $extension->save();
        }
    }

    /**
     * Update firewall rules for IAX
     * https://github.com/mikopbx/Core/issues/782
     */
    public function updateFirewallRulesForIAX(): void
    {
        $colName  = PbxSettingsConstants::IAX_PORT;
        $iax_port = PbxSettings::getValueByKey(PbxSettingsConstants::IAX_PORT);
        $nets = NetworkFilters::find(['columns' => 'id']);
        foreach ($nets as $net){
            $filter = [
                "portFromKey='$colName' AND networkfilterid='$net->id'",
                'columns' => 'id'
            ];
            $rule = FirewallRules::findFirst($filter);
            if($rule){
                continue;
            }
            $rule = new FirewallRules();
            foreach ($rule->toArray() as $key => $value){
                $rule->$key = $value;
            }
            $rule->networkfilterid = $net->id;
            $rule->action       = 'block';
            $rule->portfrom    = $iax_port;
            $rule->portto      = $iax_port;
            $rule->protocol    = 'udp';
            $rule->portFromKey = $colName;
            $rule->portToKey   = $colName;
            $rule->category    = 'IAX';
            $rule->save();
        }
    }
}