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

namespace MikoPBX\PBXCoreREST\Lib\Network;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting NAT settings
 *
 * @api {get} /pbxcore/api/v3/network:getNatSettings Get NAT settings
 * @apiVersion 3.0.0
 * @apiName GetNatSettings
 * @apiGroup Network
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data NAT settings
 * @apiSuccess {Boolean} data.usenat NAT enabled flag
 * @apiSuccess {String} data.extipaddr External IP address
 * @apiSuccess {String} data.exthostname External hostname
 * @apiSuccess {String} data.AUTO_UPDATE_EXTERNAL_IP Auto update external IP flag
 * @apiSuccess {String} data.EXTERNAL_SIP_PORT External SIP port
 * @apiSuccess {String} data.EXTERNAL_TLS_PORT External TLS port
 */
class GetNatSettingsAction
{
    /**
     * Get NAT settings
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get internet interface
            $internetInterface = LanInterfaces::findFirst(['internet = :internet:', 'bind' => ['internet' => '1']]);

            $natSettings = [
                'usenat' => false,
                'extipaddr' => '',
                'exthostname' => '',
                'AUTO_UPDATE_EXTERNAL_IP' => '0',
                'EXTERNAL_SIP_PORT' => '',
                'EXTERNAL_TLS_PORT' => '',
            ];

            if ($internetInterface) {
                $natSettings['usenat'] = $internetInterface->topology === LanInterfaces::TOPOLOGY_PRIVATE;
                $natSettings['extipaddr'] = $internetInterface->extipaddr;
                $natSettings['exthostname'] = $internetInterface->exthostname;
            }

            // Get NAT-related PBX settings
            $natSettings['AUTO_UPDATE_EXTERNAL_IP'] = PbxSettings::getValueByKey(PbxSettings::AUTO_UPDATE_EXTERNAL_IP);
            $natSettings['EXTERNAL_SIP_PORT'] = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_PORT);
            $natSettings['EXTERNAL_TLS_PORT'] = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_TLS_PORT);

            // Get internal ports for reference
            $natSettings['SIP_PORT'] = PbxSettings::getValueByKey(PbxSettings::SIP_PORT);
            $natSettings['TLS_PORT'] = PbxSettings::getValueByKey(PbxSettings::TLS_PORT);
            $natSettings['RTP_PORT_FROM'] = PbxSettings::getValueByKey(PbxSettings::RTP_PORT_FROM);
            $natSettings['RTP_PORT_TO'] = PbxSettings::getValueByKey(PbxSettings::RTP_PORT_TO);

            $res->data = $natSettings;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}