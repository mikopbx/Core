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
 * Class AsteriskManagerUsers
 *
 * @package MikoPBX\Common\Models
 */
class AsteriskManagerUsers extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * AMI users username
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * AMI users password
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $call = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $cdr = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $originate = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $reporting = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $agent = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $config = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dialplan = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dtmf = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $log = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $system = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $user = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $verbose = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = '';

    /**
     * AMI users Description
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    public function initialize(): void
    {
        $this->setSource('m_AsteriskManagerUsers');
        parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            NetworkFilters::class,
            'id',
            [
                'alias'      => 'NetworkFilters',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'username',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUsernameNotUniqueForStorageModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}