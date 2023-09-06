<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
 * @property \MikoPBX\Common\Models\Iax Iax
 * @property \MikoPBX\Common\Models\Sip Sip
 * @property \MikoPBX\Common\Models\OutgoingRoutingTable OutgoingRouting
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
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * @Column(type="string", nullable=true){'SIP'|'IAX'}
     */
    public ?string $type = 'SIP';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $sipuid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $iaxuid = '';


    public function initialize(): void
    {
        $this->setSource('m_Providers');
        parent::initialize();
        $this->hasOne(
            'sipuid',
            Sip::class,
            'uniqid',
            [
                'alias'      => 'Sip',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION, //Эту учетную запись удалит автоматом если удалится SIP запись
                ],
            ]
        );

        $this->hasOne(
            'iaxuid',
            Iax::class,
            'uniqid',
            [
                'alias'      => 'Iax',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION, //Эту учетную запись удалит автоматом если удалится IAX запись
                ],
            ]
        );
        $this->hasMany(
            'uniqid',
            OutgoingRoutingTable::class,
            'providerid',
            [
                'alias'      => 'OutgoingRouting',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => 'OutgoingRouting',
                    'action'     => Relation::ACTION_CASCADE,
                ],
                'params'     => [
                    'order' => 'priority asc',
                ],
            ]
        );
        $this->hasMany(
            'uniqid',
            IncomingRoutingTable::class,
            'provider',
            [
                'alias'      => 'IncomingRouting',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'IncomingRouting',
                    'action'     => Relation::NO_ACTION,
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
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForProvidersModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}