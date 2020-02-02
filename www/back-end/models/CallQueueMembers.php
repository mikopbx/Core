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

class CallQueueMembers extends ModelsBase
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
    public $queue;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $priority;

    public function getSource(): string
    {
        return 'm_CallQueueMembers';
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
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
        $this->belongsTo(
            'queue',
            'Models\CallQueues',
            'uniqid',
            [
                'alias'      => 'CallQueues',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]

        );


    }

    public function validation(): bool
    {

        $validation = new Validation();
        $validation->add(['queue', 'extension'], new UniquenessValidator([
            'message' => $this->t('mo_ThisQueueAndMemberMustBeUniqueForCallQueuesModels'),
        ]));

        return $this->validate($validation);


    }
}