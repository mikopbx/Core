<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;

class IncomingRoutingTable extends ModelsBase
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
    public $number;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $provider;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $priority;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $timeout;

    /**
     * @Column(type="string", nullable=true)
     */
    public $action;

    /**
     * @Column(type="string", nullable=true)
     */
    public $note;

    public function getSource(): string
    {
        return 'm_IncomingRoutingTable';
    }

    public function initialize(): void
    {

        parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'provider',
            'Models\Providers',
            'uniqid',
            [
                'alias'      => 'Providers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );


    }
}

