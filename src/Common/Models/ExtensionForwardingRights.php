<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class ExtensionForwardingRights
 *
 * @package MikoPBX\Common\Models
 */
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

    public function initialize(): void
    {
        $this->setSource('m_ExtensionForwardingRights');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => Extensions::class,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwarding',
            Extensions::class,
            'number',
            [
                'alias'      => 'ForwardingExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'ForwardingExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwardingonbusy',
            Extensions::class,
            'number',
            [
                'alias'      => 'ForwardingBusyExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'ForwardingBusyExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwardingonunavailable',
            Extensions::class,
            'number',
            [
                'alias'      => 'ForwardingUnavailableExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'ForwardingUnavailableExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }

    public function validation(): bool
    {
        $validation = new Validation();


        $validation->add(
            'extension',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisExtensionNotUniqueForExtensionForwardingRightsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}

