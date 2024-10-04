<?php
/*
* MikoPBX - free phone system for small business
* Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
namespace MikoPBX\Service;
use SimpleXMLElement;

/**
 * Marketplace processor
 *
 * @method void __construct() Constructor.
 * @method void __destruct() Destructor.
 * @method string|SimpleXMLElement getLicenseInfo(string $key) Retrieves license information.
 * @method bool|string getTrialLicense(array $params) Retrieves trial license.
 * @method bool|string addTrial(string $productId) Adds a trial to the license key.
 * @method bool|string activateCoupon(string $coupon) Activates a coupon.
 * @method void changeLicenseKey(string $newKey) Changes the license key.
 * @method void sendLicenseMetrics(string $key, array $params) Sends metrics to the licensing server.
 * @method array captureFeature(string $featureId) Captures the specified feature in the license.
 * @method array featureAvailable(string $featureId) Checks if a feature is available in the license.
 * @method array releaseFeature(string $featureId) Releases the specified feature in the license.
 * @method array ping() Checks the connection with the licensing server.
 * @method string translateLicenseErrorMessage(string $message) Translates the license error message.
 * @method void checkModules() Checks the licenses of the modules.
 * @method void checkPBX() Checks the PBX for a specific feature.
 *
 * @const string MIKOPBX_FEATURE ID of the main MikoPBX feature.
 * @const string MIKOPBX_PRODUCT_ID ID of the MikoPBX product.
 */
class License
{
    // This class is compiled
}
