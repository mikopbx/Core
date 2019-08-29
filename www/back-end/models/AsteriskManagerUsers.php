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

class AsteriskManagerUsers extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;
    /**
     * @var string
     */
    public $username;
    /**
     * @var string
     */
    public $secret;

    /**
     * @var integer
     */
    public $call;

    /**
     * @var integer
     */
    public $cdr;

    /**
     * @var integer
     */
    public $originate;

    /**
     * @var integer
     */
    public $reporting;

    /**
     * @var integer
     */
    public $agent;

    /**
     * @var integer
     */
    public $config;

    /**
     * @var integer
     */
    public $dialplan;

    /**
     * @var integer
     */
    public $dtmf;

    /**
     * @var integer
     */
    public $log;

    /**
     * @var integer
     */
    public $system;

    /**
     * @var integer
     */
    public $user;

    /**
     * @var integer
     */
    public $verbose;

    /**
     * @var integer
     */
    public $networkfilterid;

    /**
     * @var string
     */
    public $description;

    public function getSource() :string 
    {
        return 'm_AsteriskManagerUsers';
    }

    public function validation() :bool
    {
        $validation = new \Phalcon\Validation();
        $validation->add('username', new UniquenessValidator([
            'message' => $this->t('mo_ThisUsernameNotUniqueForStorageModels')
        ]));

        return $this->validate($validation);
    }

    public function initialize() :void
    {
	    parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            'Models\NetworkFilters',
            'id',
            [
                'alias'=>'NetworkFilters',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION
                ]
            ]
        );
    }
}