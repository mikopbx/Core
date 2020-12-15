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

/**
 * Class CallEventsLogs
 *
 * @package MikoPBX\Common\Models
 *
 * @Indexes(
 *     [name='eventtime', columns=['eventtime'], type=''],
 *     [name='app', columns=['app'], type=''],
 *     [name='linkedid', columns=['linkedid'], type='']
 * )
 */
class CallEventsLogs extends ModelsBase
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
    public ?string $eventtime = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $app = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $linkedid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $datajson = '';


    public function initialize(): void
    {
        $this->setSource('call_events');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbEventsLog');
    }

}