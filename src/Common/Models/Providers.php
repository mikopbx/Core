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