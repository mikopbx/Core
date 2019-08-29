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

class CallQueueMembers extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $queue;

    /**
     * @var string
     */
    public $extension;

    /**
     * @var integer
     */
    public $priority;

    public function getSource() :string
    {
        return 'm_CallQueueMembers';
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
                'action'     => Relation::NO_ACTION,
                ]
            ]
        );
        $this->belongsTo(
            'queue',
            'Models\CallQueues',
            'uniqid',
            [
                'alias'=>'CallQueues',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ]
            ]

        );


    }
    public function validation() :bool
    {

        $validation = new \Phalcon\Validation();
        $validation->add(array('queue', 'extension'), new UniquenessValidator([
            'message' => $this->t('mo_ThisQueueAndMemberMustBeUniqueForCallQueuesModels')
        ]));
        return $this->validate($validation);


    }
}