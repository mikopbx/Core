<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;

/**
 * Class SoundFiles
 *
 * @package MikoPBX\Common\Models
 */
class SoundFiles extends ModelsBase
{
    public const CATEGORY_MOH = 'moh';
    public const CATEGORY_CUSTOM = 'custom';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Human-readable name for the sound file displayed in the interface
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Path to the sound file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $path = '';

    /**
     * Category of the sound file, either "moh" for music on hold or "custom" for a custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $category = '';


    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_SoundFiles');
        parent::initialize();
        $this->hasMany(
            'id',
            CallQueues::class,
            'periodic_announce_sound_id',
            [
                "alias" => "CallQueues",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'id',
            CallQueues::class,
            'moh_sound_id',
            [
                "alias" => "CallQueues",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );

        $this->hasMany(
            'id',
            OutWorkTimes::class,
            'audio_message_id',
            [
                "alias" => "OutWorkTimes",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'id',
            IvrMenu::class,
            'audio_message_id',
            [
                "alias" => "IvrMenu",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );
    }
}