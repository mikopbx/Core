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

    public function initialize(): void
    {
        $this->setSource('m_SipCodecs');
        parent::initialize();
        $this->belongsTo(
            'codec',
            Codecs::class,
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
            Sip::class,
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