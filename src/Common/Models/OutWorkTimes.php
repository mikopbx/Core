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

/**
 * Class OutWorkTimes
 *
 * @package MikoPBX\Common\Models
 */
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
    public ?string $date_from = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $date_to = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $weekday_from = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $weekday_to = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $time_from = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $time_to = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $action = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $audio_message_id = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = null;


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

