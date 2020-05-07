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
    public $rulename;

    /**
     * @Column(type="string", nullable=true)
     */
    public $providerid;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $priority;

    /**
     * @Column(type="string", nullable=true)
     */
    public $numberbeginswith;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $restnumbers;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $trimfrombegin;

    /**
     * @Column(type="string", nullable=true)
     */
    public $prepend;

    /**
     * @Column(type="string", nullable=true)
     */
    public $note;


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

