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

use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

/**
 * Class CustomFilesEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class CustomFilesEditForm extends Form
{
    public function initialize($entity = null): void
    {
        foreach ($entity as $key => $value) {
            switch ($key) {
                case "id":
                case "content":
                case "filepath":
                case "***ALL HIDDEN ABOVE***":
                    $this->add(new Hidden($key));
                    break;
                case "description":
                    // Description
                    $rows = 1;
                    $strings = explode("\n", $value);
                    foreach ($strings as $string){
                        $rows+=round(strlen($string) / 65);
                    }
                    $this->add(new TextArea('description', ["rows" => max($rows,2)]));
                    break;
                case "mode":
                    $select = new Select(
                        $key,
                        [
                            'none'     => $this->translation->_("cf_FileActionsNone"),
                            'append'   => $this->translation->_("cf_FileActionsAppend"),
                            'override' => $this->translation->_("cf_FileActionsOverride"),
                        ]
                        , [
                            'using'    => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => false,
                            'class'    => 'ui selection dropdown type-select',
                        ]
                    );
                    $this->add($select);
                    break;
                //case "filepath":
                //    $this->add(new Text($key,array('readonly'=>'readonly')));
                //    break;
                default:
                    $this->add(new Text($key));
            }
        }
    }
}