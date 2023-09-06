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
 * Class SipHosts
 *
 * @package MikoPBX\Common\Models
 * @property Sip Sip
 */
class SipHosts extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Link to the record of the associated SIP provider
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $provider_id = '';

    /**
     * IP address of the host associated with the SIP provider
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $address = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_SipHosts');
        parent::initialize();
        $this->belongsTo(
            'provider_id',
            Sip::class,
            'uniqid',
            [
                'alias' => 'Sip',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]

        );
    }

}