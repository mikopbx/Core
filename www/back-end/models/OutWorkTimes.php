<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;

class OutWorkTimes extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $date_from;

    /**
     * @var string
     */
    public $date_to;

    /**
     * @var integer
     */
    public $weekday_from;

    /**
     * @var integer
     */
    public $weekday_to;

    /**
     * @var string
     */
    public $time_from;

    /**
     * @var string
     */
    public $time_to;

    /**
     * @var string
     */
    public $action;

    /**
     * @var string
     */
    public $extension;

    /**
     * @var string
     */
    public $audio_message_id;

    /**
     * @var string
     */
    public $description;


    public function getSource(): string
    {
        return 'm_OutWorkTimes';
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
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'audio_message_id',
            'Models\SoundFiles',
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

