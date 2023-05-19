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
 * Class ConferenceRooms
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
class ConferenceRooms extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Unique identifier for the conference room.
     *
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * Link to the extension associated with the conference room.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * Name of the conference room.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * PIN code required to access the conference room.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $pinCode = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_ConferenceRooms');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION
                    // The associated Extension is always deleted, and it will delete this record
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
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForConferenceRoomsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}