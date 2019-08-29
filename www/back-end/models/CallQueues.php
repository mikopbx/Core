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
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $uniqid;

    /**
     * @var string
     */
    public $name;

    /**
     * @var string
     */
    public $extension;

    /**
     * @var string
     */
    public $strategy;

    /**
     * @var string
     */
    public $seconds_to_ring_each_member;

    /**
     * @var integer
     */
    public $seconds_for_wrapup;

    /**
     * @var integer
     */
    public $recive_calls_while_on_a_call;

    /**
     * @var string{'ringing'|'musiconhold'}
     */
    public $caller_hear;

    /**
     * @var integer
     */
    public $announce_position;

    /**
     * @var integer
     */
    public $announce_hold_time;

    /**
     * @var integer
     */
    public $periodic_announce_sound_id;

    /**
     * @var integer
     */
    public $periodic_announce_frequency;

    /**
     * @var integer
     */
    public $timeout_to_redirect_to_extension;

    /**
     * @var string
     */
    public $timeout_extension;

    /**
     * @var string
     */
    public $redirect_to_extension_if_empty; //extension

    /**
     * @var integer
     */
    public $number_unanswered_calls_to_redirect; //number unanswered calls

    /**
     * @var string
     */
    public $redirect_to_extension_if_unanswered; //extension

    /**
     * @var integer
     */
    public $number_repeat_unanswered_to_redirect; //number repeat queue cycle

    /**
     * @var string
     */
    public $redirect_to_extension_if_repeat_exceeded; //extension

    /**
     * @var string
     */
    public $description;

    public function getSource() :string
    {
        return 'm_CallQueues';
    }
    public function initialize() :void
    {
	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION // В первую очередь удаляются Extension, а он удалит CallQueues
                ]
            ]
        );
        $this->belongsTo(
            'timeout_extension',
            'Models\Extensions',
            'number',
            [
	            'alias'      => 'TimeoutExtensions',
                'foreignKey' => [
	                'message'    => 'Models\TimeoutExtensions',
	                'allowNulls' => true,
	                'action'     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_empty',
            'Models\Extensions',
            'number',
            [
	            'alias'      => 'RedirectIfEmptyExtensions',
                'foreignKey' => [
	                'allowNulls' => true,
	                'message'    => 'Models\RedirectIfEmptyExtensions',
	                'action'     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_unanswered',
            'Models\Extensions',
            'number',
            [
	            'alias'      => 'RedirectIfUnAnsweredExtensions',
                'foreignKey' => [
	                'allowNulls' => true,
	                'message'    => 'Models\RedirectIfUnAnsweredExtensions',
	                'action'     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_repeat_exceeded',
            'Models\Extensions',
            'number',
            [
	            'alias'      => 'RedirectIfRepeadExceeded',
                'foreignKey' => [
	                'allowNulls' => true,
	                'message'    => 'Models\RedirectIfRepeadExceeded',
	                'action'     => Relation::NO_ACTION
	                // Не троогать Extensions
                ]
            ]
        );

        $this->belongsTo(
            'periodic_announce_sound_id',
            'Models\SoundFiles',
            'id',
            [
                'alias'      => 'SoundFiles',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION
                    ]
            ]

        );
        $this->hasMany(
            'uniqid',
            'Models\CallQueueMembers',
            'queue',
            [
                'alias'=>'CallQueueMembers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE //Удалить подчиненные все CallQueueMembers
                ],
                'params' => array(
                    'order' => 'priority asc'
                )
            ]
        );


    }


    public function validation() :bool
    {

        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForCallQueuesModels')
        ]));
        return $this->validate($validation);


    }
}