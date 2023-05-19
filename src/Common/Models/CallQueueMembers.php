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
 * Class CallQueueMembers
 *
 * @package MikoPBX\Common\Models
 */
class CallQueueMembers extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Ref to call queue uniqid
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $queue = '';

    /**
     * Extension associated with the queue member.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     *  Priority of the queue member.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $priority = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_CallQueueMembers');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
        $this->belongsTo(
            'queue',
            CallQueues::class,
            'uniqid',
            [
                'alias' => 'CallQueues',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
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
            ['queue', 'extension'],
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisQueueAndMemberMustBeUniqueForCallQueuesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}