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
class OutWorkTimesRouts extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Reference to the record in the OutWorkTimes table
     *
     * @Column(type="integer", nullable=false)
     */
    public $timeConditionId;

    /**
     * Reference to the record in the IncomingRoutingTable table
     *
     * @Column(type="string", nullable=false)
     */
    public $routId;

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_OutWorkTimesRouts');
        parent::initialize();

        // Establish a belongsTo relationship with the OutWorkTimes model
        $this->belongsTo(
            'timeConditionId',
            OutWorkTimes::class,
            'id',
            [
                'alias' => 'OutWorkTimes',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );

        // Establish a hasOne relationship with the IncomingRoutingTable model
        $this->hasOne(
            'routId',
            IncomingRoutingTable::class,
            'id',
            [
                'alias' => 'IncomingRoutingTable',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
    }
}

