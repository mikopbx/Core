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
use Phalcon\Forms\Form;

class DefaultIncomingRouteForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
        foreach ($entity as $key => $value) {
            switch ($key) {
                case 'action' :
                {
                    $arrDefaultActions = [
                        'busy'      => $this->translation->_('ir_busy_signal'),
                        'hangup'    => $this->translation->_('ir_hangup'),
                        'extension' => $this->translation->_('ir_extension'),
                    ];

                    $defaultActions = new Select(
                        'action', $arrDefaultActions, [
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => false,
                        'value'    => $value,
                        'class'    => 'ui selection dropdown defaultrouteselect',
                    ]
                    );
                    $this->add($defaultActions);
                    break;
                }
                case 'extension' :
                {
                    // Extension
                    $extension = new Select(
                        'extension', $options['extensions'], [
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => true,
                        'value'    => $value,
                        'class'    => 'ui selection dropdown search forwarding-select',
                    ]
                    );
                    $this->add($extension);
                    break;
                }
                default:
                    $this->add(new Hidden($key));
            }
        }
    }
}