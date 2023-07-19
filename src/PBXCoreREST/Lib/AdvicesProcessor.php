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

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\Common\Models\{AsteriskManagerUsers, Extensions, NetworkFilters, PbxSettings, Sip, Users};
use GuzzleHttp;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use SimpleXMLElement;
use MikoPBX\Service\Main;

/**
 * Class AdvicesProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 * @property \MikoPBX\Common\Providers\LicenseProvider license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config config
 *
 */
class AdvicesProcessor extends Injectable
{
    public const ARR_ADVICE_TYPES = [
        ['type' => 'isConnected', 'cacheTime' => 60],
        ['type' => 'checkCorruptedFiles', 'cacheTime' => 600],
        ['type' => 'checkPasswords', 'cacheTime' => 86400],
        ['type' => 'checkFirewalls', 'cacheTime' => 86400],
        ['type' => 'checkStorage', 'cacheTime' => 600],
        ['type' => 'checkUpdates', 'cacheTime' => 3600],
        ['type' => 'checkRegistration', 'cacheTime' => 86400],
    ];

    /**
     * Processes the Advices request.
     *
     * @param array $request The request data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $action = $request['action'];
        if ('getList' === $action) {
            $proc = new self();
            $res = $proc->getAdvicesAction();
        } else {
            $res->messages[] = "Unknown action - {$action} in advicesCallBack";
        }
        $res->function = $action;
        return $res;
    }

    /**
     * Generates a list of notifications about the system, firewall, passwords, and wrong settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function getAdvicesAction(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        try {
            $arrMessages = [];

            $managedCache = $this->getDI()->getShared(ManagedCacheProvider::SERVICE_NAME);
            $language = PbxSettings::getValueByKey('WebAdminLanguage');

            foreach (self::ARR_ADVICE_TYPES as $adviceType) {
                $currentAdvice = $adviceType['type'];
                $cacheTime = $adviceType['cacheTime'];
                $cacheKey = self::getCacheKey($currentAdvice);
                if ($managedCache->has($cacheKey)) {
                    $oldResult = json_decode($managedCache->get($cacheKey), true, 512, JSON_THROW_ON_ERROR);
                    if ($language === $oldResult['LastLanguage']) {
                        $arrMessages[] = $oldResult['LastMessage'];
                        continue;
                    }
                }
                $newResult = $this->$currentAdvice();
                if (!empty($newResult)) {
                    $arrMessages[] = $newResult;
                }
                $managedCache->set(
                    $cacheKey,
                    json_encode([
                        'LastLanguage' => $language,
                        'LastMessage' => $newResult,
                    ], JSON_THROW_ON_ERROR),
                    $cacheTime
                );
            }
            $res->success = true;
            $result = [];
            foreach ($arrMessages as $message) {
                foreach ($message as $key => $value) {
                    if (is_array($value)) {
                        if (!isset($result[$key])) {
                            $result[$key] = [];
                        }
                        $result[$key] = array_merge($result[$key], $value);
                    } elseif (!empty($value)) {
                        $result[$key][] = $value;
                    }
                }
            }
            $res->data['advices'] = $result;

        } catch (\Throwable $e) {
            $res->success = false;
            $res->messages[] = $e->getMessage();
        }
        return $res;
    }

    /**
     * Prepares array of system passwords with representation to check password quality.
     *
     * @param array $fields
     * @return void
     */
    public function preparePasswordFields(array &$fields): array
    {
        $messages = [
            'warning' => [],
            'needUpdate' => []
        ];

        $arrOfDefaultValues = PbxSettings::getDefaultArrayValues();
        $fields = [
            'WebAdminPassword' => [
                'urlTemplate' => 'general-settings/modify/#/passwords',
                'type' => 'adv_WebPasswordFieldName',
                'value' => PbxSettings::getValueByKey('WebAdminPassword')
            ],
            'SSHPassword' => [
                'urlTemplate' => 'general-settings/modify/#/ssh',
                'type' => 'adv_SshPasswordFieldName',
                'value' => PbxSettings::getValueByKey('SSHPassword')
            ],
        ];
        if ($arrOfDefaultValues['WebAdminPassword'] === PbxSettings::getValueByKey('WebAdminPassword')) {
            $messages['warning'][] = $this->translation->_(
                'adv_YouUseDefaultWebPassword',
                ['url' => $this->url->get('general-settings/modify/#/passwords')]
            );
            unset($fields['WebAdminPassword']);
            $messages['needUpdate'][] = 'WebAdminPassword';
        }
        if ($arrOfDefaultValues['SSHPassword'] === PbxSettings::getValueByKey('SSHPassword')) {
            $messages['warning'][] = $this->translation->_(
                'adv_YouUseDefaultSSHPassword',
                ['url' => $this->url->get('general-settings/modify/#/ssh')]
            );
            unset($fields['SSHPassword']);
            $messages['needUpdate'][] = 'SSHPassword';
        } elseif (PbxSettings::getValueByKey('SSHPasswordHash') !== md5_file('/etc/passwd')) {
            $messages['warning'][] = $this->translation->_(
                'adv_SSHPPasswordCorrupt',
                ['url' => $this->url->get('general-settings/modify/#/ssh')]
            );
        }
        return $messages;
    }

