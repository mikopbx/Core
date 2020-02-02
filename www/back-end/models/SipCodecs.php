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

class SipCodecs extends ModelsBase
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
    public $sipuid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $codec;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $priority;

    public function getSource(): string
    {
        return 'm_SipCodecs';
    }

    public function initialize(): void
    {
        parent::initialize();
        $this->belongsTo(
            'codec',
            'Models\Codecs',
            'name',
            [
                'alias'      => 'Codecs',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'sipuid',
            'Models\Sip',
            'uniqid',
            [
                "alias"      => "Sip",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::NO_ACTION,
                ],
            ]
        );

    }

}