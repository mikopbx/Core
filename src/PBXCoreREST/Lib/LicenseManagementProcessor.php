<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
 * @property \MikoPBX\Common\Providers\LicenseProvider     license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config                               config
 */
class LicenseManagementProcessor extends Injectable
{

    /**
     * Processes requests to licensing system
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     *
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
            default:
                $res->messages[] = "Unknown action - {$action} in licenseCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Reset license key
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function resetLicenseAction():PBXApiResult
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $res           = new PBXApiResult();
        $res->processor = __METHOD__;
        $mikoPBXConfig->deleteGeneralSettings('PBXLicense');
        $res->success = true;
        $this->license->changeLicenseKey('');
        return $res;
    }



    /**
     * Check and update license key on database
     *
     * @param array $data
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function processUserRequestAction(array $data): PBXApiResult
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $res           = new PBXApiResult();
        $res->processor = __METHOD__;
        if (strlen($data['licKey']) === 28
            && Text::startsWith($data['licKey'], 'MIKO-')
        ) {
            ModelsBase::clearCache(PbxSettings::class);
            $oldLicKey = $mikoPBXConfig->getGeneralSettings('PBXLicense');
            if ($oldLicKey !== $data['licKey']) {
                $licenseInfo = $this->license->getLicenseInfo($data['licKey']);
                if ($licenseInfo instanceof SimpleXMLElement) {
                    $mikoPBXConfig->setGeneralSettings('PBXLicense', $data['licKey']);
                    $this->license->changeLicenseKey($data['licKey']);
                    $this->license->addTrial('11'); // MikoPBX forever license
                    $res->success = true;
                } elseif ( ! empty($licenseInfo) && strpos($licenseInfo, '2026') !== false) {
                    $res->success    = false;
                    $res->messages[] = $this->translation->_('lic_FailedCheckLicense2026');
                } elseif ( ! empty($licenseInfo)) {
                    $res->messages[] = $licenseInfo;
                    $res->success    = false;
                } else {
                    $res->messages[] = $this->translation->_('lic_FailedCheckLicense');
                    $res->success    = false;
                }
            }
            if ( ! empty($data['coupon'])) {
                $result = $this->license->activateCoupon($data['coupon']);
                if ($result === true) {
                    $res->messages[] = $this->translation->_('lic_SuccessfulCouponActivated');
                    $res->success    = true;
                } else {
                    $res->messages[] = $this->license->translateLicenseErrorMessage((string)$result);
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
            } else {
                // No internet connection, or wrong data sent to license server, or something else
                $res->messages[] = $this->license->translateLicenseErrorMessage($newLicenseKey);
                $res->success    = false;
            }
        }
        return $res;
    }


    /**
     * Returns license info from license server by key
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
            $res->messages[] = 'License key is wrong or empty';
        }

        return $res;
    }

    /**
     * Check for free MikoPBX base license
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function getMikoPBXFeatureStatusAction(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $checkBaseFeature = $this->license->featureAvailable(33);
        if ($checkBaseFeature['success'] === false) {
            $res->success = false;
            $textError = (string)($checkBaseFeature['error']??'');
            $res->messages[] = $this->license->translateLicenseErrorMessage($textError);
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
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
                    $res->messages[] = $this->license->translateLicenseErrorMessage($textError);
                    $res->success = false;
                }
            }
        }
        return $res;
    }

    /**
     * Sends PBX metrics to the MIKO company
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
}