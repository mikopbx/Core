<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
     * @Column(type="integer", nullable=false)
     */
    public $timeConditionId;

    /**
     * @Column(type="integer", nullable=false)
     */
    public $routId;

    public function initialize(): void
    {
        $this->setSource('m_OutWorkTimesRouts');
        parent::initialize();
        $this->belongsTo(
            'timeConditionId',
            OutWorkTimes::class,
            'id',
            [
                'alias'      => 'OutWorkTimes',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->hasOne(
            'routId',
            IncomingRoutingTable::class,
            'id',
            [
                'alias'      => 'IncomingRoutingTable',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }
}

