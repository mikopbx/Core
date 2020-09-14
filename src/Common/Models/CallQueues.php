<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class CallQueues
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
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
    public ?string $uniqid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $strategy = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $seconds_to_ring_each_member = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $seconds_for_wrapup = '';

    /**
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $recive_calls_while_on_a_call = '';

    /**
     * @Column(type="string", nullable=true){'ringing'|'musiconhold'}
     */
    public ?string $caller_hear = 'ringing';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $announce_position = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $announce_hold_time = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $periodic_announce_sound_id = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $periodic_announce_frequency = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $timeout_to_redirect_to_extension = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $timeout_extension = '';

    /**
     * Link to Extension number
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $redirect_to_extension_if_empty = '';

    /**
     * Number unanswered calls before redirect
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $number_unanswered_calls_to_redirect = '';

    /**
     * Link to Extension number
     * @Column(type="string", nullable=true)
     */
    public ?string $redirect_to_extension_if_unanswered = '';

    /**
     * Number repeat queue cycle
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $number_repeat_unanswered_to_redirect = '';

    /**
     * Link to Extension number
     * @Column(type="string", nullable=true)
     */
    public ?string $redirect_to_extension_if_repeat_exceeded = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $callerid_prefix = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    public function initialize(): void
    {
        $this->setSource('m_CallQueues');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
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
            Extensions::class,
            'number',
            [
                'alias'      => 'TimeoutExtensions',
                'foreignKey' => [
                    'message'    => 'TimeoutExtensions',
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION
                    // Не троогать Extensions
                ],
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_empty',
            Extensions::class,
            'number',
            [
                'alias'      => 'RedirectIfEmptyExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'RedirectIfEmptyExtensions',
                    'action'     => Relation::NO_ACTION
                    // Не троогать Extensions
                ],
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_unanswered',
            Extensions::class,
            'number',
            [
                'alias'      => 'RedirectIfUnAnsweredExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'RedirectIfUnAnsweredExtensions',
                    'action'     => Relation::NO_ACTION
                    // Не троогать Extensions
                ],
            ]
        );
        $this->belongsTo(
            'redirect_to_extension_if_repeat_exceeded',
            Extensions::class,
            'number',
            [
                'alias'      => 'RedirectIfRepeadExceeded',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'RedirectIfRepeadExceeded',
                    'action'     => Relation::NO_ACTION
                    // Не троогать Extensions
                ],
            ]
        );

        $this->belongsTo(
            'periodic_announce_sound_id',
            SoundFiles::class,
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
            CallQueueMembers::class,
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
        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForCallQueuesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}