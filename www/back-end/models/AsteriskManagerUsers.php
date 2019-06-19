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
    public $id;
    public $username;
    public $secret;
    public $call;
    public $cdr;
    public $originate;
    public $reporting;
    public $agent;
    public $config;
    public $dialplan;
    public $dtmf;
    public $log;
    public $system;
    public $user;
    public $verbose;
    public $networkfilterid;
    public $description;

    public function getSource()
    {
        return 'm_AsteriskManagerUsers';
    }

    public function validation()
    {
        $validation = new \Phalcon\Validation();
        $validation->add('username', new UniquenessValidator([
            'message' => $this->t("mo_ThisUsernameNotUniqueForStorageModels")
        ]));

        return $this->validate($validation);
    }

    public function initialize()
    {
	    parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            'Models\NetworkFilters',
            'id',
            [
                "alias"=>"NetworkFilters",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::NO_ACTION
                ]
            ]
        );
    }
}