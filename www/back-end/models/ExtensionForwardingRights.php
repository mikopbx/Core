<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;
use Phalcon\Mvc\Model\Relation;

class ExtensionForwardingRights extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $extension;

    /**
     * @var string
     */
    public $forwarding;

    /**
     * @var string
     */
    public $forwardingonbusy;

    /**
     * @var string
     */
    public $forwardingonunavailable;

    /**
     * @var integer
     */
    public $ringlength;

    public function getSource() :string 
    {
        return 'm_ExtensionForwardingRights';
    }

    public function initialize() :void 
    {
	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                'alias'=>'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => 'Models\Extensions',
                    'action'     => Relation::NO_ACTION
                ]
            ]
        );

        $this->belongsTo(
            'forwarding',
            'Models\Extensions',
            'number',
            [
                'alias'=>'ForwardingExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\ForwardingExtensions',
                    'action'     => Relation::NO_ACTION
                ]
            ]
        );

        $this->belongsTo(
            'forwardingonbusy',
            'Models\Extensions',
            'number',
            [
                'alias'=>'ForwardingBusyExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\ForwardingBusyExtensions',
                    'action'     => Relation::NO_ACTION
                ]
            ]
        );

        $this->belongsTo(
            'forwardingonunavailable',
            'Models\Extensions',
            'number',
            [
                'alias'=>'ForwardingUnavailableExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\ForwardingUnavailableExtensions',
                    'action'     => Relation::NO_ACTION
                ]
            ]
        );

    }
    public function validation() :bool 
    {
        $validation = new \Phalcon\Validation();


        $validation->add('extension', new UniquenessValidator([
            'message' => $this->t('mo_ThisExtensionNotUniqueForExtensionForwardingRightsModels')
        ]));
        return $this->validate($validation);
    }
}

