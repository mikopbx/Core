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
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;
use Phalcon\Text;
use SimpleXMLElement;

/**
 * Class ProcessUserRequestAction
 * Check and update license key on database.
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class ProcessUserRequestAction extends \Phalcon\Di\Injectable
{
    /**
     * Check and update a license key on a database.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
        if (strlen($data['licKey']) === 28 && Text::startsWith($data['licKey'], 'MIKO-')) {
            ModelsBase::clearCache(PbxSettings::class);
            $oldLicKey = $mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::PBX_LICENSE);
            if ($oldLicKey !== $data['licKey']) {
                $licenseInfo = $license->getLicenseInfo($data['licKey']);
                if ($licenseInfo instanceof SimpleXMLElement) {
                    $mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::PBX_LICENSE, $data['licKey']);
                    $license->changeLicenseKey($data['licKey']);
                    $license->addTrial('11'); // MikoPBX forever license
                    $res->data[PbxSettingsConstants::PBX_LICENSE] = $data['licKey'];
                    $res->messages['info'][] = $translation->_('lic_SuccessfulActivation');
                    $res->success = true;
                } elseif (!empty($licenseInfo) && strpos($licenseInfo, '2026') !== false) {
                    $res->messages['license'][] = $translation->_('lic_FailedCheckLicense2026');
                    $res->success = false;
                } elseif (!empty($licenseInfo)) {
                    $res->messages['license'][] = $licenseInfo;
                    $res->success = false;
                } else {
                    $res->messages['license'][] = $translation->_('lic_FailedCheckLicense');
                    $res->success = false;
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
                }
            }
        } else { // Only add trial for a license key
            $newLicenseKey = (string)$license->getTrialLicense($data);
            if (strlen($newLicenseKey) === 28
                && Text::startsWith($newLicenseKey, 'MIKO-')) {
                $mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::PBX_LICENSE, $newLicenseKey);
                $license->changeLicenseKey($newLicenseKey);
                $res->success = true;
                $res->data[PbxSettingsConstants::PBX_LICENSE] = $newLicenseKey;
                $res->messages['info'] = $translation->_('lic_SuccessfulActivation');
            } else {
                // No internet connection, or wrong data sent to license server, or something else
                $res->messages['license'][] = $license->translateLicenseErrorMessage($newLicenseKey);
                $res->success = false;
            }
        }
        return $res;
    }
}