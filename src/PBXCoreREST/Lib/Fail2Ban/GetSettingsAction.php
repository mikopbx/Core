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

namespace MikoPBX\PBXCoreREST\Lib\Fail2Ban;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Class GetSettingsAction
 * Retrieves Fail2Ban settings including rules and firewall configuration
 *
 * @package MikoPBX\PBXCoreREST\Lib\Fail2Ban
 */
class GetSettingsAction extends Injectable
{
    /**
     * Retrieve Fail2Ban settings
     *
     * @return PBXApiResult An object containing the result of the API call
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get or create Fail2Ban rules
            $rules = Fail2BanRules::findFirst();
            if ($rules === null) {
                $rules = new Fail2BanRules();
                // Set default values if creating new
                $rules->maxretry = 20;
                $rules->bantime = 600;
                $rules->findtime = 600;
                $rules->whitelist = '';
            }

            // Get max requests per second setting
            $maxReqPerSec = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_MAX_REQ);

            // Prepare response data (without ID and PBXFail2BanEnabled)
            $res->data = [
                'maxretry' => $rules->maxretry,
                'bantime' => $rules->bantime,
                'findtime' => $rules->findtime,
                'whitelist' => $rules->whitelist,
                PbxSettings::PBX_FIREWALL_MAX_REQ => $maxReqPerSec,
                'extensionsCount' => (int)Extensions::count(),
            ];

            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }

        return $res;
    }
}