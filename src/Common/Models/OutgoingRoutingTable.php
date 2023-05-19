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
 * Class OutgoingRoutingTable
 *
 * @package MikoPBX\Common\Models
 */
class OutgoingRoutingTable extends ModelsBase
{
    /**
     * The primary identifier for the outgoing routing table record
     *
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     *  The name of the outgoing routing rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $rulename = '';

    /**
     * The ID of the provider associated with the outgoing route
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $providerid = '';

    /**
     * The priority of the outgoing routing rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $priority = '0';

    /**
     * This outgoing routing rule will be triggered
     * if the dialed number starts with the pattern specified in this parameter.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $numberbeginswith = '';

    /**
     * This outgoing routing rule will be triggered if the dialed number starts with the pattern
     * specified in the $numberbeginswith parameter, and the remaining part of the number
     * consists of the digits specified in this parameter.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $restnumbers = '9';

    /**
     * The number of characters to trim from the beginning of the outgoing call number
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $trimfrombegin = '0';

    /**
     * The number of characters to prepend to the outgoing call number
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $prepend = '';

    /**
     * Additional notes or description for the outgoing routing rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $note = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_OutgoingRoutingTable');
        parent::initialize();

        // Establish a belongsTo relationship with the Providers model
        $this->belongsTo(
            'providerid',
            Providers::class,
            'uniqid',
            [
                'alias' => 'Providers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
    }
}

