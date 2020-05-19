<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Service\License;
use MikoPBX\Common\Models\PbxExtensionModules;

require_once 'globals.php';


$lic = new License("http://127.0.0.1:8223");

$result = $lic->checkModules();

$data     = [
    "companyname" => "MIKO",
    "email"       => "nbek@miko.ru",
    "contact"     => "Nikolay Beketov",
    "telefone"         => "+79265244742",
    "inn"         => "7894564153"
];
$result =  $lic->getTrialLicense($data);


$result = $lic->captureFeature(33);
$result = $lic->releaseFeature(33);
$result = $lic->addTrial(11);
$result = $lic->activateCoupon('');
$result = $lic->getLicenseInfo("");
$result = $lic->changeLicenseKey("");
$result = $lic->checkPBX();


// Версия PBX
$params['PBXname'] = 'MikoPBX@' . file_get_contents("/etc/version");

// Количество Extensions
$extensions                   = Extensions::find('type="SIP"');
$params['CountSipExtensions'] = $extensions->count();

$result = $lic->sendLicenseMetrics("", $params);

$result =  $lic->featureAvailable(33);





