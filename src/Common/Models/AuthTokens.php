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

use Phalcon\Mvc\Model\Behavior\Timestampable;

/**
 * Class AuthTokens
 *
 * @package MikoPBX\Common\Models
 */
class AuthTokens extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Hashed token value
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $tokenHash = '';

    /**
     * Serialized session parameters
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $sessionParams = '';

    /**
     * Expiry date of the token
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $expiryDate = '';


    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_AuthTokens');
        parent::initialize();
    }

}