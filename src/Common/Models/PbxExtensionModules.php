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

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\SystemMessages;
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
     * Unique identifier of the external extension module
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * Name of the external extension module
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Version of the external extension module
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $version = '';

    /**
     * Developer of the external extension module
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $developer = '';

    /**
     * Developer's email of the external extension module
     *
     * @Column(type="string", nullable=true, column="supportemail")
     */
    public ?string $support_email = '';

    /**
     * Path where the external module is installed
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $path = '';

    /**
     * Description of the external extension module
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Links to the documentation of the external extension module
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $wiki_links = '';

    /**
     * Flag indicating whether the module is disabled
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '1';

    /**
     * Store the reason why the module was disabled as a flag
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $disableReason = '';

    /**
     * Store the reason why the module was disabled in text mode, some logs
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $disableReasonText = '';

    /**
     * Prepares an array of enabled modules params for reading
     * @return array
     */
    public static function getEnabledModulesArray(): array
    {
        // Check if it globally disabled
        if (PbxSettings::getValueByKey(PbxSettingsConstants::DISABLE_ALL_MODULES)==='1'){
            return [];
        }

        // Get the list of disabled modules
        $parameters = [
            'conditions' => 'disabled="0"',
            'columns' => 'uniqid',
            'cache' => [
                'key' => ModelsBase::makeCacheKey(PbxExtensionModules::class, 'getEnabledModulesArray'),
                'lifetime' => 3600,
            ]
        ];
        return PbxExtensionModules::find($parameters)->toArray();
    }

    /**
     * Prepares an array of modules params for reading
     * @return array
     */
    public static function getModulesArray(): array
    {
        $parameters = [
            'cache' => [
                'key' => ModelsBase::makeCacheKey(PbxExtensionModules::class, 'getModulesArray'),
                'lifetime' => 3600,
            ],
            'order'=>'id desc',
        ];
        return PbxExtensionModules::find($parameters)->toArray();
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_PbxExtensionModules');
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
        PBXConfModulesProvider::recreateModulesProvider();
    }

    /**
     * After change PBX modules need recreate shared services
     */
    public function afterDelete(): void
    {
        PBXConfModulesProvider::recreateModulesProvider();
    }
}

