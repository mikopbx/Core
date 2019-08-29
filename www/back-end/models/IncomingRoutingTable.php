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
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $rulename;

    /**
     * @var string
     */
    public $number;

    /**
     * @var string
     */
    public $extension;

    /**
     * @var string
     */
    public $provider;

    /**
     * @var integer
     */
    public $priority;

    /**
     * @var integer
     */
    public $timeout;

    /**
     * @var string
     */
    public $action;
    
    /**
     * @var string
     */
    public $note;

    public function getSource() :string
    {
        return 'm_IncomingRoutingTable';
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
                    'action'     => Relation::NO_ACTION
                ]
            ]
        );

        $this->belongsTo(
            'provider',
            'Models\Providers',
            'uniqid',
            [
                'alias'=>'Providers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ]
            ]
        );


    }
}

