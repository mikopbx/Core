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
     * Name of the mounted storage disk
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Link to the system device for storing data
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $device = '';

    /**
     * Unique identifier of the storage device
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * File system type
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $filesystemtype = '';


    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $media = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_Storage');
        parent::initialize();
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
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