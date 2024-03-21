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

use MikoPBX\Common\Models\PbxSettingsConstants;
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
    public const HIDDEN_PASSWORD = 'xxxxxxx';

    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        foreach ($options as $key => $value) {
            switch ($key) {
                case PbxSettingsConstants::PBX_RECORD_SAVE_PERIOD:
                case '***ALL HIDDEN ABOVE***':
                    $this->add(new Hidden($key, ['value' => $value]));
                    break;
                case PbxSettingsConstants::SIP_PORT:
                case PbxSettingsConstants::TLS_PORT:
                case PbxSettingsConstants::SIP_DEFAULT_EXPIRY:
                case PbxSettingsConstants::SIP_MIN_EXPIRY:
                case PbxSettingsConstants::SIP_MAX_EXPIRY:
                case PbxSettingsConstants::RTP_PORT_FROM:
                case PbxSettingsConstants::RTP_PORT_TO:
                case PbxSettingsConstants::IAX_PORT:
                case PbxSettingsConstants::AMI_PORT:
                case PbxSettingsConstants::AJAM_PORT:
                case PbxSettingsConstants::AJAM_PORT_TLS:
                case PbxSettingsConstants::SSH_PORT:
                case PbxSettingsConstants::WEB_PORT:
                case PbxSettingsConstants::WEB_HTTPS_PORT:
                case PbxSettingsConstants::PBX_CALL_PARKING_EXT:
                case PbxSettingsConstants::PBX_CALL_PARKING_START_SLOT:
                case PbxSettingsConstants::PBX_CALL_PARKING_END_SLOT:
                case PbxSettingsConstants::PBX_FEATURE_DIGIT_TIMEOUT:
                case PbxSettingsConstants::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT:
                case '***ALL NUMBERIC ABOVE***':
                    $this->add(new Numeric($key, ['value' => $value, 'style'=>'width:130px;']));
                    break;
                case PbxSettingsConstants::SSH_PASSWORD:
                    $this->add(new Password($key, ['value' => self::HIDDEN_PASSWORD]));
                    $this->add(
                        new Password(
                            'SSHPasswordRepeat',
                            ['value' => self::HIDDEN_PASSWORD]
                        )
                    );
                    break;
                case PbxSettingsConstants::WEB_ADMIN_PASSWORD:
                    $this->add(new Password($key, ['value' => self::HIDDEN_PASSWORD]));
                    $this->add(
                        new Password(
                            'WebAdminPasswordRepeat',
                            ['value' => self::HIDDEN_PASSWORD]
                        )
                    );
                    break;
                case PbxSettingsConstants::PBX_DESCRIPTION:
                case PbxSettingsConstants::SSH_AUTHORIZED_KEYS:
                case PbxSettingsConstants::SSH_ECDSA_KEY:
                case PbxSettingsConstants::SSH_RSA_KEY:
                case PbxSettingsConstants::SSH_DSS_KEY:
                case PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY:
                case PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY:
                case '***ALL TEXTAREA ABOVE***':
                    $this->addTextArea($key, $value??'', 65);
                    break;
                case PbxSettingsConstants::PBX_LANGUAGE:
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
                case PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH:
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
                case PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_IN :
                case PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_OUT:
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
                case PbxSettingsConstants::PBX_RECORD_CALLS:
                case PbxSettingsConstants::PBX_RECORD_CALLS_INNER:
                case PbxSettingsConstants::USE_WEB_RTC:
                case PbxSettingsConstants::AJAM_ENABLED:
                case PbxSettingsConstants::AMI_ENABLED:
                case PbxSettingsConstants::RESTART_EVERY_NIGHT:
                case PbxSettingsConstants::SEND_METRICS:
                case PbxSettingsConstants::REDIRECT_TO_HTTPS:
                case PbxSettingsConstants::PBX_SPLIT_AUDIO_THREAD:
                case PbxSettingsConstants::PBX_ALLOW_GUEST_CALLS:
                case PbxSettingsConstants::DISABLE_ALL_MODULES:
                case PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD:
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