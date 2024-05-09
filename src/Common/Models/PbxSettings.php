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
        $parameters = [
            'cache' => [
                'key' => ModelsBase::makeCacheKey(PbxSettings::class, 'getAllPbxSettings'),
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
            PbxSettingsConstants::PBX_NAME => 'PBX system',
            PbxSettingsConstants::VIRTUAL_HARDWARE_TYPE => 'BARE METAL',
            PbxSettingsConstants::PBX_DESCRIPTION => '',
            PbxSettingsConstants::RESTART_EVERY_NIGHT => '0',
            PbxSettingsConstants::SIP_PORT => '5060',
            PbxSettingsConstants::EXTERNAL_SIP_PORT => '5060',
            PbxSettingsConstants::TLS_PORT => '5061',
            PbxSettingsConstants::EXTERNAL_TLS_PORT => '5061',
            PbxSettingsConstants::SIP_DEFAULT_EXPIRY => '120',
            PbxSettingsConstants::SIP_MIN_EXPIRY => '60',
            PbxSettingsConstants::SIP_MAX_EXPIRY => '3600',
            PbxSettingsConstants::RTP_PORT_FROM => '10000',
            PbxSettingsConstants::RTP_PORT_TO => '10200',
            PbxSettingsConstants::RTP_STUN_SERVER => '',
            PbxSettingsConstants::USE_WEB_RTC => '0',
            PbxSettingsConstants::IAX_PORT => '4569',
            PbxSettingsConstants::AMI_ENABLED => '1',
            PbxSettingsConstants::AMI_PORT => '5038',
            PbxSettingsConstants::AJAM_ENABLED => '1',
            PbxSettingsConstants::AJAM_PORT => '8088',
            PbxSettingsConstants::AJAM_PORT_TLS => '8089',
            PbxSettingsConstants::SSH_PORT => '22',
            PbxSettingsConstants::SSH_LOGIN => 'root',
            PbxSettingsConstants::SSH_PASSWORD => 'admin',
            PbxSettingsConstants::SSH_RSA_KEY => '',
            PbxSettingsConstants::SSH_DSS_KEY => '',
            PbxSettingsConstants::SSH_AUTHORIZED_KEYS => '',
            PbxSettingsConstants::SSH_ECDSA_KEY => '',
            PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD => '0',
            PbxSettingsConstants::SSH_LANGUAGE => 'en',
            PbxSettingsConstants::WEB_PORT => '80',
            PbxSettingsConstants::WEB_HTTPS_PORT => '443',
            PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY => '',
            PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY => '',
            PbxSettingsConstants::REDIRECT_TO_HTTPS => '0',
            PbxSettingsConstants::MAIL_SMTP_USE_TLS => '0',
            PbxSettingsConstants::MAIL_SMTP_CERT_CHECK => '0',
            PbxSettingsConstants::MAIL_SMTP_HOST => '',
            PbxSettingsConstants::MAIL_SMTP_PORT => '25',
            PbxSettingsConstants::MAIL_SMTP_USERNAME => '',
            PbxSettingsConstants::MAIL_SMTP_PASSWORD => '',
            PbxSettingsConstants::MAIL_SMTP_FROM_USERNAME => 'PBX',
            PbxSettingsConstants::MAIL_SMTP_SENDER_ADDRESS => '',
            PbxSettingsConstants::MAIL_ENABLE_NOTIFICATIONS => '0',
            PbxSettingsConstants::MAIL_TPL_MISSED_CALL_SUBJECT => 'You have missing call from <MailSMTPSenderAddress>',
            PbxSettingsConstants::MAIL_TPL_MISSED_CALL_BODY => 'You have missed calls (NOTIFICATION_MISSEDCAUSE) from <NOTIFICATION_CALLERID> at <NOTIFICATION_DATE>',
            PbxSettingsConstants::MAIL_TPL_MISSED_CALL_FOOTER => '',
            PbxSettingsConstants::MAIL_TPL_VOICEMAIL_SUBJECT => 'VoiceMail from PBX',
            PbxSettingsConstants::MAIL_TPL_VOICEMAIL_BODY => 'See attach',
            PbxSettingsConstants::MAIL_TPL_VOICEMAIL_FOOTER => '',
            PbxSettingsConstants::NTP_SERVER => '0.pool.ntp.org' . PHP_EOL . '1.pool.ntp.org' . PHP_EOL,
            PbxSettingsConstants::VOICEMAIL_NOTIFICATIONS_EMAIL => 'admin@mycompany.com',
            PbxSettingsConstants::VOICEMAIL_EXTENSION => '*001',
            PbxSettingsConstants::PBX_LANGUAGE => 'en-en',
            PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH => '3',
            PbxSettingsConstants::PBX_RECORD_CALLS => '1',
            PbxSettingsConstants::PBX_RECORD_CALLS_INNER => '1',
            PbxSettingsConstants::PBX_SPLIT_AUDIO_THREAD => '0',
            PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_IN => '',
            PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_OUT => '',
            PbxSettingsConstants::PBX_RECORD_SAVE_PERIOD => '',
            PbxSettingsConstants::PBX_CALL_PARKING_EXT => '800',
            PbxSettingsConstants::PBX_CALL_PARKING_FEATURE => '*2',
            PbxSettingsConstants::PBX_CALL_PARKING_DURATION => '50',
            PbxSettingsConstants::PBX_CALL_PARKING_START_SLOT => '801',
            PbxSettingsConstants::PBX_CALL_PARKING_END_SLOT => '820',
            PbxSettingsConstants::PBX_FEATURE_ATTENDED_TRANSFER => '##',
            PbxSettingsConstants::PBX_FEATURE_BLIND_TRANSFER => '**',
            PbxSettingsConstants::PBX_FEATURE_PICKUP_EXTEN => '*8',
            PbxSettingsConstants::PBX_FEATURE_DIGIT_TIMEOUT => '2500',
            PbxSettingsConstants::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT => '45',
            PbxSettingsConstants::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT => '3',
            PbxSettingsConstants::PBX_FIREWALL_ENABLED => '0',
            PbxSettingsConstants::PBX_FAIL2BAN_ENABLED => '0',
            PbxSettingsConstants::PBX_TIMEZONE => 'Europe/Moscow',
            PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS=>'0',
            PbxSettingsConstants::PBX_VERSION => '2020.1.1',
            PbxSettingsConstants::PBX_ALLOW_GUEST_CALLS => '0',
            PbxSettingsConstants::WEB_ADMIN_LOGIN => 'admin',
            PbxSettingsConstants::WEB_ADMIN_PASSWORD => 'admin',
            PbxSettingsConstants::WEB_ADMIN_LANGUAGE => 'en',
            PbxSettingsConstants::SYSTEM_NOTIFICATIONS_EMAIL => '',
            PbxSettingsConstants::SYSTEM_EMAIL_FOR_MISSED => '',
            PbxSettingsConstants::SEND_METRICS => '1',
            PbxSettingsConstants::CLOUD_INSTANCE_ID => '',
            PbxSettingsConstants::DISABLE_ALL_MODULES=> '0',
            PbxSettingsConstants::PBX_LICENSE=>'',
            PbxSettingsConstants::ENABLE_USE_NAT=> '0',
            PbxSettingsConstants::AUTO_UPDATE_EXTERNAL_IP=> '0',
            PbxSettingsConstants::EXTERNAL_SIP_HOST_NAME=>'',
            PbxSettingsConstants::EXTERNAL_SIP_IP_ADDR=>'',
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
            $parameters = [
                'cache' => [
                    'key' => ModelsBase::makeCacheKey(self::class, 'getValueByKey'),
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
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleException($e);
        }

        return '';
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

    /**
     * Set value for a key
     * @param $key string settings key
     * @param $value string value
     * @param $messages array error messages
     * @return bool Whether the save was successful or not.
     */
    public static function setValue(string $key, string $value, array &$messages=[]): bool
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
        $result=$record->save();
        if (!$result) {
            $messages[] = $record->getMessages();
        }
        return $result;
    }
}