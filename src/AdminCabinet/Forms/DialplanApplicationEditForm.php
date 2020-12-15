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
 * Class DialplanApplicationEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class DialplanApplicationEditForm extends Form
{
    public function initialize($entity): void
    {
        foreach ($entity as $key => $value) {
            switch ($key) {
                case "id":
                case "uniqid":
                case "***ALL HIDDEN ABOVE***":
                    $this->add(new Hidden($key));
                    break;
                case "description":
                    $rows = max(round(strlen($value) / 95), 2);
                    $this->add(new TextArea($key, ["rows" => $rows]));
                    break;
                case "type":
                    $select = new Select(
                        $key,
                        [
                            'php'       => $this->translation->_("da_TypePhp"),
                            'plaintext' => $this->translation->_("da_TypePlaintext"),
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
                case "applicationlogic":
                    $this->add(new Hidden($key, ['value' => $entity->getApplicationlogic()]));
                    break;
                default:
                    $this->add(new Text($key));
            }
        }
    }
}