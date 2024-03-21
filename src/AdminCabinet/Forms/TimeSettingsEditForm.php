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
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;

/**
 * Class TimeSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class TimeSettingsEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        foreach ($entity as $item) {
            switch ($item->key) {
                case PbxSettingsConstants::PBX_TIMEZONE :
                {
                    $ntpserver = new Select(
                        PbxSettingsConstants::PBX_TIMEZONE, $options, [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => false,
                            'value' => $item->value,
                            'class' => 'ui search selection dropdown',
                        ]
                    );
                    $this->add($ntpserver);
                    break;
                }
                case PbxSettingsConstants::NTP_SERVER:
                    $this->add(new TextArea($item->key, ['value' => $item->value, "rows" => 4]));
                    break;
                case PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS :
                {
                    $cheskarr = ['value' => null];
                    if ($item->value) {
                        $cheskarr = ['checked' => 'checked', 'value' => null];
                    }
                    $this->add(new Check(PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS, $cheskarr));
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

        $this->add(new Text('ManualDateTime', ['value' => '']));

    }
}