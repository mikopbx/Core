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
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class GeneralSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class GeneralSettingsEditForm extends BaseForm
{
    public const string HIDDEN_PASSWORD = 'xxxxxxx';

    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        foreach ($options as $key => $value) {
            switch ($key) {
                case PbxSettings::PBX_RECORD_SAVE_PERIOD:
                case '***ALL HIDDEN ABOVE***':
                    $this->add(new Hidden($key, ['value' => $value]));
                    break;
                case PbxSettings::SIP_PORT:
                case PbxSettings::TLS_PORT:
                case PbxSettings::SIP_DEFAULT_EXPIRY:
                case PbxSettings::SIP_MIN_EXPIRY:
                case PbxSettings::SIP_MAX_EXPIRY:
                case PbxSettings::RTP_PORT_FROM:
                case PbxSettings::RTP_PORT_TO:
                case PbxSettings::IAX_PORT:
                case PbxSettings::AMI_PORT:
                case PbxSettings::AJAM_PORT:
                case PbxSettings::AJAM_PORT_TLS:
                case PbxSettings::SSH_PORT:
                case PbxSettings::WEB_PORT:
                case PbxSettings::WEB_HTTPS_PORT:
                case PbxSettings::PBX_CALL_PARKING_EXT:
                case PbxSettings::PBX_CALL_PARKING_START_SLOT:
                case PbxSettings::PBX_CALL_PARKING_END_SLOT:
                case PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT:
                case PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT:
                case '***ALL NUMBERIC ABOVE***':
                    $this->add(new Numeric($key, ['value' => $value, 'style'=>'width:130px;']));
                    break;
                case PbxSettings::SSH_PASSWORD:
                    $this->add(new Password($key, ['value' => self::HIDDEN_PASSWORD]));
                    $this->add(
                        new Password(
                            'SSHPasswordRepeat',
                            ['value' => self::HIDDEN_PASSWORD]
                        )
                    );
                    break;
                case PbxSettings::WEB_ADMIN_PASSWORD:
                    $this->add(new Password($key, ['value' => self::HIDDEN_PASSWORD]));
                    $this->add(
                        new Password(
                            'WebAdminPasswordRepeat',
                            ['value' => self::HIDDEN_PASSWORD]
                        )
                    );
                    break;
                case PbxSettings::PBX_DESCRIPTION:
                case PbxSettings::SSH_AUTHORIZED_KEYS:
                case PbxSettings::SSH_ECDSA_KEY:
                case PbxSettings::SSH_RSA_KEY:
                case PbxSettings::SSH_DSS_KEY:
                case PbxSettings::WEB_HTTPS_PUBLIC_KEY:
                case PbxSettings::WEB_HTTPS_PRIVATE_KEY:
                case '***ALL TEXTAREA ABOVE***':
                    $this->addTextArea($key, $value??'', 65);
                    break;
                case PbxSettings::PBX_LANGUAGE:
                    $language = new Select(
                        $key,
                        [
                            'en-en' => $this->translation->_('ex_English'),
                            'en-gb' => $this->translation->_('ex_EnglishUK'),
                            'ru-ru' => $this->translation->_('ex_Russian'),
                            'de-de' => $this->translation->_('ex_Deutsch'),
                            'da-dk' => $this->translation->_('ex_Danish'),
                            'es-es' => $this->translation->_('ex_Spanish'),
                            'gr-gr' => $this->translation->_('ex_Greek'),
                            'fr-ca' => $this->translation->_('ex_French'),
                            'it-it' => $this->translation->_('ex_Italian'),
                            'ja-jp' => $this->translation->_('ex_Japanese'),
                            'nl-nl' => $this->translation->_('ex_Dutch'),
                            'pl-pl' => $this->translation->_('ex_Polish'),
                            'pt-br' => $this->translation->_('ex_Portuguese'),
                            'sv-sv' => $this->translation->_('ex_Swedish'),
                            'cs-cs' => $this->translation->_('ex_Czech'),
                            'tr-tr' => $this->translation->_('ex_Turkish'),
                        ]
                        , [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'value' => $value,
                            'useEmpty' => false,
                            'class' => 'ui selection dropdown language-select',
                        ]
                    );
                    $this->add($language);
                    break;
                case PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH:
                    $extLength = new Select(
                        $key,
                        [
                            2 => $this->translation->_('gs_TwoDigthts'),
                            3 => $this->translation->_('gs_ThreeDigthts'),
                            4 => $this->translation->_('gs_FourDigthts'),
                            5 => $this->translation->_('gs_FiveDigthts'),
                            6 => $this->translation->_('gs_SixDigthts'),
                            7 => $this->translation->_('gs_SevenDigthts'),
                            11 => $this->translation->_('gs_ElevenDigthts'),
                        ]
                        , [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'value' => $value,
                            'useEmpty' => false,
                            'class' => 'ui selection dropdown extension-length-select',
                        ]
                    );
                    $this->add($extLength);
                    break;
                case PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN :
                case PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT:
                    $currentSoundFile = SoundFiles::findFirstById($value);
                    $selectArray = [];
                    if ($currentSoundFile !== null) {
                        $selectArray = [$value => $currentSoundFile->getRepresent()];
                    }

                    // Audio_message_id
                    $audioMessage = new Select(
                        $key, $selectArray, [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => true,
                            'value' => $value,
                            'class' => 'ui selection dropdown search fluid audio-message-select',
                        ]
                    );
                    $this->add($audioMessage);
                    break;
                case PbxSettings::PBX_RECORD_CALLS:
                case PbxSettings::PBX_RECORD_CALLS_INNER:
                case PbxSettings::USE_WEB_RTC:
                case PbxSettings::AJAM_ENABLED:
                case PbxSettings::AMI_ENABLED:
                case PbxSettings::RESTART_EVERY_NIGHT:
                case PbxSettings::SEND_METRICS:
                case PbxSettings::REDIRECT_TO_HTTPS:
                case PbxSettings::PBX_SPLIT_AUDIO_THREAD:
                case PbxSettings::PBX_ALLOW_GUEST_CALLS:
                case PbxSettings::DISABLE_ALL_MODULES:
                case PbxSettings::SSH_DISABLE_SSH_PASSWORD:
                case '***ALL CHECK BOXES ABOVE***':
                    $cheskarr = ['value' => null];
                    if ($value) {
                        $cheskarr = ['checked' => 'checked', 'value' => null];
                    }
                    $this->add(new Check($key, $cheskarr));
                    break;
                default:
                    $this->add(new Text($key, ['value' => $value]));
            }
        }
    }
}