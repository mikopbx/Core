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
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

class CallQueues extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $uniqid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $name;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $strategy;

    /**
     * @Column(type="string", nullable=true)
     */
    public $seconds_to_ring_each_member;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $seconds_for_wrapup;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $recive_calls_while_on_a_call;

    /**
     * @Column(type="string", nullable=true){'ringing'|'musiconhold'}
     */
    public $caller_hear;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $announce_position;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $announce_hold_time;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $periodic_announce_sound_id;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $periodic_announce_frequency;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $timeout_to_redirect_to_extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $timeout_extension;

    /**
     * Link to Extension number
     *
     * @Column(type="string", nullable=true)
     */
    public $redirect_to_extension_if_empty;

    /**
     * Number unanswered calls before redirect
     *
     * @Column(type="integer", nullable=true)
     */
    public $number_unanswered_calls_to_redirect;

    /**
     * Link to Extension number
     * @Column(type="string", nullable=true)
     */
    public $redirect_to_extension_if_unanswered;

    /**
     * Number repeat queue cycle
     *
     * @Column(type="integer", nullable=true)
     */
    public $number_repeat_unanswered_to_redirect;

    /**
     * Link to Extension number
     * @Column(type="string", nullable=true)
     */
    public $redirect_to_extension_if_repeat_exceeded;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function getSource(): string
    {
        return 'm_CallQueues';
    }

    public function initialize(): void
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
                ],
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
                ],
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
                ],
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
                ],
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
                ],
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
                    'action'     => Relation::NO_ACTION,
                ],
            ]

        );
        $this->hasMany(
            'uniqid',
            'Models\CallQueueMembers',
            'queue',
            [
                'alias'      => 'CallQueueMembers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE //Удалить подчиненные все CallQueueMembers
                ],
                'params'     => [
                    'order' => 'priority asc',
                ],
            ]
        );


    }


    public function validation(): bool
    {

        $validation = new Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForCallQueuesModels'),
        ]));

        return $this->validate($validation);


    }
}