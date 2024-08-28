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

use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer2024v2v10 extends Injectable implements UpgradeSystemConfigInterface
{
    public const PBX_VERSION = '2024.2.10';

    /**
     * Class constructor.
     */
    public function __construct()
    {
    }

    /**
     * https://github.com/mikopbx/Core/issues/782
     */
    public function processUpdate(): void
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