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

class CallQueues extends ModelsBase
{
    public $id;
    public $uniqid;
    public $name;
    public $extension;
    public $strategy;
    public $seconds_to_ring_each_member;
    public $seconds_for_wrapup; //number
    public $recive_calls_while_on_a_call; //check
    public $caller_hear; //ringing or musiconhold
    public $announce_position; //check
    public $announce_hold_time; //check
    public $periodic_announce_sound_id; // integer
    public $periodic_announce_frequency; //number seconds

    public $timeout_to_redirect_to_extension; //number seconds noanswer
    public $timeout_extension; //extension

    public $redirect_to_extension_if_empty; //extension

    public $number_unanswered_calls_to_redirect; //number unanswered calls
    public $redirect_to_extension_if_unanswered; //extension

    public $number_repeat_unanswered_to_redirect; //number repeat queue cycle
    public $redirect_to_extension_if_repeat_exceeded; //extension

    public $description;

    public function getSource()
    {
        return 'm_CallQueues';
    }
    public function initialize()
    {
	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                "alias"      => 'Extensions',
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::NO_ACTION // В первую очередь удаляются Extension, а он удалит CallQueues
                ]
            ]
        );
        $this->belongsTo(
            'timeout_extension',
            'Models\Extensions',
            'number',
            [
	            "alias"      => 'TimeoutExtensions',
                "foreignKey" => [
	                "message"    => 'Models\TimeoutExtensions',
	                "allowNulls" => true,
	                "action"     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_empty',
            'Models\Extensions',
            'number',
            [
	            "alias"      => 'RedirectIfEmptyExtensions',
                "foreignKey" => [
	                "allowNulls" => true,
	                "message"    => 'Models\RedirectIfEmptyExtensions',
	                "action"     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_unanswered',
            'Models\Extensions',
            'number',
            [
	            "alias"      => 'RedirectIfUnAnsweredExtensions',
                "foreignKey" => [
	                "allowNulls" => true,
	                "message"    => 'Models\RedirectIfUnAnsweredExtensions',
	                "action"     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_repeat_exceeded',
            'Models\Extensions',
            'number',
            [
	            "alias"      => 'RedirectIfRepeadExceeded',
                "foreignKey" => [
	                "allowNulls" => true,
	                "message"    => 'Models\RedirectIfRepeadExceeded',
	                "action"     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );

        $this->belongsTo(
            'periodic_announce_sound_id',
            'Models\SoundFiles',
            'id',
            [
                "alias"      => 'SoundFiles',
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::NO_ACTION
                    ]
            ]

        );
        $this->hasMany(
            'uniqid',
            'Models\CallQueueMembers',
            'queue',
            [
                "alias"=>"CallQueueMembers",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE //Удалить подчиненные все CallQueueMembers
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
            'message' => $this->t("mo_ThisUniqidMustBeUniqueForCallQueuesModels")
        ]));
        return $this->validate($validation);


    }
}