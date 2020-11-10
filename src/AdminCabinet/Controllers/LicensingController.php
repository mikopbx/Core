<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

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

    }

    /**
     * After some changes on form we will refresh some session cache
     */
    public function saveAction()
    {
        $this->session->remove('PBXLicense');
    }

}