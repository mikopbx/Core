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
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

/**
 * Class TimeSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class TimeSettingsEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {

        foreach ($entity as $item) {
            switch ($item->key) {
                case 'PBXTimezone' :
                {
                    $ntpserver = new Select(
                        'PBXTimezone', $options, [
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => false,
                        'value'    => $item->value,
                        'class'    => 'ui search selection dropdown',
                    ]
                    );
                    $this->add($ntpserver);
                    break;
                }
                case 'NTPServer':
                    $this->add(new TextArea($item->key, ['value' => $item->value, "rows" => 4]));
                    break;
                case 'PBXManualTimeSettings' :
                {
                    $cheskarr = ['value' => null];
                    if ($item->value) {
                        $cheskarr = ['checked' => 'checked', 'value' => null];
                    }
                    $this->add(new Check('PBXManualTimeSettings', $cheskarr));
                    break;
                }
                default :
                {
                    $this->add(
                        new Text(
                            $item->key, [
                            'value' => $item->value,
                        ]
                        )
                    );
                }
            }
        }

        $this->add(new Text('ManualDateTime', ['value' =>  '']));

    }
}