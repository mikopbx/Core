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
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;


class SipProviderEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
        // Не нужны провайдеру
        // Busylevel
        // Extension
        // Networkfilterid

        // ProviderType
        $this->add(new Hidden('providerType', ['value' => 'SIP']));

        // Disabled
        $this->add(new Hidden('disabled'));

        // ID
        $this->add(new Hidden('id'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Type
        $this->add(new Hidden('type'));


        // Description
        $this->add(new Text('description'));

        // Username
        $this->add(new Text('username'));

        // Secret
        $this->add(new Password('secret'));

        // Host
        $this->add(new Text('host'));

        // Dtmfmode
        $arrDTMFType = [
            'auto'      => $this->translation->_('auto'),
            'inband'    => $this->translation->_('inband'),
            'info'      => $this->translation->_('info'),
            'rfc4733'   => $this->translation->_('rfc4733'),
            'auto_info' => $this->translation->_('auto_info'),
        ];

        $dtmfmode = new Select(
            'dtmfmode', $arrDTMFType, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $entity->dtmfmode,
            'class'    => 'ui selection dropdown dtmfmode-select',
        ]
        );
        $this->add($dtmfmode);


        // Port
        $this->add(new Numeric('port'));

        // Nat
        $arrNatType = [
            'force_rport,comedia' => 'force_rport, comedia',
            'force_rport'         => 'force_rport',
            'comedia'             => 'comedia',
            'auto_force_rport'    => 'auto_force_rport',
            'no'                  => 'no',
        ];

        $nat = new Select(
            'nat', $arrNatType, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $entity->nat,
            'class'    => 'ui selection dropdown protocol-select',
        ]
        );
        $this->add($nat);

        // Qualify
        $cheskarr = ['value' => null];
        if ($entity->qualify) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('qualify', $cheskarr));

        // Qualifyfreq
        $this->add(new Numeric('qualifyfreq'));

        // Defaultuser
        $this->add(new Text('defaultuser'));

        // Fromuser
        $this->add(new Text('fromuser'));

        // Fromdomain
        $this->add(new Text('fromdomain'));

        // Noregister
        $cheskarr = ['value' => null];
        if ($entity->noregister) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('noregister', $cheskarr));

        // Manualregister
        $this->add(new Text('manualregister'));

        // Disablefromuser
        $cheskarr = ['value' => null];
        if ($entity->disablefromuser) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('disablefromuser', $cheskarr));

        // Receive_calls_without_auth
        $cheskarr = ['value' => null];
        if ($entity->receive_calls_without_auth) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('receive_calls_without_auth', $cheskarr));

        // Manualattributes
        $rows = max(round(strlen($entity->manualattributes) / 95), 2);
        $this->add(new TextArea('manualattributes', ["rows" => $rows]));
    }
}