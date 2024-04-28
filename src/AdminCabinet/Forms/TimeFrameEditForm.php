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

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;


/**
 * Class TimeFrameEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class TimeFrameEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        foreach ($entity as $key => $value) {
            switch ($key) {
                case 'id' :
                    $this->add(new Hidden($key));
                    break;
                case 'allowRestriction' :
                    $cheskarr = ['value' => null];
                    if ($value) {
                        $cheskarr = ['checked' => 'checked', 'value' => null];
                    }
                    $this->add(new Check('allowRestriction', $cheskarr));
                    break;
                case 'extension' :
                    $extension = new Select(
                        $key, $options['extensions'], [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => true,
                            'class' => 'ui selection search forwarding-select',
                        ]
                    );
                    $this->add($extension);
                    break;
                case 'audio_message_id' :
                    $audiomessageid = new Select(
                        $key, $options['audio-message'], [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => true,
                            'class' => 'ui selection dropdown-default search',
                        ]
                    );
                    $this->add($audiomessageid);
                    break;
                case 'action' :
                    $action = new Select(
                        $key, $options['available-actions'], [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => false,
                            'class' => 'ui selection dropdown search',
                        ]
                    );
                    $this->add($action);
                    break;
                case 'calType' :
                    $calTypeArray = [
                        OutWorkTimes::CAL_TYPE_NONE     => $this->translation->_('tf_CAL_TYPE_NONE'),
                        OutWorkTimes::CAL_TYPE_CALDAV   => $this->translation->_('tf_CAL_TYPE_CALDAV'),
                        // TODO / It is broken, while we turn it off
                        // OutWorkTimes::CAL_TYPE_ICAL     => $this->translation->_('tf_CAL_TYPE_ICAL'),
                    ];
                    if (empty($value)) {
                        $value = OutWorkTimes::CAL_TYPE_NONE;
                    }
                    $calType = new Select(
                        $key, $calTypeArray, [
                           'using' => [
                               'id',
                               'name',
                           ],
                           'useEmpty' => false,
                           'value' => $value,
                           'class' => 'ui selection dropdown search',
                       ]
                    );
                    $this->add($calType);
                    break;
                case 'weekday_from' :
                case 'weekday_to' :
                    $action = new Select(
                        $key, $options['week-days'], [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => false,
                            'value' => empty($entity->$key) ? -1 : $value,
                            'class' => 'ui selection',
                        ]
                    );
                    $this->add($action);
                    break;
                case 'description' :
                    $this->addTextArea($key, $value??'', 65);
                    break;
                case 'calSecret' :
                    $this->add(new Password($key, ['value' => $value]));
                    break;
                default :
                    $this->add(new Text($key, ['autocomplete' => 'off']));
            }
        }
    }
}