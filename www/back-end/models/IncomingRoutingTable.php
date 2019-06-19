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

class IncomingRoutingTable extends ModelsBase
{

    public $id;
    public $rulename;
    public $number;
    public $extension;
    public $provider;
    public $priority;
    public $timeout;
    public $action;
    public $note;

    public function getSource()
    {
        return 'm_IncomingRoutingTable';
    }

    public function initialize()
    {

	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                "alias"=>"Extensions",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::NO_ACTION
                ]
            ]
        );

        $this->belongsTo(
            'provider',
            'Models\Providers',
            'uniqid',
            [
                "alias"=>"Providers",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::NO_ACTION,
                ]
            ]
        );


    }
}

