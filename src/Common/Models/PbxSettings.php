<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
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
    public string $key;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $value;


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
            'NTPServer'                       =>  '0.pool.ntp.org'.PHP_EOL.'1.pool.ntp.org'.PHP_EOL,
            'VoicemailNotificationsEmail'     => 'admin@mycompany.com',
            'VoicemailExten'                  => '*001',
            'PBXLanguage'                     => 'en-en',
            'PBXInternalExtensionLength'      => '3',// Длина внутреннего номера
            'PBXRecordCalls'                  => '1',
            'PBXSplitAudioThread'             => '0',
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
            'PBXVersion'                      => '1',
            'WebAdminLogin'                   => 'admin',
            'WebAdminPassword'                => 'admin',
            'WebAdminLanguage'                => 'en',
            'SystemNotificationsEmail'        => 'admin@mycompany.com',
            'SendMetrics'                     => '1',


        ];
    }

    /**
     *  Returns default or saved values for all predefined keys if it exists on DB
     *
     * @return array
     */
    public static function getAllPbxSettings(): array
    {
        $arrOfDefaultValues = self::getDefaultArrayValues();
        foreach ($arrOfDefaultValues as $key => $record) {
            $arrOfDefaultValues[$key] = self::getValueByKey($key);
        }

        return $arrOfDefaultValues;
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

        $result = parent::findFirstByKey($key);
        if ($result === null || $result->value === null) {
            $arrOfDefaultValues = self::getDefaultArrayValues();
            if ( ! array_key_exists($key, $arrOfDefaultValues)) {
                return '';
            }

            return $arrOfDefaultValues[$key];
        }

        return $result->value;
    }

    public function initialize(): void
    {
        $this->setSource('m_PbxSettings');
        parent::initialize();
    }

    /**
     * Before PbxSettings entity save callback
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
        parent::afterSave();
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

    /**
     * Check if this changes influence to the pjsip.conf
     *
     * @return bool
     */
    public function itHasSipParametersChanges(): bool
    {
        switch ($this->key) {
            case 'SIPPort':
            case 'RTPPortFrom':
            case 'RTPPortTo':
            case 'SIPDefaultExpiry':
            case 'SIPMinExpiry':
            case 'SIPMaxExpiry':
            case 'PBXLanguage':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to the iax2.conf
     *
     * @return bool
     */
    public function itHasIaxParametersChanges(): bool
    {
        switch ($this->key) {
            case 'IAXPort':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to the manager.conf
     *
     * @return bool
     */
    public function itHasAMIParametersChanges(): bool
    {
        switch ($this->key) {
            case 'AMIPort':
            case 'AJAMPort':
            case 'AJAMPortTLS':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to the features.conf
     *
     * @return bool
     */
    public function itHasFeaturesSettingsChanges(): bool
    {
        switch ($this->key) {
            case 'PBXLanguage':
            case 'PBXInternalExtensionLength':
            case 'PBXRecordCalls':
            case 'PBXCallParkingExt':
            case 'PBXCallParkingStartSlot':
            case 'PBXCallParkingEndSlot':
            case 'PBXFeatureAttendedTransfer':
            case 'PBXFeatureBlindTransfer':
            case 'PBXFeatureDigitTimeout':
            case 'PBXFeatureAtxferNoAnswerTimeout':
            case 'PBXFeaturePickupExten':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to the SSHd daemon
     *
     * @return bool
     */
    public function itHasSSHParametersChanges(): bool
    {
        switch ($this->key) {
            case 'SSHPort':
            case 'SSHPassword':
            case 'SSHAuthorizedKeys':
            case 'SSHRsaKey':
            case 'SSHDssKey':
            case 'SSHecdsaKey':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to the Nginx daemon
     *
     * @return bool
     */
    public function itHasWebParametersChanges(): bool
    {
        switch ($this->key) {
            case 'WEBPort':
            case 'WEBHTTPSPort':
            case 'WEBHTTPSPublicKey':
            case 'WEBHTTPSPrivateKey':
            case 'RedirectToHttps':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to the Crond daemon
     *
     * @return bool
     */
    public function itHasCronParametersChanges(): bool
    {
        switch ($this->key) {
            case 'RestartEveryNight':
                return true;
            default:
                return false;
        }
    }

    /**
     *  Check if this changes influence to the extensions.conf
     *
     * @return bool
     */
    public function itHasDialplanParametersChanges(): bool
    {
        switch ($this->key) {
            case 'PBXLanguage':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to the voicemail.conf
     *
     * @return bool
     */
    public function itHasVoiceMailParametersChanges(): bool
    {
        switch ($this->key) {
            case 'MailTplVoicemailSubject':
            case 'MailTplVoicemailBody':
            case 'MailSMTPSenderAddress':
            case 'MailSMTPUsername':
            case 'PBXTimezone':
            case 'VoicemailNotificationsEmail':
            case 'SystemNotificationsEmail':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to translations
     *
     * @return bool
     */
    public function itHasVisualLanguageSettings(): bool
    {
        switch ($this->key) {
            case 'SSHLanguage':
            case 'WebAdminLanguage':
            return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to timezone and logs
     *
     * @return bool
     */
    public function itHasTimeZoneSettings(): bool
    {
        switch ($this->key) {
            case 'PBXTimezone':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to NTP daemon settings
     *
     * @return bool
     */
    public function itHasNTPSettings(): bool
    {
        switch ($this->key) {
            case 'PBXManualTimeSettings':
            case 'NTPServer':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to licensing
     *
     * @return bool
     */
    public function itHasLicenseSettings(): bool
    {
        switch ($this->key) {
            case 'PBXLicense':
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if this changes influence to call recording
     *
     * @return bool
     */
    public function itHasCallRecordSettings(): bool
    {
        switch ($this->key) {
            case 'PBXRecordCalls':
            case 'PBXSplitAudioThread':
                return true;
            default:
                return false;
        }
    }



}