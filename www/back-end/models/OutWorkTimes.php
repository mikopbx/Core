<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;
class OutWorkTimes extends ModelsBase
{

    public $id;
    public $date_from;
    public $date_to;
    public $weekday_from;
    public $weekday_to;
	public $time_from;
    public $time_to;
    public $action;
    public $extension;
    public $audio_message_id;
    public $description;


    public function getSource()
    {
        return 'm_OutWorkTimes';
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
            'audio_message_id',
            'Models\SoundFiles',
            'id',
            [
                "alias"      => 'SoundFiles',
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::NO_ACTION
                ]
            ]

        );

    }
}

