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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Di\Injectable;
use Phalcon\Text;
use SimpleXMLElement;


/**
 * Class LicenseManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 * @property \MikoPBX\Common\Providers\MarketPlaceProvider     license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config                               config
 */
class LicenseManagementProcessor extends Injectable
{

    /**
     * Process the license callback.
     *
     * @param array $request The request data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'resetKey':
                $proc = new LicenseManagementProcessor();
                $res = $proc->resetLicenseAction();
                break;
            case 'processUserRequest':
                $proc = new LicenseManagementProcessor();
                $res = $proc->processUserRequestAction($data);
                break;
            case 'getLicenseInfo':
                $proc = new LicenseManagementProcessor();
                $res = $proc->getLicenseInfoAction();
                break;
            case 'getMikoPBXFeatureStatus':
                $proc = new LicenseManagementProcessor();
                $res = $proc->getMikoPBXFeatureStatusAction();
                break;
            case 'captureFeatureForProductId':
                $proc = new LicenseManagementProcessor();
                $res = $proc->captureFeatureForProductIdAction($data);
                break;
            case 'sendPBXMetrics':
                $proc = new LicenseManagementProcessor();
                $res = $proc->sendMetricsAction();
                break;
            case 'ping':
                $proc = new LicenseManagementProcessor();
                $res = $proc->pingAction();
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Reset license key.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function resetLicenseAction():PBXApiResult
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $res           = new PBXApiResult();
        $res->processor = __METHOD__;
        $mikoPBXConfig->resetGeneralSettings('PBXLicense');
        $res->success = true;
        $this->license->changeLicenseKey('');
        return $res;
    }

    /**
     * Check and update license key on database.
     *
     * @param array $data
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function processUserRequestAction(array $data): PBXApiResult
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $res           = new PBXApiResult();
        $res->processor = __METHOD__;
        if (strlen($data['licKey']) === 28 && Text::startsWith($data['licKey'], 'MIKO-')) {
            ModelsBase::clearCache(PbxSettings::class);
            $oldLicKey = $mikoPBXConfig->getGeneralSettings('PBXLicense');
            if ($oldLicKey !== $data['licKey']) {
                $licenseInfo = $this->license->getLicenseInfo($data['licKey']);
                if ($licenseInfo instanceof SimpleXMLElement) {
                    $mikoPBXConfig->setGeneralSettings('PBXLicense', $data['licKey']);
                    $this->license->changeLicenseKey($data['licKey']);
                    $this->license->addTrial('11'); // MikoPBX forever license
                    $res->data['PBXLicense'] = $data['licKey'];
                    $res->success = true;
                } elseif ( ! empty($licenseInfo) && strpos($licenseInfo, '2026') !== false) {
                    $res->messages['error'][] = $this->translation->_('lic_FailedCheckLicense2026');
                    $res->success    = false;
                } elseif ( ! empty($licenseInfo)) {
                    $res->messages['error'][] = $licenseInfo;
                    $res->success    = false;
                } else {
                    $res->messages['error'][] = $this->translation->_('lic_FailedCheckLicense');
                    $res->success    = false;
                }
            }
            if ( ! empty($data['coupon'])) {
                $result = $this->license->activateCoupon($data['coupon']);
                if ($result === true) {
                    $res->messages[] = $this->translation->_('lic_SuccessfulСuponActivation');
                    $res->success    = true;
                } else {
                    $res->messages['error'][] = $this->license->translateLicenseErrorMessage((string)$result);
                    $res->success    = false;
                }
            }
        } else { // Only add trial for license key
            $newLicenseKey = (string)$this->license->getTrialLicense($data);
            if (strlen($newLicenseKey) === 28
                && Text::startsWith($newLicenseKey, 'MIKO-')) {
                $mikoPBXConfig->setGeneralSettings('PBXLicense', $newLicenseKey);
                $this->license->changeLicenseKey($newLicenseKey);
                $res->success    = true;
                $res->data['PBXLicense'] = $newLicenseKey;
            } else {
                // No internet connection, or wrong data sent to license server, or something else
                $res->messages['error'][] = $this->license->translateLicenseErrorMessage($newLicenseKey);
                $res->success    = false;
            }
        }
        return $res;
    }

    /**
     * Returns license info from license server by key.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function getLicenseInfoAction(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $licenseKey = PbxSettings::getValueByKey('PBXLicense');
        if ((strlen($licenseKey) === 28
            && Text::startsWith($licenseKey, 'MIKO-')
        )) {
            $licenseInfo              = $this->license->getLicenseInfo($licenseKey);
            $res->success             = true;
            $res->data['licenseInfo'] = json_encode($licenseInfo);
        } else {
            $res->messages['error'][] = $this->translation->_('lic_WrongLicenseKeyOrEmpty');
        }

        return $res;
    }

    /**
     * Check for free MikoPBX base license.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function getMikoPBXFeatureStatusAction(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $checkBaseFeature = $this->license->featureAvailable(33);
        if ($checkBaseFeature['success'] === false) {
            $res->success = false;
            $textError = (string)($checkBaseFeature['error']??'');
            $res->messages['error'][] = $this->license->translateLicenseErrorMessage($textError);
        } else {
            $res->success = true;
        }
        return $res;
    }

    /**
     * Tries to capture feature.
     *
     * If it fails we try to get trial and then try capture again.
     *
     * @param array $data
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function captureFeatureForProductIdAction(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $licFeatureId = $data['licFeatureId'];
        $licProductId = $data['licProductId'];

        if ( ! isset($licFeatureId, $licProductId)) {
            $res->messages[]='The feature id or product id is empty.';
            return $res;
        }
        $res->success = true;
        if ($licFeatureId > 0) {
            // 1.Try to capture feature
            $result = $this->license->captureFeature($licFeatureId);
            if ($result['success'] === false) {
                // Add trial
                $this->license->addTrial($licProductId);
                // 2.Try to capture feature
                $result = $this->license->captureFeature($licFeatureId);
                if ($result['success'] === false) {
                    $textError = (string)($result['error']??'');
                    $res->messages['error'][] = $this->license->translateLicenseErrorMessage($textError);
                    $res->success = false;
                }
            }
        }
        return $res;
    }

    /**
     * Sends PBX metrics to the license server.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function sendMetricsAction(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success= true;

        // License Key
        $licenseKey = PbxSettings::getValueByKey('PBXLicense');

        $dataMetrics = [];

        // PBXVersion
        $dataMetrics['PBXname'] = 'MikoPBX@' . PbxSettings::getValueByKey('PBXVersion');

        // SIP Extensions count
        $extensions                   = Extensions::find('type="'.Extensions::TYPE_SIP.'"');
        $dataMetrics['CountSipExtensions'] = $extensions->count();

        // Interface language
        $dataMetrics['WebAdminLanguage'] = PbxSettings::getValueByKey('WebAdminLanguage');

        // PBX language
        $dataMetrics['PBXLanguage'] = PbxSettings::getValueByKey('PBXLanguage');

        $this->license->sendLicenseMetrics($licenseKey, $dataMetrics);

        return $res;
    }

    /**
     * Sends ping request to the license server.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function pingAction(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $result = $this->license->ping();
        $res->success= $result['success'] === true;
        return $res;
    }
}