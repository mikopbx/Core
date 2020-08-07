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
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
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
    public $uniqid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $name;

    /**
     * @Column(type="string", nullable=true)
     */
    public $version;

    /**
     * @Column(type="string", nullable=true)
     */
    public $developer;

    /**
     * @Column(type="string", nullable=true, column="supportemail")
     */
    public $support_email;

    /**
     * @Column(type="string", nullable=true)
     */
    public $path;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $disabled;


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
}

