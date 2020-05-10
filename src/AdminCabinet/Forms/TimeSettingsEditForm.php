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
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;


class TimeSettingsEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
//        $arrNtpServersVariants = array(
//            'ru.pool.ntp.org' => 'ru.pool.ntp.org',
//            'europe.pool.ntp.org' => 'europe.pool.ntp.org',
//            'asia.pool.ntp.org' => 'asia.pool.ntp.org',
//            'north-america.pool.ntp.org'=>'north-america.pool.ntp.org',
//            'south-america.pool.ntp.org'=>'south-america.pool.ntp.org'
//        );

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

        $this->add(
            new Text(
                'CurrentDateTime', [
                'value' => date('m/d/Y H:i:s', time()),
            ]
            )
        );
    }
}