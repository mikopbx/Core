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

class SoundFiles extends ModelsBase
{
    public $id;
    public $name;
    public $path;

    public function getSource()
    {
        return 'm_SoundFiles';
    }
    public function initialize()
    {
	    parent::initialize();
        $this->hasMany(
            'id',
            'Models\CallQueues',
            'periodic_announce_sound_id',
            [
                "alias"=>"CallQueues",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_RESTRICT
                ]
            ]
        );

        $this->hasMany(
            'id',
            'Models\OutWorkTimes',
            'audio_message_id',
            [
                "alias"=>"OutWorkTimes",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_RESTRICT
                ]
            ]
        );
        $this->hasMany(
            'id',
            'Models\IvrMenu',
            'audio_message_id',
            [
                "alias"=>"IvrMenu",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_RESTRICT
                ]
            ]
        );

    }
}