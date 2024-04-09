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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Service\License;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use SimpleXMLElement;
use Throwable;

/**
 * The LicenseProvider class is responsible for registering the license service.
 *
 * @package MikoPBX\Common\Providers
 *
 * @method  bool checkModules()
 * @method  bool checkPBX()
 * @method  SimpleXMLElement|string getLicenseInfo(string $key)
 * @method  bool | string getTrialLicense(array $params)
 * @method  bool | string addTrial(string $productId)
 * @method  bool | string activateCoupon(string $coupon)
 * @method  void changeLicenseKey(string $newKey)
 * @method  void sendLicenseMetrics(string $key, array $params)
 * @method  array captureFeature(string $featureId)
 * @method  array featureAvailable(string $featureId)
 * @method  array releaseFeature(string $featureId)
 * @method  string translateLicenseErrorMessage(string $message)
 * @method  array ping()
 *
 * @package MikoPBX\Common\Providers
 */
class MarketPlaceProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'license';

    public const LIC_FILE_PATH = '/var/etc/licenseInfo.json';

    /**
     * Register license service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                try {
                    return new License('http://127.0.0.1:8223');
                } catch (Throwable $e){
                    SystemMessages::sysLogMsg(__CLASS__, $e->getMessage());
                }
                return null;
            }
        );
    }
}