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

namespace MikoPBX\Common\Models;

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class PbxSettings
 *
 * @method static mixed findFirstByKey(string $string)
 *
 * @package MikoPBX\Common\Models
 */
class PbxSettings extends ModelsBase
{

    /**
     * @Primary
     * @Column(type="string", nullable=false)
     */
    public string $key = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $value = null;

    /**
     *  Returns default or saved values for all predefined keys if it exists on DB
     *
     * @return array
     */
    public static function getAllPbxSettings(): array
    {
        $arrayOfSettings = self::getDefaultArrayValues();
        $parameters      = [
            'cache' => [
                'key'      => ModelsBase::makeCacheKey(PbxSettings::class, 'getAllPbxSettings'),
                'lifetime' => 3600,
            ],
        ];
        $currentSettings = parent::find($parameters);

        foreach ($currentSettings as $record) {
            if (isset($record->value)) {
                $arrayOfSettings[$record->key] = $record->value;
            }
        }

        return $arrayOfSettings;
    }

    /**
     * Prepares default values for PbxSettings keys
     *
     * @return array default values
     */
    public static function getDefaultArrayValues(): array
    {
        return [
            'Name'                            => 'PBX system',
            'VirtualHardwareType'             => 'REAL',//VMWARE,HYPERV,AWS,AZURE
            'Description'                     => '',
            'RestartEveryNight'               => '0',
            'SIPPort'                         => '5060',
            'SIPDefaultExpiry'                => '120',
            'SIPMinExpiry'                    => '60',
            'SIPMaxExpiry'                    => '3600',
            'RTPPortFrom'                     => '10000',
            'RTPPortTo'                       => '10200',
            'IAXPort'                         => '4569',
            'AMIEnabled'                      => '1',
            'AMIPort'                         => '5038',
            'AJAMEnabled'                     => '1',
            'AJAMPort'                        => '8088',
            'AJAMPortTLS'                     => '8089',
            'SSHPort'                         => '22',
            'SSHPassword'                     => 'admin',
            'SSHRsaKey'                       => '',
            'SSHDssKey'                       => '',
            'SSHAuthorizedKeys'               => '',
            'SSHecdsaKey'                     => '',
            'SSHLanguage'                     => 'en',
            'WEBPort'                         => '80',
            'WEBHTTPSPort'                    => '443',
            'WEBHTTPSPublicKey'               => '',
            'WEBHTTPSPrivateKey'              => '',
            'RedirectToHttps'                 => '0',
            'MailSMTPUseTLS'                  => '0',
            'MailSMTPCertCheck'               => '0',
            'MailSMTPHost'                    => '',
            'MailSMTPPort'                    => '25',
            'MailSMTPUsername'                => '',
            'MailSMTPPassword'                => '',
            'MailSMTPFromUsername'            => 'PBX',
            'MailSMTPSenderAddress'           => '',
            'MailEnableNotifications'         => '0',
            'MailTplMissedCallSubject'        => 'You have missing call from <MailSMTPSenderAddress>',
            'MailTplMissedCallBody'           => 'You have missed calls (NOTIFICATION_MISSEDCAUSE) from <NOTIFICATION_CALLERID> at <NOTIFICATION_DATE>',
            'MailTplMissedCallFooter'         => '',
            'MailTplVoicemailSubject'         => 'VoiceMail from PBX',
            'MailTplVoicemailBody'            => 'See attach',
            'MailTplVoicemailFooter'          => '',
            'NTPServer'                       => '0.pool.ntp.org' . PHP_EOL . '1.pool.ntp.org' . PHP_EOL,
            'VoicemailNotificationsEmail'     => 'admin@mycompany.com',
            'VoicemailExten'                  => '*001',
            'PBXLanguage'                     => 'en-en',
            'PBXInternalExtensionLength'      => '3',// Длина внутреннего номера
            'PBXRecordCalls'                  => '1',
            'PBXSplitAudioThread'             => '0',
            'PBXRecordAnnouncementIn'         => '',
            'PBXRecordAnnouncementOut'        => '',
            'PBXCallParkingExt'               => '800',
            'PBXCallParkingStartSlot'         => '801',
            'PBXCallParkingEndSlot'           => '820',
            'PBXFeatureAttendedTransfer'      => '##',
            'PBXFeatureBlindTransfer'         => '**',
            'PBXFeaturePickupExten'           => '*8',
            'PBXFeatureDigitTimeout'          => '2500',
            'PBXFeatureAtxferNoAnswerTimeout' => '45',
            'PBXFeatureTransferDigitTimeout'  => '3',
            'PBXFirewallEnabled'              => '0',
            'PBXFail2BanEnabled'              => '0',
            'PBXTimezone'                     => 'Europe/Moscow',
            'PBXVersion'                      => '2020.1.1',
            'PBXAllowGuestCalls'              => '0',
            'WebAdminLogin'                   => 'admin',
            'WebAdminPassword'                => 'admin',
            'WebAdminLanguage'                => 'en',
            'SystemNotificationsEmail'        => 'admin@mycompany.com',
            'SendMetrics'                     => '1',

        ];
    }

    /**
     * Returns default or saved value for key if it exists on DB
     *
     * @param $key string value key
     *
     * @return string
     */
    public static function getValueByKey(string $key): string
    {
        $parameters      = [
            'cache' => [
                'key'      => ModelsBase::makeCacheKey(PbxSettings::class, 'getValueByKey'),
                'lifetime' => 3600,
            ],
        ];
        $currentSettings = parent::find($parameters);

        foreach ($currentSettings as $record) {
            if ($record->key === $key
                && isset($record->value)
            ) {
                return $record->value;
            }
        }

        $arrOfDefaultValues = self::getDefaultArrayValues();
        if (array_key_exists($key, $arrOfDefaultValues)) {
            return $arrOfDefaultValues[$key];
        }

        return '';
    }

    public function initialize(): void
    {
        $this->setSource('m_PbxSettings');
        parent::initialize();
    }

    /**
     * Before PbxSettings entity save callback
     *
     * @return bool
     */
    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'key',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisKeyMustBeUniqueForPbxSettingsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * After PbxSettings entity save callback
     */
    public function afterSave(): void
    {
        if ($this->itHasFirewallParametersChanges()) {
            FirewallRules::updatePorts($this);
        }
    }

    /**
     *  Check if this changes influence to the iptables daemon
     *
     * @return bool
     */
    public function itHasFirewallParametersChanges(): bool
    {
        switch ($this->key) {
            case 'SIPPort':
            case 'RTPPortFrom':
            case 'RTPPortTo':
            case 'IAXPort':
            case 'AMIPort':
            case 'AJAMPort':
            case 'AJAMPortTLS':
            case 'WEBPort':
            case 'WEBHTTPSPort':
            case 'SSHPort':
            case 'PBXFirewallEnabled':
            case 'PBXFail2BanEnabled':
                return true;
            default:
                if (strpos($this->key, 'FirewallSettings') !== false) {
                    return true;
                }
        }

        return false;
    }

}