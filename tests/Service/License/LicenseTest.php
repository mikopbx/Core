<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Tests\Service\License;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Service\License;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class LicenseTest extends AbstractUnitTest
{
    protected License $lic;

    public function __construct($name = null, array $data = [], $dataName = '')
    {
        parent::__construct($name, $data, $dataName);
        $this->lic = new License("http://127.0.0.1:8223");
    }

    public function testCheckModules():void
    {
        $this->lic->checkModules();
        $this->assertTrue(true);
    }

    public function testGetTrialLicense():void
    {
        $data     = [
            "companyname" => "MIKO",
            "email"       => "nbek@miko.ru",
            "contact"     => "Nikolay Beketov",
            "telefone"    => "+79265244742",
            "inn"         => "7894564153"
        ];
        $result =  $this->lic->getTrialLicense($data);
    }

    public function testCaptureFeature():void
    {
        $result = $this->lic->captureFeature(33);
    }

    public function testReleaseFeature():void
    {
        $result = $this->lic->releaseFeature(33);
    }

    public function testAddTrial():void
    {
        $result = $this->lic->addTrial(11);
    }

    public function testActivateCoupon():void
    {
        $result = $this->lic->activateCoupon('');
    }

    public function testGetLicenseInfo():void
    {
        $result = $this->lic->getLicenseInfo('');
    }

    public function testChangeLicenseKey():void
    {
        $this->lic->changeLicenseKey('');
    }

    public function testCheckPBX():void
    {
        $this->lic->checkPBX();
    }

    public function testFeatureAvailable():void
    {
        $result = $this->lic->featureAvailable(33);
    }

    public function testSendLicenseMetrics():void
    {
        // Версия PBX
        $params['PBXname'] = 'MikoPBX@' . file_get_contents("/etc/version");

        // Количество Extensions
        $extensions                   = Extensions::find('type="SIP"');
        $params['CountSipExtensions'] = $extensions->count();

        $result = $this->lic->sendLicenseMetrics("", $params);
    }

}





