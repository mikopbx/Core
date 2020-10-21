<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
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