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

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class Storage
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 * @package MikoPBX\Common\Models
 */
class Storage extends ModelsBase
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
    public ?string $name = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $device = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $mountpoint = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $filesystemtype = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $media = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $persistence = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $astlogs = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $voicemailarchive = '';


    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $syslog = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $check_when_booting = '';

    public function initialize(): void
    {
        $this->setSource('m_Storage');
        parent::initialize();
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'device',
            new UniquenessValidator(
                [
                    'message' => $this->t("mo_ThisDeviceNotUniqueForStorageModels"),
                ]
            )
        );
        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t("mo_ThisUniqidNotUniqueForStorageModels"),
                ]
            )
        );

        return $this->validate($validation);
    }

}