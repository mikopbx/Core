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
 * Class Providers
 *
 * @property Iax Iax
 * @property Sip Sip
 * @property OutgoingRoutingTable OutgoingRouting
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
class Providers extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Unique identifier of the provider account
     *
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * Type of the provider account (SIP or IAX)
     *
     * @Column(type="string", nullable=true){'SIP'|'IAX'}
     */
    public ?string $type = 'SIP';

    /**
     *  Reference to the SIP table with provider settings
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $sipuid = '';

    /**
     *  Reference to the IAX table with provider settings
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $iaxuid = '';

    /**
     *  Note for current provider
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $note = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_Providers');
        parent::initialize();

        // Establish a hasOne relationship with the Sip model
        $this->hasOne(
            'sipuid',
            Sip::class,
            'uniqid',
            [
                'alias' => 'Sip',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                    // This account will be automatically deleted if the SIP record is deleted
                ],
            ]
        );

        // Establish a hasOne relationship with the Iax model
        $this->hasOne(
            'iaxuid',
            Iax::class,
            'uniqid',
            [
                'alias' => 'Iax',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                    // This account will be automatically deleted if the IAX record is deleted
                ],
            ]
        );

        // Establish a hasMany relationship with the OutgoingRoutingTable model
        $this->hasMany(
            'uniqid',
            OutgoingRoutingTable::class,
            'providerid',
            [
                'alias' => 'OutgoingRouting',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message' => 'OutgoingRouting',
                    'action' => Relation::ACTION_CASCADE,
                ],
                'params' => [
                    'order' => 'priority asc',
                ],
            ]
        );

        // Establish a hasMany relationship with the IncomingRoutingTable model
        $this->hasMany(
            'uniqid',
            IncomingRoutingTable::class,
            'provider',
            [
                'alias' => 'IncomingRouting',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'IncomingRouting',
                    'action' => Relation::NO_ACTION,
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
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForProvidersModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}