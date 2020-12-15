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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class AclConf extends ConfigClass
{
    protected string $description = 'acl.conf';
    protected array $data_peers;

    /**
     *
     * @return array
     */
    public function dependenceModels(): array
    {
        return [Sip::class, NetworkFilters::class];
    }

    /**
     * Получение настроек.
     */
    public function getSettings(): void
    {
        // Настройки для текущего класса.
        $this->data_peers     = $this->getPeers();
    }

    /**
     * Получение данных по SIP пирам.
     *
     * @return array
     */
    private function getPeers(): array
    {
        $data    = [];
        $db_data = Sip::find("type = 'peer' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            $arr_data       = $sip_peer->toArray();
            $network_filter = null;
            if (null != $sip_peer->networkfilterid) {
                $network_filter = NetworkFilters::findFirst($sip_peer->networkfilterid);
            }
            $arr_data['permit'] = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']   = ($network_filter === null) ? '' : $network_filter->deny;

            $data[] = $arr_data;
        }

        return $data;
    }

    protected function generateConfigProtected(): void
    {
        $conf_acl = '';
        foreach ($this->data_peers as $peer) {
            $manual_attributes = Util::parseIniSettings($peer['manualattributes'] ?? '');

            $deny         = (trim($peer['deny']) === '') ? '0.0.0.0/0.0.0.0' : $peer['deny'];
            $permit       = (trim($peer['permit']) === '') ? '0.0.0.0/0.0.0.0' : $peer['permit'];

            $options  = [
                'deny'   => $deny,
                'permit' => $permit,
            ];
            $conf_acl .= "[acl_{$peer['extension']}] \n";
            $conf_acl .= Util::overrideConfigurationArray($options, $manual_attributes, 'acl');

        }

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/acl.conf', $conf_acl);
    }


}