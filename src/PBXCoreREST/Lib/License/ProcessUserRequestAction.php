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
        // License errors must return HTTP 200 so the frontend Fomantic UI API
        // module parses the response body and displays messages.license to the
        // user. BaseController defaults result=false to 422, which jQuery
        // treats as a transport error and never shows the message content.
        $res->httpCode = 200;
        $di = Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
        if (strlen($data['licKey']) === 28 && Text::startsWith($data['licKey'], 'MIKO-')) {
            PbxSettings::clearCache(PbxSettings::class);
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
                    $translatedError = $license->translateLicenseErrorMessage($licenseInfo['error']);
                    $res->messages['license'][] = $translatedError;
                    $res->success = false;
                } else {
                    $res->messages['license'][] = $translation->_('lic_FailedCheckLicense');
                    $res->success = false;
                }
            }
            if (!empty($data['coupon'])) {
                $couponResult = $license->activateCoupon($data['coupon']);
                if (!empty($couponResult['success'])) {
                    $res->messages['info'][] = $translation->_('lic_SuccessfulCouponActivation');
                    $res->success = true;
                } else {
                    $couponError = $couponResult['error'] ?? '';
                    $res->messages['license'][] = $license->translateLicenseErrorMessage($couponError);
                    $res->success = false;
                }
            }
        } else {
            $trialResult = $license->getTrialLicense($data);
            if (!empty($trialResult['success'])) {
                $newLicenseKey = (string)($trialResult['result'] ?? '');
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
                    $res->messages['license'][] = $translation->_('lic_FailedCheckLicense');
                    $res->success = false;
                }
            } else {
                $trialError = $trialResult['error'] ?? '';
                $res->messages['license'][] = $license->translateLicenseErrorMessage($trialError);
                $res->success = false;
            }
        }
        return $res;
    }
}
