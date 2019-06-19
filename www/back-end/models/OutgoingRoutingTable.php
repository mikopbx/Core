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

class OutgoingRoutingTable extends ModelsBase
{

    public $id;
    public $rulename;
    public $providerid;
    public $priority;
    public $numberbeginswith;
    public $restnumbers;
    public $trimfrombegin;
    public $prepend;
    public $note;

    public function getSource()
    {
        return 'm_OutgoingRoutingTable';
    }

    public function initialize()
    {
	    parent::initialize();
        $this->belongsTo(
            'providerid',
            'Models\Providers',
            'uniqid',
            [
                "alias"      => 'Providers',
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::NO_ACTION,
                ]
            ]
        );
    }
}

