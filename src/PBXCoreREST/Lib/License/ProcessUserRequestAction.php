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

namespace MikoPBX\PBXCoreREST\Lib\License;

use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use MikoPBX\Common\Library\Text;
use SimpleXMLElement;
use Phalcon\Di\Injectable;

/**
 * Class ProcessUserRequestAction
 * Check and update license key on database.
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class ProcessUserRequestAction extends Injectable
{
    /**
     * Check and update a license key on a database.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
        if (strlen($data['licKey']) === 28 && Text::startsWith($data['licKey'], 'MIKO-')) {
            ModelsBase::clearCache(PbxSettings::class);
            $oldLicKey =  PbxSettings::getValueByKey(PbxSettings::PBX_LICENSE);

            // Check if key has changed or if we need to validate existing key
            if ($oldLicKey === $data['licKey']) {
                // Key hasn't changed - return success without re-validation
                $res->data[PbxSettings::PBX_LICENSE] = $data['licKey'];
                $res->messages['info'][] = $translation->_('lic_SuccessfulActivation');
                $res->success = true;
            } else {
                // Key has changed - validate it
                $licenseInfo = $license->getLicenseInfo($data['licKey']);
                if ($licenseInfo['success'] && $licenseInfo['result'] instanceof SimpleXMLElement) {
                    PbxSettings::setValueByKey(PbxSettings::PBX_LICENSE, $data['licKey']);
                    $license->changeLicenseKey($data['licKey']);
                    $license->addTrial('11'); // MikoPBX forever license
                    $res->data[PbxSettings::PBX_LICENSE] = $data['licKey'];
                    $res->messages['info'][] = $translation->_('lic_SuccessfulActivation');
                    $res->success = true;
                } elseif (!$licenseInfo['success'] && !empty($licenseInfo['error'])) {
                    // Use translateLicenseErrorMessage to handle all error codes
                    $translatedError = $license->translateLicenseErrorMessage($licenseInfo['error']);
                    $res->messages['license'][] = $translatedError;
                    $res->success = false;

                    // Determine HTTP code based on Zephir library response code
                    $errorCode = $licenseInfo['code'] ?? 0;

                    if ($errorCode === 400 || str_contains($licenseInfo['error'], '2026')) {
                        // Invalid license key - client error
                        $res->httpCode = 400; // Bad Request
                    } elseif ($errorCode === 0) {
                        // Connection error - no response from GNATS
                        $res->httpCode = 503; // Service Unavailable
                    } elseif ($errorCode >= 500) {
                        // Server error from license server
                        $res->httpCode = 502; // Bad Gateway
                    } else {
                        // Other client errors (invalid format, etc.)
                        $res->httpCode = 400; // Bad Request
                    }
                } else {
                    $res->messages['license'][] = $translation->_('lic_FailedCheckLicense');
                    $res->success = false;
                    $res->httpCode = 502; // Bad Gateway - unexpected response
                }
            }
            if (!empty($data['coupon'])) {
                $result = $license->activateCoupon($data['coupon']);
                if ($result === true) {
                    $res->messages['info'][] = $translation->_('lic_SuccessfulCouponActivation');
                    $res->success = true;
                } else {
                    $res->messages['license'][] = $license->translateLicenseErrorMessage((string)$result);
                    $res->success = false;
                    $res->httpCode = 502; // Bad Gateway - license server communication error
                }
            }
        } else { // Only add trial for a license key
            $newLicenseKey = (string)$license->getTrialLicense($data);
            if (
                strlen($newLicenseKey) === 28
                && Text::startsWith($newLicenseKey, 'MIKO-')
            ) {
                PbxSettings::setValueByKey(PbxSettings::PBX_LICENSE, $newLicenseKey);
                $license->changeLicenseKey($newLicenseKey);
                $res->success = true;
                $res->data[PbxSettings::PBX_LICENSE] = $newLicenseKey;
                $res->messages['info'] = $translation->_('lic_SuccessfulActivation');
            } else {
                // No internet connection, or wrong data sent to license server, or something else
                $res->messages['license'][] = $license->translateLicenseErrorMessage($newLicenseKey);
                $res->success = false;
                $res->httpCode = 502; // Bad Gateway - license server communication error
            }
        }
        return $res;
    }
}
