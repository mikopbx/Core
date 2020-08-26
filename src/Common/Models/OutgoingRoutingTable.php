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
    public ?string $rulename = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $providerid = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $priority = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $numberbeginswith = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $restnumbers = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string  $trimfrombegin = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $prepend = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $note = null;


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

