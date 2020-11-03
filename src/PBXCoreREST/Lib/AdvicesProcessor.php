<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Storage;
use MikoPBX\Common\Models\{NetworkFilters, PbxSettings};
use GuzzleHttp;
use Phalcon\Di\Injectable;
use SimpleXMLElement;

/**
 * Class AdvicesProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 * @property \MikoPBX\Common\Providers\LicenseProvider license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config                               config
 */
class AdvicesProcessor extends Injectable
{

    /**
     * Processes Advices request
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];

        switch ($action) {
            case 'getList':
                $proc = new AdvicesProcessor();
                $res  = $proc->getAdvicesAction();
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor  = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in advicesCallBack";
                break;
        }

        $res->function = $action;

        return $res;
    }


    /**
     * Makes list of notifications about system, firewall, passwords, wrong settings
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function getAdvicesAction(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;

        $arrMessages     = [];
        $arrAdvicesTypes = [
            ['type' => 'isConnected', 'cacheTime' => 15],
            ['type' => 'checkPasswords', 'cacheTime' => 15],
            ['type' => 'checkFirewalls', 'cacheTime' => 15],
            ['type' => 'checkStorage', 'cacheTime' => 120],
            ['type' => 'checkUpdates', 'cacheTime' => 3600],
            ['type' => 'checkRegistration', 'cacheTime' => 86400],
        ];

        $managedCache = $this->getDI()->getShared('managedCache');

        $language = PbxSettings::getValueByKey('WebAdminLanguage');

        foreach ($arrAdvicesTypes as $adviceType) {
            $currentAdvice = $adviceType['type'];
            $cacheTime     = $adviceType['cacheTime'];
            if ($managedCache->has($currentAdvice)) {
                $oldResult = json_decode($managedCache->get($currentAdvice), true);
                if ($language === $oldResult['LastLanguage']) {
                    $arrMessages[] = $oldResult['LastMessage'];
                    continue;
                }
            }
            $newResult = $this->$currentAdvice();
            if ( ! empty($newResult)) {
                $arrMessages[] = $newResult;
            }
            $managedCache->set(
                $currentAdvice,
                json_encode(
                    [
                        'LastLanguage' => $language,
                        'LastMessage'  => $newResult,
                    ]
                ),
                $cacheTime
            );
        }
        $res->success = true;
        $result       = [];
        foreach ($arrMessages as $message) {
            foreach ($message as $key => $value) {
                if ( ! empty($value)) {
                    $result[$key][] = $value;
                }
            }
        }
        $res->data['advices'] = $result;

        return $res;
    }

    /**
     * Check passwords quality
     *
     * @return array
     */
    private function checkPasswords(): array
    {
        $messages           = [];
        $arrOfDefaultValues = PbxSettings::getDefaultArrayValues();
        if ($arrOfDefaultValues['WebAdminPassword'] === PbxSettings::getValueByKey('WebAdminPassword')) {
            $messages['warning'] = $this->translation->_(
                'adv_YouUseDefaultWebPassword',
                ['url' => $this->url->get('general-settings/modify/#/passwords')]
            );
        }
        if ($arrOfDefaultValues['SSHPassword'] === PbxSettings::getValueByKey('SSHPassword')) {
            $messages['warning'] = $this->translation->_(
                'adv_YouUseDefaultSSHPassword',
                ['url' => $this->url->get('general-settings/modify/#/ssh')]
            );
        }

        return $messages;
    }

    /**
     * Check firewall status
     *
     * @return array
     */
    private function checkFirewalls(): array
    {
        $messages = [];
        if (PbxSettings::getValueByKey('PBXFirewallEnabled') === '0') {
            $messages['warning'] = $this->translation->_(
                'adv_FirewallDisabled',
                ['url' => $this->url->get('firewall/index/')]
            );
        }
        if (NetworkFilters::count() === 0) {
            $messages['warning'] = $this->translation->_(
                'adv_NetworksNotConfigured',
                ['url' => $this->url->get('firewall/index/')]
            );
        }

        return $messages;
    }

    /**
     * Check storage is mount and how many space available
     *
     * @return array
     *
     */
    private function checkStorage(): array
    {
        $messages           = [];
        $st                 = new Storage();
        $storageDiskMounted = false;
        $disks              = $st->getAllHdd();
        foreach ($disks as $disk) {
            if (array_key_exists('mounted', $disk)
                && strpos($disk['mounted'], '/storage/usbdisk') !== false) {
                $storageDiskMounted = true;
                if ($disk['free_space'] < 500) {
                    $messages['warning']
                        = $this->translation->_(
                        'adv_StorageDiskRunningOutOfFreeSpace',
                        ['free' => $disk['free_space']]
                    );
                }
            }
        }
        if ($storageDiskMounted === false) {
            $messages['error'] = $this->translation->_('adv_StorageDiskUnMounted');
        }
        return $messages;
    }

    /**
     * Check new version PBX
     *
     * @return array
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    private function checkUpdates(): array
    {
        $messages   = [];
        $PBXVersion = PbxSettings::getValueByKey('PBXVersion');

        $client = new GuzzleHttp\Client();
        $res    = $client->request(
            'POST',
            'https://update.askozia.ru/',
            [
                'form_params' => [
                    'TYPE'   => 'FIRMWAREGETNEWS',
                    'PBXVER' => $PBXVersion,
                ],
            ]
        );
        if ($res->getStatusCode() !== 200) {
            return [];
        }

        $answer = json_decode($res->getBody(), false);
        if ($answer !== null && $answer->newVersionAvailable === true) {
            $messages['info'] = $this->translation->_(
                'adv_AvailableNewVersionPBX',
                [
                    'url' => $this->url->get('update/index/'),
                    'ver' => $answer->version,
                ]
            );
        }

        return $messages;
    }

    /**
     * Check mikopbx license status
     *
     */
    private function checkRegistration(): array
    {
        $messages = [];
        $licKey   = PbxSettings::getValueByKey('PBXLicense');
        $language   = PbxSettings::getValueByKey('WebAdminLanguage');

        if ( ! empty($licKey)) {
            $checkBaseFeature = $this->license->featureAvailable(33);
            if ($checkBaseFeature['success'] === false) {
                if ($language === 'ru') {
                    $url = 'https://wiki.mikopbx.com/licensing#faq_chavo';
                } else {
                    $url = "https://wiki.mikopbx.com/{$language}:licensing#faq_chavo";
                }

                $messages['warning'] = $this->translation->_(
                    'adv_ThisCopyHasLicensingTroubles',
                    [
                        'url'   => $url,
                        'error' => $this->license->translateLicenseErrorMessage($checkBaseFeature['error']),
                    ]
                );
            }

            $licenseInfo = $this->license->getLicenseInfo($licKey);
            if ($licenseInfo instanceof SimpleXMLElement) {
                file_put_contents('/tmp/licenseInfo', json_encode($licenseInfo->attributes()));
            }
        }

        return $messages;
    }

    /**
     * Checks whether internet connection is available or not
     *
     * @return array
     */
    private function isConnected(): array
    {
        $messages = [];
        $connected = @fsockopen("www.google.com", 443);
        if ($connected !== false) {
            fclose($connected);
        } else {
            $messages['warning'] = $this->translation->_('adv_ProblemWithInternetConnection');
        }
        return $messages;
    }
}