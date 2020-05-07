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

class Codecs extends ModelsBase
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
    public $name;

    /**
     * @Column(type="string", nullable=true)
     */
    public $type;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function initialize(): void
    {
        $this->setSource('m_Codecs');
        parent::initialize();
        $this->hasMany(
            'name',
            IaxCodecs::class,
            'codec',
            [
                'alias'      => 'IaxCodecs',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::ACTION_CASCADE,
                ],
                'params'     => [
                    'order' => 'priority asc',
                ],
            ]
        );


        $this->hasMany(
            'name',
            SipCodecs::class,
            'codec',
            [
                'alias'      => 'SipCodecs',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::ACTION_CASCADE,
                ],
                'params'     => [
                    'order' => 'priority asc',
                ],
            ]
        );
    }
}