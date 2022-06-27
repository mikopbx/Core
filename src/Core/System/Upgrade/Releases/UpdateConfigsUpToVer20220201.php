<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer20220201 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2022.2.1';

    private bool $isLiveCD;

	/**
     * Class constructor.
     */
    public function __construct()
    {
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

    /**
     * https://github.com/mikopbx/Core/issues/269
     */
    public function processUpdate():void
    {
        if ($this->isLiveCD) {
            return;
        }
        $colName = 'TLS_PORT';
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
            $ruleTls = new FirewallRules();
            foreach ($rules->toArray() as $key => $value){
                $ruleTls->$key = $value;
            }
            $ruleTls->portfrom    = '5061';
            $ruleTls->portto      = '5061';
            $ruleTls->protocol    = 'tcp';
            $ruleTls->portFromKey = $colName;
            $ruleTls->portToKey   = $colName;
            $ruleTls->save();
        }
    }
}