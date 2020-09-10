<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;

use MikoPBX\Service\License;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Class LicenseProvider
 *
 * @package MikoPBX\Common\Providers
 *
 * @method  bool checkModules()
 * @method  bool checkPBX()
 * @method  string| \SimpleXMLElement getLicenseInfo(string $key)
 * @method  bool | string getTrialLicense(array $params)
 * @method  bool | string addTrial(string $productId)
 * @method  bool | string activateCoupon(string $coupon)
 * @method  void changeLicenseKey(string $newKey)
 * @method  void sendLicenseMetrics(string $key, array $params)
 * @method  array captureFeature(string $featureId)
 * @method  array featureAvailable(string $featureId)
 * @method  array releaseFeature(string $featureId)
 * @method  string translateLicenseErrorMessage(string $message)
 *
 */
class LicenseProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $debugMode = $di->getShared('config')->path('adminApplication.debugMode');
        $di->setShared(
            'license',
            function () use ($debugMode) {
                if ($debugMode) {
                    $serverUrl = 'http://172.16.32.72:8223';
                } else {
                    $serverUrl = 'http://127.0.0.1:8223';
                }
                return new License($serverUrl);
            }
        );
    }
}