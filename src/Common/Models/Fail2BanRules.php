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
 * Class Fail2BanRules
 *
 * @package MikoPBX\Common\Models
 */
class Fail2BanRules extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?int $maxretry = 5;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?int $bantime = 86400;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?int $findtime = 1800;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $whitelist = '';

    public function initialize(): void
    {
        $this->setSource('m_Fail2BanRules');
        parent::initialize();
    }
}