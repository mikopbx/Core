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

use MikoPBX\Common\Providers\ManagedCacheProvider;
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

        $managedCache = $this->getDI()->getShared(ManagedCacheProvider::SERVICE_NAME);

        $language = PbxSettings::getValueByKey('WebAdminLanguage');

        foreach ($arrAdvicesTypes as $adviceType) {
            $currentAdvice = $adviceType['type'];
            $cacheTime     = $adviceType['cacheTime'];
            $cacheKey      = 'AdvicesProcessor:getAdvicesAction:'.$currentAdvice;
            if ($managedCache->has($cacheKey)) {
                $oldResult = json_decode($managedCache->get($cacheKey), true);
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
                $cacheKey,
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
     * @noinspection PhpUnusedPrivateMethodInspection
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
     * @noinspection PhpUnusedPrivateMethodInspection
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
     * @noinspection PhpUnusedPrivateMethodInspection
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
     * @noinspection PhpUnusedPrivateMethodInspection
     */
    private function checkUpdates(): array
    {
        $messages   = [];
        $PBXVersion = PbxSettings::getValueByKey('PBXVersion');

        $client = new GuzzleHttp\Client();
        $res    = $client->request(
            'POST',
            'https://releases.mikopbx.com/releases/v1/mikopbx/ifNewReleaseAvailable',
            [
                'form_params' => [
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
     * @noinspection PhpUnusedPrivateMethodInspection
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
     * @noinspection PhpUnusedPrivateMethodInspection
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