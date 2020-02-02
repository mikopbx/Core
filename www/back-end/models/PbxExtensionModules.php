<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Exception;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;
use Utilities\Debug\PhpError;

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

    public function getSource(): string
    {
        return 'm_PbxExtensionModules';
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForPbxExtensionModulesModels'),
        ]));

        return $this->validate($validation);
    }

    public static function ifModule4ExtensionDisabled(String $number): bool
    {
        try {
            $module = self::getModuleByExtension($number);
            if ($module) {
                return $module->disabled === '1';
            }
        } catch (Exception $e) {
            PhpError::exceptionHandler($e);
        }

        return true;

    }

    public static function getModuleByExtension(String $number)
    {
        $result         = false;
        $extension      = Extensions::findFirst("number ='{$number}'");
        $relatedLinks   = $extension->getRelatedLinks();
        $moduleUniqueID = false;
        foreach ($relatedLinks as $relation) {
            $obj = $relation['object'];
            if (strpos(get_class($obj), 'Modules\\') === 0) {
                $moduleUniqueID = explode('Models\\', get_class($obj))[1];
            }
        }
        if ($moduleUniqueID) {
            $result = self::findFirst("uniqid='{$moduleUniqueID}'");
        }

        return $result;
    }

}

