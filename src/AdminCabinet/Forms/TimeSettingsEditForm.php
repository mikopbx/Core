<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
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

        $this->add(new Text('ManualDateTime', ['value' =>  time()]));
        $this->add(new Hidden('SystemDateTime', ['value' => time()]));

    }
}