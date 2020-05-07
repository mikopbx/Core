<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;

class OutWorkTimes extends ModelsBase
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
    public $date_from;

    /**
     * @Column(type="string", nullable=true)
     */
    public $date_to;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $weekday_from;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $weekday_to;

    /**
     * @Column(type="string", nullable=true)
     */
    public $time_from;

    /**
     * @Column(type="string", nullable=true)
     */
    public $time_to;

    /**
     * @Column(type="string", nullable=true)
     */
    public $action;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $audio_message_id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;


    public function initialize(): void
    {
        $this->setSource('m_OutWorkTimes');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'audio_message_id',
            SoundFiles::class,
            'id',
            [
                'alias'      => 'SoundFiles',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]

        );

    }
}

