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
 * Class OutWorkTimes
 *
 * @package MikoPBX\Common\Models
 */
class OutWorkTimes extends ModelsBase
{
    public const CAL_TYPE_NONE = 'none';
    public const CAL_TYPE_CALDAV = 'caldav';
    public const CAL_TYPE_ICAL = 'ical';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Start date of the non-working time period
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $date_from = '';

    /**
     * End date of the non-working time period
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $date_to = '';

    /**
     * Weekday of the non-working time period starting from
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $weekday_from = '';

    /**
     * Weekday of the non-working time period ending at
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $weekday_to = '';

    /**
     * Start time of the non-working time period
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $time_from = '';

    /**
     * End time of the non-working time period
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $time_to = '';

    /**
     * Action to be taken during the specified non-working time period
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $action = '';

    /**
     * Internal number to which the call will be forwarded during non-working time
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * Sound file played during non-working time
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $audio_message_id = '';

    /**
     * Description of this non-working time rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Enable restriction of this non-working time rule only for specific incoming routes
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $allowRestriction = '0';

    /**
     * Priority level of the routing rule
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $priority = '0';

    /**
     * Calendar type
     * @Column(type="string", nullable=true)
     */
    public ?string $calType = '';

    /**
     * Calendar url
     * @Column(type="string", nullable=true)
     */
    public ?string $calUrl = '';

    /**
     * Calendar user
     * @Column(type="string", nullable=true)
     */
    public ?string $calUser = '';

    /**
     * Calendar secret
     * @Column(type="string", nullable=true)
     */
    public ?string $calSecret = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_OutWorkTimes');
        parent::initialize();

        // Establish a belongsTo relationship with the Extensions model
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );


        // Establish a belongsTo relationship with the SoundFiles model
        $this->belongsTo(
            'audio_message_id',
            SoundFiles::class,
            'id',
            [
                'alias' => 'SoundFiles',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]

        );

        // Establish a hasMany relationship with the OutWorkTimesRouts model
        $this->hasMany(
            'id',
            OutWorkTimesRouts::class,
            'timeConditionId',
            [
                'alias' => 'OutWorkTimesRouts',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::ACTION_CASCADE
                    // Delete all related OutWorkTimesRouts when deleted
                ],
            ]
        );
    }
}

