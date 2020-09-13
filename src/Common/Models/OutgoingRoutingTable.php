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

/**
 * Class OutgoingRoutingTable
 *
 * @package MikoPBX\Common\Models
 */
class OutgoingRoutingTable extends ModelsBase
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
    public ?string $rulename = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $providerid = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $priority = '0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $numberbeginswith = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $restnumbers = '9';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $trimfrombegin = '0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $prepend = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $note = '';


    public function initialize(): void
    {
        $this->setSource('m_OutgoingRoutingTable');
        parent::initialize();
        $this->belongsTo(
            'providerid',
            Providers::class,
            'uniqid',
            [
                'alias'      => 'Providers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }
}