    /**
     * Prepares array of ami passwords with representation to check password quality.
     * @param array $fields
     * @return void
     */
    public function prepareAmiFields(array &$fields): void
    {
        $amiUsersData = AsteriskManagerUsers::find([
                'columns' => 'id, username, secret']
        );
        foreach ($amiUsersData as $amiUser) {
            $fields[$amiUser->username] = [
                'urlTemplate' => 'asterisk-managers/modify/' . $amiUser->id,
                'type' => 'adv_AmiPasswordFieldName',
                'value' => $amiUser->secret
            ];
        }
    }

    /**
     * Prepares array of sip passwords with representation to check password quality.
     * @param array $fields
     * @return void
     */
    public function prepareSipFields(array &$fields): void
    {
        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = "1"',
            'columns' => [
                'id' => 'Extensions.id',
                'username' => 'Extensions.callerid',
                'number' => 'Extensions.number',
                'secret' => 'Sip.secret',
            ],
            'order' => 'number',
            'joins' => [
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'INNER',
                ],
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid',
                    2 => 'Users',
                    3 => 'INNER',
                ],
            ],
        ];
        $queryResult = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery()->execute();

        foreach ($queryResult as $user) {
            $key = "{$user->username} <{$user->number}>";
            $fields[$key] = [
                'urlTemplate' => 'extensions/modify/' . $user->id,
                'type' => 'adv_UserPasswordFieldName',
                'value' => $user->secret
            ];
        }
    }

    /**
     * Check the quality of passwords.
     *
     * @return array An array containing warning and needUpdate messages.
     *
     * @noinspection PhpUnusedPrivateMethodInspection
     */
    private function checkPasswords(): array
    {
        $fields = [];

        // WebAdminPassword and SSHPassword
        $messages = $this->preparePasswordFields($fields);

        // SIP passwords
        $this->prepareSipFields($fields);

        // AMI Passwords
        $this->prepareAmiFields($fields);

        $cloudInstanceId = PbxSettings::getValueByKey('CloudInstanceId');
        foreach ($fields as $key => $value) {
            if ($cloudInstanceId !== $value['value'] && !Util::isSimplePassword($value['value'])) {
                continue;
            }

            if (in_array($key, ['WebAdminPassword', 'SSHPassword'], true)) {
                $messages['needUpdate'][] = $key;
            }
            $messages['warning'][] = $this->translation->_(
                'adv_isSimplePassword',
                [
                    'type' => $this->translation->_($value['type'], ['record' => $key]),
                    'url' => $this->url->get($value['urlTemplate']),
                ]
            );
        }

        return $messages;
    }

    /**
     * Check for corrupted files.
     *
     * @return array An array containing warning messages.
     */
    private function checkCorruptedFiles(): array
    {
        $messages = [];
        $files = Main::checkForCorruptedFiles();
        if (count($files) !== 0) {
            $messages['error'] =  $this->translation->_('adv_SystemBrokenComment', ['url' => '']);
        }

        return $messages;
    }

    /**
     * Check the firewall status.
     *
     * @return array An array containing warning messages.
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
     * Check storage status.
     *
     * @return array An array containing warning or error messages.
     *
     * @noinspection PhpUnusedPrivateMethodInspection
     */
    private function checkStorage(): array
    {
        $messages = [];
        $st = new Storage();
        $storageDiskMounted = false;
        $disks = $st->getAllHdd();
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
     * Check for a new version PBX
     *
     * @return array An array containing information messages about available updates.
     *
     * @noinspection PhpUnusedPrivateMethodInspection
     */
    private function checkUpdates(): array
    {
        $messages = [];
        $PBXVersion = PbxSettings::getValueByKey('PBXVersion');

        $client = new GuzzleHttp\Client();
        try {
            $res = $client->request(
                'POST',
                'https://releases.mikopbx.com/releases/v1/mikopbx/ifNewReleaseAvailable',
                [
                    'form_params' => [
                        'PBXVER' => $PBXVersion,
                    ],
                    'timeout' => 5,
                ]
            );
            $code = $res->getStatusCode();
        } catch (\Throwable $e) {
            $code = Response::INTERNAL_SERVER_ERROR;
            Util::sysLogMsg(static::class, $e->getMessage());
        }

        if ($code !== Response::OK) {
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
        $licKey = PbxSettings::getValueByKey('PBXLicense');
        if (!empty($licKey)) {
            $this->license->featureAvailable(33);
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
        $pathTimeout = Util::which('timeout');
        $pathCurl = Util::which('curl');
        $retCode = Processes::mwExec("$pathTimeout 2 $pathCurl 'https://www.google.com/'");
        if ($retCode !== 0) {
            $messages['warning'] = $this->translation->_('adv_ProblemWithInternetConnection');
        }
        return $messages;
    }

    /**
     * Prepares redis cache key for advice type
     * @param string $currentAdviceType current advice type
     * @return string cache key
     */
    public static function getCacheKey(string  $currentAdviceType): string{
        return 'AdvicesProcessor:getAdvicesAction:' . $currentAdviceType;
    }

    /**
     * Cleanup cache for all advice types after change dependent models and PBX settings
     * on the WorkerModelsEvents worker.
     * @return void
     */
    public static function cleanupCache(): void{

        $dataIndependentAdviceTypes = [
            'isConnected',
            'checkCorruptedFiles',
            'checkStorage',
            'checkUpdates',
            'checkRegistration'
        ];

        $di = Di::getDefault();
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        foreach (self::ARR_ADVICE_TYPES as $adviceType) {
            if (!in_array($adviceType['type'], $dataIndependentAdviceTypes)) {
                $cacheKey = self::getCacheKey($adviceType['type']);
                $managedCache->delete($cacheKey);
            }
        }
    }
}