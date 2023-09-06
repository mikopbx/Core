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

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

/**
 * Class TimeFrameEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class TimeFrameEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
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
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => true,
                        'class'    => 'ui selection search forwarding-select',
                    ]
                    );
                    $this->add($extension);
                    break;
                case 'audio_message_id' :
                    $audiomessageid = new Select(
                        $key, $options['audio-message'], [
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => true,
                        'class'    => 'ui selection dropdown-default search',
                    ]
                    );
                    $this->add($audiomessageid);
                    break;
                case 'action' :
                    $action = new Select(
                        $key, $options['available-actions'], [
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => false,
                        'class'    => 'ui selection dropdown search',
                    ]
                    );
                    $this->add($action);
                    break;
                case 'weekday_from' :
                case 'weekday_to' :
                    $action = new Select(
                        $key, $options['week-days'], [
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => false,
                        'value'    => empty($entity->$key) ? -1 : $value,
                        'class'    => 'ui selection',
                    ]
                    );
                    $this->add($action);
                    break;
                case 'description' :
                    $rows = max(round(strlen($value) / 95), 2);
                    $this->add(new TextArea($key, ["rows" => $rows]));
                    break;

                default :
                    $this->add(new Text($key, ['autocomplete' => 'off']));
            }
        }
    }
}