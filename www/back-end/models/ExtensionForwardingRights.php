<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

class ExtensionForwardingRights extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $forwarding;

    /**
     * @Column(type="string", nullable=true)
     */
    public $forwardingonbusy;

    /**
     * @Column(type="string", nullable=true)
     */
    public $forwardingonunavailable;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $ringlength;

    public function getSource(): string
    {
        return 'm_ExtensionForwardingRights';
    }

    public function initialize(): void
    {
        parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => 'Models\Extensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwarding',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'ForwardingExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\ForwardingExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwardingonbusy',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'ForwardingBusyExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\ForwardingBusyExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwardingonunavailable',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'ForwardingUnavailableExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\ForwardingUnavailableExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

    }

    public function validation(): bool
    {
        $validation = new Validation();


        $validation->add('extension', new UniquenessValidator([
            'message' => $this->t('mo_ThisExtensionNotUniqueForExtensionForwardingRightsModels'),
        ]));

        return $this->validate($validation);
    }
}

