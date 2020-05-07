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

class SoundFiles extends ModelsBase
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
    public $path;

    /**
     * @Column(type="string", nullable=true)
     */
    public $category;


    public const CATEGORY_MOH              = 'moh';
    public const CATEGORY_CUSTOM           = 'custom';

    public function initialize(): void
    {
        $this->setSource('m_SoundFiles');
        parent::initialize();
        $this->hasMany(
            'id',
            CallQueues::class,
            'periodic_announce_sound_id',
            [
                "alias"      => "CallQueues",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_RESTRICT,
                ],
            ]
        );

        $this->hasMany(
            'id',
            OutWorkTimes::class,
            'audio_message_id',
            [
                "alias"      => "OutWorkTimes",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'id',
            IvrMenu::class,
            'audio_message_id',
            [
                "alias"      => "IvrMenu",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_RESTRICT,
                ],
            ]
        );

    }
}