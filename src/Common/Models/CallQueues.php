<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
     * Unique ID of the call queue.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * Name of the call queue.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Extension number of the call queue.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * Strategy for handling calls in the queue.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $strategy = '';

    /**
     *  Seconds to ring each member of the queue.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $seconds_to_ring_each_member = '';

    /**
     * Seconds for wrap-up after each call.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $seconds_for_wrapup = '';

    /**
     *  Setting to receive calls while already on a call.
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $recive_calls_while_on_a_call = '';

    /**
     * What the caller hears when in the queue. Possible values: 'ringing', 'musiconhold'.
     *
     * @Column(type="string", nullable=true){'ringing'|'musiconhold'}
     */
    public ?string $caller_hear = 'ringing';

    /**
     * Announcement of the caller's position in the queue.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $announce_position = '';

    /**
     * Announcement of hold time in the queue.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $announce_hold_time = '';

    /**
     *  ID of the periodic announcement sound.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $periodic_announce_sound_id = '';

    /**
     * ID of the Music on Hold sound.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $moh_sound_id = '';

    /**
     * Frequency of periodic announcements in the queue.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $periodic_announce_frequency = '';

    /**
     * Timeout to redirect the call to another extension.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $timeout_to_redirect_to_extension = '';

    /**
     * Extension to redirect the call to when timeout occurs.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $timeout_extension = '';

    /**
     * Extension to redirect the call to if the queue is empty.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $redirect_to_extension_if_empty = '';

    /**
     * Number of unanswered calls before redirecting.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $number_unanswered_calls_to_redirect = '';

    /**
     * Extension to redirect the call to if it remains unanswered.
     * @Column(type="string", nullable=true)
     */
    public ?string $redirect_to_extension_if_unanswered = '';

    /**
     * Number of unanswered calls before redirecting from the call queue.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $number_repeat_unanswered_to_redirect = '';

    /**
     * Extension to redirect to if the call queue cycle is repeated beyond the specified
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $redirect_to_extension_if_repeat_exceeded = '';

    /**
     * Caller ID prefix for the call queue.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $callerid_prefix = '';

    /**
     * Description of the call queue.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_CallQueues');
        parent::initialize();

        // Establish a belongsTo relationship with the Extensions model for 'extension' field
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION
                ],
            ]
        );

        // Establish a belongsTo relationship with the Extensions model for 'timeout_extension' field
        $this->belongsTo(
            'timeout_extension',
            Extensions::class,
            'number',
            [
                'alias' => 'TimeoutExtensions',
                'foreignKey' => [
                    'message' => 'TimeoutExtensions',
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION
                    // Не троогать Extensions
                ],
            ]
        );

        // Establish a belongsTo relationship with the Extensions model for 'redirect_to_extension_if_empty' field
        $this->belongsTo(
            'redirect_to_extension_if_empty',
            Extensions::class,
            'number',
            [
                'alias' => 'RedirectIfEmptyExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'RedirectIfEmptyExtensions',
                    'action' => Relation::NO_ACTION
                ],
            ]
        );

        // Establish a belongsTo relationship with the Extensions model for 'redirect_to_extension_if_unanswered' field
        $this->belongsTo(
            'redirect_to_extension_if_unanswered',
            Extensions::class,
            'number',
            [
                'alias' => 'RedirectIfUnAnsweredExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'RedirectIfUnAnsweredExtensions',
                    'action' => Relation::NO_ACTION
                ],
            ]
        );

        // Establish a belongsTo relationship with the Extensions model for 'redirect_to_extension_if_repeat_exceeded' field
        $this->belongsTo(
            'redirect_to_extension_if_repeat_exceeded',
            Extensions::class,
            'number',
            [
                'alias' => 'RedirectIfRepeadExceeded',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'RedirectIfRepeadExceeded',
                    'action' => Relation::NO_ACTION
                    // Не троогать Extensions
                ],
            ]
        );

        // Establish a belongsTo relationship with the SoundFiles model for 'periodic_announce_sound_id' field
        $this->belongsTo(
            'periodic_announce_sound_id',
            SoundFiles::class,
            'id',
            [
                'alias' => 'SoundFiles',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]

        );

        // Establish a belongsTo relationship with the SoundFiles model for 'moh_sound_id' field
        $this->belongsTo(
            'moh_sound_id',
            SoundFiles::class,
            'id',
            [
                'alias' => 'MohSoundFiles',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]

        );

        // Establish a hasMany relationship with the CallQueueMembers model for 'uniqid' field
        $this->hasMany(
            'uniqid',
            CallQueueMembers::class,
            'queue',
            [
                'alias' => 'CallQueueMembers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE
                    // Delete all related CallQueueMembers when CallQueue is deleted
                ],
                'params' => [
                    'order' => 'priority asc',
                ],
            ]
        );
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
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