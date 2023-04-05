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

namespace MikoPBX\AdminCabinet\Controllers;

use GuzzleHttp\Client as GuzzleHttpClient;
use MikoPBX\AdminCabinet\Forms\LicensingActivateCouponForm;
use MikoPBX\AdminCabinet\Forms\LicensingChangeLicenseKeyForm;
use MikoPBX\AdminCabinet\Forms\LicensingGetKeyForm;
use MikoPBX\Common\Models\PbxSettings;

/**
 * @property \MikoPBX\Service\License license
 */
class LicensingController extends BaseController
{
    /**
     * License key, get new key, activate coupon form
     *
     */
    public function modifyAction(): void
    {
        if ($this->language === 'ru') {
            $this->view->modulesExampleImgPath = $this->url->get('assets/img/modules-example-ru.png');
        } else {
            $this->view->modulesExampleImgPath = $this->url->get('assets/img/modules-example-en.png');
        }

        // License key form
        $licKey                           = PbxSettings::getValueByKey('PBXLicense');
        $changeLicenseKeyForm             = new LicensingChangeLicenseKeyForm(null, ['licKey' => $licKey]);
        $this->view->changeLicenseKeyForm = $changeLicenseKeyForm;

        // Coupon form
        $activateCouponForm             = new LicensingActivateCouponForm();
        $this->view->activateCouponForm = $activateCouponForm;

        // Get new license key form
        $getKeyForm             = new LicensingGetKeyForm();
        $this->view->getKeyForm = $getKeyForm;
        $this->view->submitMode = null;
        $this->view->internetExists = $this->checkInternetConnection();
    }

    /**
     * After some changes on form we will refresh some session cache
     */
    public function saveAction()
    {
        $this->session->remove('PBXLicense');
    }

    /**
     * Checks connection between MikoPBX and marketplace server
     * @return bool
     */
    private function checkInternetConnection():bool
    {
        $client  = new GuzzleHttpClient(['verify' => false ]);
        try {
            $res    = $client->request('GET', 'https://lic.mikopbx.com/protect/v1/ping', ['timeout'     => 2, 'http_errors' => false,]);
            $code   = $res->getStatusCode();
        }catch (\Throwable $e ){
            $code = 0;
        }
        $body = '';
        if($code === 200 && isset($res)){
            $body = $res->getBody()->getContents();
        }
        return strpos($body, "message='pong'") !== false;
    }

}