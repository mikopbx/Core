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

namespace MikoPBX\Tests\Modules\ModuleSmartIVR\Lib;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use Modules\ModuleSmartIVR\Lib\WebService1C;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Modules\ModuleSmartIVR\Models\ModuleSmartIVR;


class WebService1CTest extends AbstractUnitTest
{

    public function testGetIvrMenuText()
    {
        $settings = ModuleSmartIVR::findFirst();

        $this->module_extension   = $settings->extension;
        $this->timeout_extension  = $settings->timeout_extension;
        $this->failover_extension = $settings->failover_extension;
        $this->internalExtLength  = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH);
        // Количество повторов меню перед переводом на резервный номер
        $this->count_of_repeat_ivr = 3;
        if (isset($settings->number_of_repeat)
            && $settings->number_of_repeat > 0) {
            $this->count_of_repeat_ivr = $settings->number_of_repeat;
        }
        $params1C = [
            'database'       => $settings->database,
            'login'          => $settings->login,
            'secret'         => $settings->secret,
            'server_1c_host' => $settings->server1chost,
            'server_1c_port' => $settings->server1cport,
            'library_1c'     => $settings->library_1c,
            'use_ssl'        => $settings->useSSL === '1',
            'logger'         => $this->logger,
        ];

        $web_service_1C = new WebService1C($params1C);
        $number = '79265244742';
        $res = $web_service_1C->getIvrMenuText($number);
        $this->assertTrue(count($res)>0);
    }
}
