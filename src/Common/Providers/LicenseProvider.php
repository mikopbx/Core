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

use Error;
use MikoPBX\Core\System\Util;
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
 * @method  \SimpleXMLElement|string getLicenseInfo(string $key)
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
    public const SERVICE_NAME = 'license';

    /**
     * Register license service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                try {
                    return new License('http://127.0.0.1:8223');
                } catch (Error $exception){
                    Util::sysLogMsg(__CLASS__, $exception);
                }
                return null;
            }
        );
    }
}