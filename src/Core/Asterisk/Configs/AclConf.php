<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
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