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

class SipCodecs extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $sipuid;

    /**
     * @var string
     */
    public $codec;

    /**
     * @var integer
     */
    public $priority;

    public function getSource() :string
    {
        return 'm_SipCodecs';
    }

    public function initialize() :void
    {
	    parent::initialize();
        $this->belongsTo(
            'codec',
            'Models\Codecs',
            'name',
            [
                'alias'=>'Codecs',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ]
            ]
        );

        $this->belongsTo(
            'sipuid',
            'Models\Sip',
            'uniqid',
            [
                "alias"=>"Sip",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::NO_ACTION,
                ]
            ]
        );

    }

}