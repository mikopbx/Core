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
 * Class DialplanApplications
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
class DialplanApplications extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $hint = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $applicationlogic = '';

    /**
     * @Column(type="string", nullable=true) {'plaintext'|'php'}
     */
    public ?string $type='plaintext';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    public function initialize(): void
    {
        $this->setSource('m_DialplanApplications');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION //DialplanApplications удаляем через его Extension
                ],
            ]
        );
    }

    public function getApplicationlogic(): string
    {
        return base64_decode($this->applicationlogic);
    }

    public function setApplicationlogic($text): void
    {
        $this->applicationlogic = base64_encode($text);
    }

    public function validation(): bool
    {
        $validation = new Validation();

        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidNotUniqueForDialplanApplicationsModels'),
                ]
            )
        );

        $validation->add(
            'extension',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisExtensionNotUniqueForDialplanApplicationsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}