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

/**
 * Class LongPollSubscribe
 *
 * @package MikoPBX\Common\Models
 */
class LongPollSubscribe extends ModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Action associated with the long poll subscription
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $action = '';

    /**
     * Data associated with the long poll subscription
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $data = '';

    /**
     * Channel for the long poll subscription
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $channel = '';

    /**
     * Timeout duration for the long poll subscription
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $timeout = '';

    /**
     * Enable flag for the long poll subscription
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $enable = '0';


    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_LongPollSubscribe');
        parent::initialize();
    }
}