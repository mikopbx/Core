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

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\AdminCabinet\Forms\Elements\SemanticUIDropdown;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;

/**
 * Class MailSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class MailSettingsEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Add hidden fields for OAuth2 auth type radio buttons
        $this->add(new Hidden('MailSMTPAuthType', ['value' => $options['MailSMTPAuthType'] ?? 'password']));

        foreach ($options as $key => $value) {
            switch ($key) {
                case PbxSettings::MAIL_ENABLE_NOTIFICATIONS:
                case PbxSettings::MAIL_SMTP_CERT_CHECK:
                case PbxSettings::SEND_MISSED_CALL_NOTIFICATIONS:
                case PbxSettings::SEND_VOICEMAIL_NOTIFICATIONS:
                case PbxSettings::SEND_LOGIN_NOTIFICATIONS:
                case PbxSettings::SEND_SYSTEM_NOTIFICATIONS:
                    $this->addCheckBox($key, intval($value) === 1);
                    break;

                case PbxSettings::MAIL_SMTP_USE_TLS:
                    // Convert old boolean values to new format for backward compatibility
                    $encryptionValue = $value;
                    if ($value === '1') {
                        $encryptionValue = 'tls';
                    } elseif ($value === '0' || $value === '') {
                        $encryptionValue = 'none';
                    }

                    // Use dropdown for encryption type selection
                    $this->addSemanticUIDropdown(
                        $key,
                        [
                            'none' => $this->translation->_('ms_EncryptionNone'),
                            'tls' => $this->translation->_('ms_EncryptionSTARTTLS'),
                            'ssl' => $this->translation->_('ms_EncryptionSSLTLS'),
                        ],
                        $encryptionValue,
                        ['clearable' => false]  // not clearable
                    );
                    break;

                case PbxSettings::MAIL_OAUTH2_PROVIDER:
                    // Use SemanticUIDropdown for OAuth2 provider selection
                    $this->addSemanticUIDropdown(
                        $key,
                        [
                            'google' => 'Google/Gmail',
                            'microsoft' => 'Microsoft/Outlook',
                            'yandex' => 'Yandex Mail',
                        ],
                        $value,
                        [
                            'clearable' => true,
                            'forceSelection' => false,
                            'placeholder' => $this->translation->_('ms_SelectOAuth2Provider')
                        ]
                    );
                    break;

                case PbxSettings::MAIL_OAUTH2_CLIENT_ID:
                    $this->add(
                        new Text(
                            $key,
                            [
                                'value' => $value,
                                'placeholder' => $this->translation->_('ms_OAuth2ClientIdPlaceholder')
                            ]
                        )
                    );
                    break;

                case PbxSettings::MAIL_OAUTH2_CLIENT_SECRET:
                    $this->add(
                        new Password(
                            $key,
                            [
                                'value' => $value,
                                'placeholder' => $this->translation->_('ms_OAuth2ClientSecretPlaceholder')
                            ]
                        )
                    );
                    break;

                case PbxSettings::MAIL_SMTP_PASSWORD:
                    $this->add(
                        new Password(
                            $key,
                            [
                                'value' => $value,
                            ]
                        )
                    );
                    break;

                default:
                    $this->add(
                        new Text(
                            $key,
                            [
                                'value' => $value,
                            ]
                        )
                    );
            }
        }
    }
}
