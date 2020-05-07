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
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

class ExtensionEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {

        // EXTENSION

        // ID
        $this->add(new Hidden('id'));

        // Number
        $this->add(new Text('number', [
            "data-inputmask" => "'mask': '" . $options["internalextension_mask"] . "'",
        ]));

        // Type
        $this->add(new Hidden('type'));

        // Is_general_user_number
        $this->add(new Hidden('is_general_user_number'));

        // Show_in_phonebook
        $cheskarr = ['value' => null];
        if ($entity->show_in_phonebook) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('show_in_phonebook', $cheskarr));

        // Public_access
        $cheskarr = ['value' => null];
        if ($entity->public_access) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('public_access', $cheskarr));

        // USER
        // ID
        $this->add(new Hidden('user_id', ["value" => $entity->Users->id]));

        // User role
        $this->add(new Hidden('user_role', ["value" => $entity->Users->role]));

        // Username
        $this->add(new Text('user_username', ["value" => $entity->Users->username]));

        // Email
        $this->add(new Text('user_email', [
            "value" => $entity->Users->email,
        ]));

        // Language
        $language = new Select('user_language',
            [
                'ru-ru' => $this->translation->_("ex_Russian"),
                'en-ru' => $this->translation->_("ex_English"),
                'de-de' => $this->translation->_("ex_Deutsch"),
            ]
            , [
                'using'    => [
                    'id',
                    'name',
                ],
                'value'    => $entity->Users->language,
                'useEmpty' => false,
                'class'    => 'ui selection dropdown language-select',
            ]);
        $this->add($language);


        // Picture
        $this->add(new Hidden('user_avatar', ["value" => $entity->Users->avatar]));


        // SIP
        $this->add(new Hidden('sip_id', ["value" => $entity->Sip->id]));

        // Disabled
        $this->add(new Hidden('sip_disabled', ["value" => $entity->Sip->disabled]));

        // Extension
        $this->add(new Hidden('sip_extension', ["value" => $entity->Sip->extension]));

        // ID
        $this->add(new Hidden('sip_id', ["value" => $entity->Sip->id]));

        // Uniqid
        $this->add(new Hidden('sip_uniqid', ["value" => $entity->Sip->uniqid]));

        // Type
        $this->add(new Hidden('sip_type', ["value" => $entity->Sip->type]));

        // Secret
        $this->add(new Text('sip_secret', [
            "value" => $entity->Sip->secret,
        ]));

        // Busylevel
        $this->add(new Numeric('sip_busylevel', ["value" => $entity->Sip->busylevel]));

        // Dtmfmode
        $arrDTMFType = [
            'auto'      => $this->translation->_('auto'),
            'inband'    => $this->translation->_('inband'),
            'info'      => $this->translation->_('info'),
            'rfc4733'   => $this->translation->_('rfc4733'),
            'auto_info' => $this->translation->_('auto_info'),
        ];

        $dtmfmode = new Select('sip_dtmfmode', $arrDTMFType, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $entity->Sip->dtmfmode,
            'class'    => 'ui selection dropdown dtmf-mode-select',
        ]);
        $this->add($dtmfmode);

        // Networkfilterid
        $networkfilterid = new Select('sip_networkfilterid', $options['network_filters'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $entity->Sip->networkfilterid,
            'class'    => 'ui selection dropdown network-filter-select',
        ]);
        $this->add($networkfilterid);


        // Nat
        $arrNatType = [
            'force_rport,comedia' => 'force_rport, comedia',
            'force_rport'         => 'force_rport',
            'comedia'             => 'comedia',
            'auto_force_rport'    => 'auto_force_rport',
            'no'                  => 'no',
        ];

        $nat = new Select('nat', $arrNatType, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $entity->Sip->nat,
            'class'    => 'ui selection dropdown protocol-select',
        ]);
        $this->add($nat);

        // Qualify
        $cheskarr = ['value' => null];
        if ($entity->Sip->qualify) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('qualify', $cheskarr));

        // Qualifyfreq
        $this->add(new Numeric('qualifyfreq', ["value" => $entity->Sip->qualifyfreq]));

        // Manualattributes
        $rows = max(round(strlen($entity->Sip->manualattributes) / 95),
            2);
        $this->add(new TextArea('sip_manualattributes',
            ["value" => $entity->Sip->manualattributes, "rows" => $rows]));

        // Description
        $this->add(new Text('sip_description', ["value" => $entity->Sip->description]));

        // EXTERNAL
        // Extension
        // // TODO: Для корректной конвертации удалим 8 и добавим 7 в номер
        // $tempNumber = $options['external_extension']->number;
        // if (substr($tempNumber,0,1)=='8' and strlen($tempNumber)==11){
        // 	$lastSymbols = substr($tempNumber,1,10);
        // 	$tempNumber = "7{$lastSymbols}";
        // }
        $this->add(new Text('mobile_number', ["value" => $options['external_extension']->number]));
        // Uniqid
        $this->add(new Hidden('mobile_uniqid', ["value" => $options['external_extension']->ExternalPhones->uniqid]));
        // Disabled
        $this->add(new Hidden('mobile_disabled',
            ["value" => $options['external_extension']->ExternalPhones->disabled]));
        // Dialstring
        $this->add(new Text('mobile_dialstring',
            ["value" => $options['external_extension']->ExternalPhones->dialstring]));


        // Routing
        // Forwarding
        $this->add(new Select('fwd_forwarding', $options['forwarding_extensions'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => true,
            'value'    => $entity->ExtensionForwardingRights->forwarding,
            'class'    => 'ui selection dropdown search forwarding-select',
        ]));
        // Forwardingonbusy
        $this->add(new Select('fwd_forwardingonbusy', $options['forwarding_extensions'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => true,
            'value'    => $entity->ExtensionForwardingRights->forwardingonbusy,
            'class'    => 'ui selection dropdown search forwarding-select',
        ]));
        // Forwardingonunavailable
        $this->add(new Select('fwd_forwardingonunavailable', $options['forwarding_extensions'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => true,
            'value'    => $entity->ExtensionForwardingRights->forwardingonunavailable,
            'class'    => 'ui selection dropdown search forwarding-select',
        ]));
        // Ringlength
        $ringlength = $entity->ExtensionForwardingRights->ringlength;
        $this->add(new Numeric('fwd_ringlength', [
            "maxlength"    => 2,
            "style"        => "width: 80px;",
            "defaultValue" => 120,
            "value"        => ($ringlength > 0) ? $ringlength : '',
        ]));


    }
}