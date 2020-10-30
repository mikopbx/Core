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
                    $rows = max(round(strlen($value) / 95), 2);
                    $this->add(new TextArea($key, ["rows" => $rows]));
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