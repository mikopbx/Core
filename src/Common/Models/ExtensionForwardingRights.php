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
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class ExtensionForwardingRights
 *
 * @package MikoPBX\Common\Models
 */
class ExtensionForwardingRights extends ModelsBase
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
    public ?string $extension = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $forwarding = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $forwardingonbusy = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $forwardingonunavailable = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $ringlength = '';

    public function initialize(): void
    {
        $this->setSource('m_ExtensionForwardingRights');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => Extensions::class,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwarding',
            Extensions::class,
            'number',
            [
                'alias'      => 'ForwardingExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'ForwardingExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwardingonbusy',
            Extensions::class,
            'number',
            [
                'alias'      => 'ForwardingBusyExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'ForwardingBusyExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'forwardingonunavailable',
            Extensions::class,
            'number',
            [
                'alias'      => 'ForwardingUnavailableExtensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'ForwardingUnavailableExtensions',
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }

    public function validation(): bool
    {
        $validation = new Validation();


        $validation->add(
            'extension',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisExtensionNotUniqueForExtensionForwardingRightsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}

