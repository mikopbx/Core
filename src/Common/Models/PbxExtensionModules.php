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

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Util;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class PbxExtensionModules
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
class PbxExtensionModules extends ModelsBase
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
    public ?string $name = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $version = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $developer = '';

    /**
     * @Column(type="string", nullable=true, column="supportemail")
     */
    public ?string $support_email = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $path = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '1';


    public function initialize(): void
    {
        $this->setSource('m_PbxExtensionModules');
        parent::initialize();
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForPbxExtensionModulesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * After change PBX modules need recreate shared services
     */
    public function afterSave(): void
    {
        Util::sysLogMsg(__METHOD__, "After save ", LOG_DEBUG);
        PBXConfModulesProvider::recreateModulesProvider();
    }

    /**
     * After change PBX modules need recreate shared services
     */
    public function afterDelete(): void
    {
        parent::afterDelete();
        PBXConfModulesProvider::recreateModulesProvider();
    }

    /**
     * Prepares array of enabled modules params for reading
     * @return array
     */
    public static function getEnabledModulesArray(): array
    {
        $parameters = [
            'conditions' => 'disabled="0"',
            'cache' => [
                'key'=> ModelsBase::makeCacheKey(PbxExtensionModules::class, 'getEnabledModulesArray'),
                'lifetime' => 3600,
            ]
        ];
        return PbxExtensionModules::find($parameters)->toArray();
    }

    /**
     * Prepares array of modules params for reading
     * @return array
     */
    public static function getModulesArray(): array
    {
        $parameters = [
            'cache' => [
                'key'=> ModelsBase::makeCacheKey(PbxExtensionModules::class, 'getModulesArray'),
                'lifetime' => 3600,
            ]
        ];
        return PbxExtensionModules::find($parameters)->toArray();
    }
}

