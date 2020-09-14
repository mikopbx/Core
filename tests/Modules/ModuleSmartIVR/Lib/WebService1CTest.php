<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 9 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleSmartIVR\Lib;

use MikoPBX\Common\Models\PbxSettings;
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
        $this->internalExtLength  = PbxSettings::getValueByKey('PBXInternalExtensionLength');
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
