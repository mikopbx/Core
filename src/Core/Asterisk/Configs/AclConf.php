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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Util;

/**
 * Represents the AclConf class responsible for generating acl.conf configuration file.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class AclConf extends AsteriskConfigClass
{
    /**
     * The module hook applying priority.
     */
    public int $priority = 1000;

    protected string $description = 'acl.conf';
    protected array $data_peers;

    /**
     * Returns the models that this class depends on.
     *
     * @return array The array of dependence models.
     */
    public function getDependenceModels(): array
    {
        return [Sip::class, NetworkFilters::class];
    }

    /**
     * Retrieves the settings.
     */
    public function getSettings(): void
    {
        // Settings for the current class.
        $this->data_peers = $this->getPeers();
    }

    /**
     * Retrieves the data for SIP peers.
     *
     * @return array The array of SIP peers data.
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

    /**
     * Generates the protected configuration content.
     */
    protected function generateConfigProtected(): void
    {
        $conf_acl = '';
        foreach ($this->data_peers as $peer) {
            $manual_attributes = Util::parseIniSettings($peer['manualattributes'] ?? '');

            $deny   = (trim($peer['deny']) === '') ? '0.0.0.0/0.0.0.0' : $peer['deny'];
            $permit = (trim($peer['permit']) === '') ? '0.0.0.0/0.0.0.0' : $peer['permit'];

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