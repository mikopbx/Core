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
 * Class Iax
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 * @property \MikoPBX\Common\Models\Providers Providers
 *
 * @package MikoPBX\Common\Models
 */
class Iax extends ModelsBase
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
    public ?string $uniqid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $host = '';

    /**
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $qualify = '';

    /**
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '0';

    /**
     *  @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $noregister = '0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $manualattributes = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';


    public function initialize(): void
    {
        $this->setSource('m_Iax');
        parent::initialize();
        $this->belongsTo(
            'uniqid',
            Providers::class,
            'iaxuid',
            [
                'alias'      => 'Providers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    public function getManualAttributes(): string
    {
        return base64_decode((string)$this->manualattributes);
    }

    public function setManualAttributes($text): void
    {
        $this->manualattributes = base64_encode($text);
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForIAXModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

}

