<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

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
                        'useEmpty' => true,
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
                    $this->add(new Text($key));
            }
        }
    }
}