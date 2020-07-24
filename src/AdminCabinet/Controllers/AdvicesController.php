<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Models\{NetworkFilters, PbxSettings};
use SimpleXMLElement;

/**
 * @property \MikoPBX\Service\License license
 */
class AdvicesController extends BaseController
{

    /**
     * Вызывается через AJAX периодически из веб интервейса,
     * формирует список советов для администратора PBX о неправильных настройках
     */
    public function getAdvicesAction(): void
    {
        $arrMessages     = [[]];
        $arrAdvicesTypes = [
            ['type' => 'checkPasswords', 'cacheTime' => 15],
            ['type' => 'checkFirewalls', 'cacheTime' => 15],
            ['type' => 'checkStorage', 'cacheTime' => 120],
            ['type' => 'checkUpdates', 'cacheTime' => 3600],
            ['type' => 'checkRegistration', 'cacheTime' => 86400],
        ];
        $language        = $this->getSessionData('WebAdminLanguage');
        $roSession       = $this->sessionRO;

        foreach ($arrAdvicesTypes as $adviceType) {
            $currentAdvice = $adviceType['type'];
            if ($roSession !== null && array_key_exists($currentAdvice, $roSession)) {
                $oldResult = json_decode($roSession[$currentAdvice], true);
                if ($language === $oldResult['LastLanguage']
                    && (time() - $oldResult['LastTimeStamp'] < $adviceType['cacheTime'])) {
                    $arrMessages[] = $oldResult['LastMessage'];
                    continue;
                }
            }
            $newResult = $this->$currentAdvice();
            if ( ! empty($newResult)) {
                $arrMessages[] = $newResult;
            }
            $this->session->set(
                $currentAdvice,
                json_encode(
                    [
                        'LastLanguage'  => $language,
                        'LastMessage'   => $newResult,
                        'LastTimeStamp' => time(),
                    ],
                    JSON_THROW_ON_ERROR
                )
            );
        }
        $this->view->success = true;
        $result              = [];
        foreach ($arrMessages as $message) {
            foreach ($message as $key => $value) {
                if ( ! empty($value)) {
                    $result[$key][] = $value;
                }
            }
        }
        $this->view->message = $result;
    }

    /**
     * Проверка установлены ли корректно пароли
     *
     * @return array
     */
    private function checkPasswords(): array
    {
        $messages           = [];
        $arrOfDefaultValues = PbxSettings::getDefaultArrayValues();
        if ($arrOfDefaultValues['WebAdminPassword']
            === PbxSettings::getValueByKey('WebAdminPassword')) {
            $messages['warning'] = $this->translation->_(
                'adv_YouUseDefaultWebPassword',
                ['url' => $this->url->get('general-settings/modify/#/passwords')]
            );
        }
        if ($arrOfDefaultValues['SSHPassword']
            === PbxSettings::getValueByKey('SSHPassword')) {
            $messages['warning'] = $this->translation->_(
                'adv_YouUseDefaultSSHPassword',
                ['url' => $this->url->get('general-settings/modify/#/ssh')]
            );
        }

        return $messages ?? [];
    }

    /**
     * Проверка включен ли Firewall
     *
     * @return array
     */
    private function checkFirewalls(): array
    {
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

        return $messages ?? [];
    }

    /**
     * Проверка подключен ли диск для хранения данных
     *
     * @return array
     */
    private function checkStorage(): array
    {
        if ( ! is_array($_COOKIE) || ! array_key_exists(session_name(), $_COOKIE)) {
            return [];
        }

        $WEBPort = PbxSettings::getValueByKey('WEBPort');
        $url     = "http://127.0.0.1:{$WEBPort}/pbxcore/api/storage/list";
        $ch      = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . $_COOKIE[session_name()]);
        $output = curl_exec($ch);
        curl_close($ch);
        $storageList = json_decode($output, false);
        if ($storageList !== null && property_exists($storageList, 'data')) {
            $storageDiskMounted = false;
            $disks              = $storageList->data;
            if ( ! is_array($disks)) {
                $disks = [$disks];
            }
            foreach ($disks as $disk) {
                if (property_exists($disk, 'mounted')
                    && strpos($disk->mounted, '/storage/usbdisk') !== false) {
                    $storageDiskMounted = true;
                    if ($disk->free_space < 500) {
                        $messages['warning']
                            = $this->translation->_(
                            'adv_StorageDiskRunningOutOfFreeSpace',
                            ['free' => $disk->free_space]
                        );
                    }
                }
            }
            if ($storageDiskMounted === false) {
                $messages['error'] = $this->translation->_('adv_StorageDiskUnMounted');
            }
        }

        return $messages ?? [];
    }

    /**
     * Проверка наличия обновлений
     *
     * @return array
     */
    private
    function checkUpdates(): array
    {
        $PBXVersion = $this->getSessionData('PBXVersion');

        $url = 'https://update.askozia.ru/';
        $ch  = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt(
            $ch,
            CURLOPT_POSTFIELDS,
            "TYPE=FIRMWAREGETNEWS&PBXVER={$PBXVersion}"
        );

        $output = curl_exec($ch);
        curl_close($ch);
        $answer = json_decode($output, false);
        if ($answer !== null && $answer->newVersionAvailable === true) {
            $messages['info'] = $this->translation->_(
                'adv_AvailableNewVersionPBX',
                [
                    'url' => $this->url->get('update/index/'),
                    'ver' => $answer->version,
                ]
            );
        }

        return $messages ?? [];
    }

    /**
     * Проверка зарегистрирована ли копия Askozia
     *
     */
    private
    function checkRegistration(): array
    {
        $licKey = PbxSettings::getValueByKey('PBXLicense');
        if ( ! empty($licKey)) {
            $checkBaseFeature = $this->license->featureAvailable(33);
            if ($checkBaseFeature['success'] === false) {
                if ($this->language === 'ru') {
                    $url = 'https://wiki.mikopbx.com/licensing#faq_chavo';
                } else {
                    $url = "https://wiki.mikopbx.com/{$this->language}:licensing#faq_chavo";
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

        return $messages ?? [];
    }
}