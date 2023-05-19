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
        echo $result;
        $this->assertTrue(true);
    }

    public function testCaptureFeature():void
    {
        $result = $this->lic->captureFeature(33);
        echo $result;
        $this->assertTrue(true);
    }

    public function testReleaseFeature():void
    {
        $result = $this->lic->releaseFeature(33);
        echo $result;
        $this->assertTrue(true);
    }

    public function testAddTrial():void
    {
        $result = $this->lic->addTrial(11);
        echo $result;
        $this->assertTrue(true);
    }

    public function testActivateCoupon():void
    {
        $result = $this->lic->activateCoupon('');
        echo $result;
        $this->assertTrue(true);
    }

    public function testGetLicenseInfo():void
    {
        $result = $this->lic->getLicenseInfo('');
        echo $result;
        $this->assertTrue(true);
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
        echo $result;
        $this->assertTrue(true);
    }

    public function testSendLicenseMetrics():void
    {
        // Версия PBX
        $params['PBXname'] = 'MikoPBX@' . file_get_contents("/etc/version");

        // Количество Extensions
        $extensions                   = Extensions::find('type="SIP"');
        $params['CountSipExtensions'] = $extensions->count();

        $result = $this->lic->sendLicenseMetrics("", $params);
        echo $result;
        $this->assertTrue(true);
    }

}





