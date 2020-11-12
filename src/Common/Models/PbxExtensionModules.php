<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use MikoPBX\Common\Providers\PBXConfModulesProvider;
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
        parent::afterSave();
        $this->di->remove('pbxConfModules');
        $this->di->register(new PBXConfModulesProvider());
    }

    /**
     * After change PBX modules need recreate shared services
     */
    public function afterDelete(): void
    {
        parent::afterDelete();
        $this->di->remove('pbxConfModules');
        $this->di->register(new PBXConfModulesProvider());
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
                'key'=>'PbxExtensionModules-Enabled',
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
                'key'=>'PbxExtensionModules-All',
                'lifetime' => 3600,
            ]
        ];
        return PbxExtensionModules::find($parameters)->toArray();
    }
}

