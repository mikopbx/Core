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

class Providers extends ModelsBase
{

public $id;
public $uniqid;
public $type;
public $sipuid;
public $iaxuid;


    public function getSource()
{
    return 'm_Providers';
}

    public function initialize()
{
	parent::initialize();
    $this->hasOne(
        'sipuid',
        'Models\Sip',
        'uniqid',
        [
            "alias"=>"Sip",
            "foreignKey" => [
                "allowNulls" => false,
                "action"     =>  Relation::NO_ACTION, //Эту учетную запись удалит автоматом если удалится SIP запись
            ]
        ]
    );

    $this->hasOne(
        'iaxuid',
        'Models\Iax',
        'uniqid',
        [
            "alias"=>"Iax",
            "foreignKey" => [
                "allowNulls" => false,
                "action"     => Relation::NO_ACTION, //Эту учетную запись удалит автоматом если удалится IAX запись
            ]
        ]
    );
    $this->hasMany(
        'uniqid',
        'Models\OutgoingRoutingTable',
        'providerid',
        [
            "alias"=>"OutgoingRouting",
            "foreignKey" => [
                "allowNulls" => false,
                "message"    => 'Models\OutgoingRouting',
                "action"     => Relation::ACTION_CASCADE,
            ],
            'params' => array(
                'order' => 'priority asc'
            )
        ]
    );
    
}


    public function validation()
    {

        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t("mo_ThisUniqidMustBeUniqueForProvidersModels")
        ]));
        return $this->validate($validation);


    }
}