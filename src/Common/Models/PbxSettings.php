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

namespace MikoPBX\Common\Models;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Di\Di;
use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class PbxSettings
 *
 * @method static mixed findFirstByKey(string $string)
 *
 * @package MikoPBX\Common\Models
 */
class PbxSettings extends ModelsBase
{
    use PbxSettingsConstants;
    /**
     * Key by which the value is stored
     *
     * @Primary
     * @Column(type="string", nullable=false)
     */
    public string $key = '';

    /**
     * Stored value
     *
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
        $redis = Di::GetDefault()->getShared(ManagedCacheProvider::SERVICE_NAME);
        $cacheKey = ModelsBase::makeCacheKey(PbxSettings::class, 'getAllPbxSettings');
        $currentSettings = $redis->get($cacheKey);
        if (empty($currentSettings)) {
            $currentSettings = parent::find();
            $redis->set($cacheKey, $currentSettings, 3600);
        }
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
            PbxSettings::PBX_NAME => 'PBX system',
            PbxSettings::VIRTUAL_HARDWARE_TYPE => 'BARE METAL',
            PbxSettings::PBX_DESCRIPTION => '',
            PbxSettings::RESTART_EVERY_NIGHT => '0',
            PbxSettings::SIP_PORT => '5060',
            PbxSettings::EXTERNAL_SIP_PORT => '5060',
            PbxSettings::TLS_PORT => '5061',
            PbxSettings::EXTERNAL_TLS_PORT => '5061',
            PbxSettings::SIP_DEFAULT_EXPIRY => '120',
            PbxSettings::SIP_MIN_EXPIRY => '60',
            PbxSettings::SIP_MAX_EXPIRY => '3600',
            PbxSettings::RTP_PORT_FROM => '10000',
            PbxSettings::RTP_PORT_TO => '10200',
            PbxSettings::RTP_STUN_SERVER => '',
            PbxSettings::USE_WEB_RTC => '0',
            PbxSettings::IAX_PORT => '4569',
            PbxSettings::AMI_ENABLED => '1',
            PbxSettings::AMI_PORT => '5038',
            PbxSettings::AJAM_ENABLED => '1',
            PbxSettings::AJAM_PORT => '8088',
            PbxSettings::AJAM_PORT_TLS => '8089',
            PbxSettings::SSH_PORT => '22',
            PbxSettings::SSH_LOGIN => 'root',
            PbxSettings::SSH_PASSWORD => 'admin',
            PbxSettings::SSH_RSA_KEY => '',
            PbxSettings::SSH_DSS_KEY => '',
            PbxSettings::SSH_AUTHORIZED_KEYS => '',
            PbxSettings::SSH_ECDSA_KEY => '',
            PbxSettings::SSH_DISABLE_SSH_PASSWORD => '0',
            PbxSettings::SSH_LANGUAGE => 'en',
            PbxSettings::WEB_PORT => '80',
            PbxSettings::WEB_HTTPS_PORT => '443',
            PbxSettings::WEB_HTTPS_PUBLIC_KEY => '',
            PbxSettings::WEB_HTTPS_PRIVATE_KEY => '',
            PbxSettings::REDIRECT_TO_HTTPS => '0',
            PbxSettings::MAIL_SMTP_USE_TLS => '0',
            PbxSettings::MAIL_SMTP_CERT_CHECK => '0',
            PbxSettings::MAIL_SMTP_HOST => '',
            PbxSettings::MAIL_SMTP_PORT => '25',
            PbxSettings::MAIL_SMTP_USERNAME => '',
            PbxSettings::MAIL_SMTP_PASSWORD => '',
            PbxSettings::MAIL_SMTP_FROM_USERNAME => 'PBX',
            PbxSettings::MAIL_SMTP_SENDER_ADDRESS => '',
            PbxSettings::MAIL_ENABLE_NOTIFICATIONS => '0',
            PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT => 'You have missing call from <MailSMTPSenderAddress>',
            PbxSettings::MAIL_TPL_MISSED_CALL_BODY => 'You have missed calls (NOTIFICATION_MISSEDCAUSE) from <NOTIFICATION_CALLERID> at <NOTIFICATION_DATE>',
            PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER => '',
            PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT => 'VoiceMail from PBX',
            PbxSettings::MAIL_TPL_VOICEMAIL_BODY => 'See attach',
            PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER => '',
            PbxSettings::NTP_SERVER => '0.pool.ntp.org' . PHP_EOL . '1.pool.ntp.org' . PHP_EOL,
            PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL => 'admin@mycompany.com',
            PbxSettings::VOICEMAIL_EXTENSION => '*001',
            PbxSettings::PBX_LANGUAGE => 'en-en',
            PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH => '3',
            PbxSettings::PBX_RECORD_CALLS => '1',
            PbxSettings::PBX_RECORD_CALLS_INNER => '1',
            PbxSettings::PBX_SPLIT_AUDIO_THREAD => '0',
            PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN => '',
            PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT => '',
            PbxSettings::PBX_RECORD_SAVE_PERIOD => '',
            PbxSettings::PBX_CALL_PARKING_EXT => '800',
            PbxSettings::PBX_CALL_PARKING_FEATURE => '*2',
            PbxSettings::PBX_CALL_PARKING_DURATION => '50',
            PbxSettings::PBX_CALL_PARKING_START_SLOT => '801',
            PbxSettings::PBX_CALL_PARKING_END_SLOT => '820',
            PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER => '##',
            PbxSettings::PBX_FEATURE_BLIND_TRANSFER => '**',
            PbxSettings::PBX_FEATURE_PICKUP_EXTEN => '*8',
            PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT => '2500',
            PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT => '45',
            PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT => '3',
            PbxSettings::PBX_FIREWALL_ENABLED => '0',
            PbxSettings::PBX_FAIL2BAN_ENABLED => '0',
            PbxSettings::PBX_TIMEZONE => 'Europe/Moscow',
            PbxSettings::PBX_MANUAL_TIME_SETTINGS => '0',
            PbxSettings::PBX_VERSION => '2020.1.1',
            PbxSettings::PBX_ALLOW_GUEST_CALLS => '0',
            PbxSettings::WEB_ADMIN_LOGIN => 'admin',
            PbxSettings::WEB_ADMIN_PASSWORD => 'admin',
            PbxSettings::WEB_ADMIN_LANGUAGE => 'en',
            PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL => '',
            PbxSettings::SYSTEM_EMAIL_FOR_MISSED => '',
            PbxSettings::SEND_METRICS => '1',
            PbxSettings::CLOUD_INSTANCE_ID => '',
            PbxSettings::DISABLE_ALL_MODULES => '0',
            PbxSettings::PBX_LICENSE => '',
            PbxSettings::ENABLE_USE_NAT => '0',
            PbxSettings::AUTO_UPDATE_EXTERNAL_IP => '0',
            PbxSettings::EXTERNAL_SIP_HOST_NAME => '',
            PbxSettings::EXTERNAL_SIP_IP_ADDR => '',
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
        try {
            $redis = Di::GetDefault()->getShared(ManagedCacheProvider::SERVICE_NAME);
            $cacheKey = ModelsBase::makeCacheKey(PbxSettings::class, 'getValueByKey');
            $currentSettings = $redis->get($cacheKey);
            if (empty($currentSettings)) {
                $currentSettings = parent::find();
                $redis->set($cacheKey, $currentSettings, 3600);
            }

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
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleException($e);
        }

        return '';
    }

    /**
     * Set value for a key
     * @param $key string settings key
     * @param $value string value
     * @param $messages array error messages
     * @return bool Whether the save was successful or not.
     */
    public static function setValue(string $key, string $value, array &$messages = []): bool
    {
        $record = self::findFirstByKey($key);
        if ($record === null) {
            $record = new self();
            $record->key = $key;
        }
        if (isset($record->value) && $record->value === $value) {
            return true;
        }
        $record->value = $value;
        $result = $record->save();
        if (!$result) {
            $messages[] = $record->getMessages();
        }
        return $result;
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_PbxSettings');
        parent::initialize();
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
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
}