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

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Models\SoundFiles;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

/**
 * Class GeneralSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class GeneralSettingsEditForm extends Form
{
    public function initialize(/** @scrutinizer ignore-unused */ $entity = null, $options = null): void
    {
        foreach ($options as $key => $value) {
            switch ($key) {
                case 'SIPPort':
                case 'SIPDefaultExpiry':
                case 'SIPMinExpiry':
                case 'SIPMaxExpiry':
                case 'RTPPortFrom':
                case 'RTPPortTo':
                case 'IAXPort':
                case 'AMIPort':
                case 'AJAMPort':
                case 'AJAMPortTLS':
                case 'SSHPort':
                case 'WEBPort':
                case 'WEBHTTPSPort':
                case 'PBXCallParkingExt':
                case 'PBXCallParkingStartSlot':
                case 'PBXCallParkingEndSlot':
                case 'PBXFeatureDigitTimeout':
                case 'PBXFeatureAtxferNoAnswerTimeout':
                case '***ALL NUMBERIC ABOVE***':
                    $this->add(new Numeric($key, ['value' => $value]));
                    break;
                case 'SSHPassword':
                    $this->add(new Password($key, ['value' => $value]));
                    $this->add(
                        new Password(
                            'SSHPasswordRepeat',
                            ['value' => $value]
                        )
                    );
                    break;
                case 'WebAdminPassword':
                    $this->add(new Password($key, ['value' => $value]));
                    $this->add(
                        new Password(
                            'WebAdminPasswordRepeat',
                            ['value' => $value]
                        )
                    );
                    break;
                case 'Description':
                    $this->add(new TextArea($key, ['value' => $value, "rows" => 2]));
                    break;
                case 'SSHAuthorizedKeys':
                case 'SSHecdsaKey':
                case 'SSHRsaKey':
                case 'SSHDssKey':
                case 'WEBHTTPSPublicKey':
                case 'WEBHTTPSPrivateKey':
                case '***ALL TEXTAREA ABOVE***':
                    $rows = max(round(strlen($value) / 95), 2);
                    $this->add(
                        new TextArea(
                            $key,
                            ['value' => $value, 'rows' => $rows]
                        )
                    );
                    break;
                case 'PBXLanguage':
                    $language = new Select(
                        $key,
                        [
                            'en-en' => $this->translation->_('ex_English'),
                            'en-gb' => $this->translation->_('ex_EnglishUK'),
                            'ru-ru' => $this->translation->_('ex_Russian'),
                            'de-de' => $this->translation->_('ex_Deutsch'),
                            'da-dk' => $this->translation->_('ex_Danish'),
                            'es-es' => $this->translation->_('ex_Spanish'),
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
                            'using'    => [
                                'id',
                                'name',
                            ],
                            'value'    => $value,
                            'useEmpty' => false,
                            'class'    => 'ui selection dropdown language-select',
                        ]
                    );
                    $this->add($language);
                    break;
                case 'PBXInternalExtensionLength':
                    $extLength = new Select(
                        $key,
                        [
                            2 => $this->translation->_('gs_TwoDigthts'),
                            3 => $this->translation->_('gs_ThreeDigthts'),
                            4 => $this->translation->_('gs_FourDigthts'),
                            5 => $this->translation->_('gs_FiveDigthts'),
                            6 => $this->translation->_('gs_SixDigthts'),
                            7 => $this->translation->_('gs_SevenDigthts'),
                        ]
                        , [
                            'using'    => [
                                'id',
                                'name',
                            ],
                            'value'    => $value,
                            'useEmpty' => false,
                            'class'    => 'ui selection dropdown extension-length-select',
                        ]
                    );
                    $this->add($extLength);
                    break;
                case 'PBXRecordAnnouncement':

                    $currentSoundFile = SoundFiles::findFirstById($value);
                    $selectArray=[];
                    if ($currentSoundFile!==null){
                        $selectArray = [$value=>$currentSoundFile->getRepresent()];
                    }

                    // Audio_message_id
                    $audioMessage = new Select(
                        $key, $selectArray, [
                                              'using'    => [
                                                  'id',
                                                  'name',
                                              ],
                                              'useEmpty' => true,
                                              'value'    => $value,
                                              'class'    => 'ui selection dropdown search fluid audio-message-select',
                            ]
                    );
                    $this->add($audioMessage);
                    break;
                case 'PBXRecordCalls':
                case 'AJAMEnabled':
                case 'AMIEnabled':
                case 'RestartEveryNight':
                case 'SendMetrics':
                case 'RedirectToHttps':
                case 'PBXSplitAudioThread':
                case 'PBXAllowGuestCalls':
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