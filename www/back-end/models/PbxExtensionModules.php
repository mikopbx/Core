<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;
use Phalcon\Mvc\Model\Relation;

class PbxExtensionModules extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $uniqid;

    /**
     * @var string
     */
    public $name;

    /**
     * @var string
     */
    public $version;

    /**
     * @var string
     */
    public $developer;

    /**
     * @var string
     */
	public $support_email;

    /**
     * @var string
     */
    public $path;

    /**
     * @var string
     */
    public $description;

    /**
     * @var integer
     */
	public $disabled;

    public function getSource() :string 
    {
        return 'm_PbxExtensionModules';
    }

	public function validation() :bool 
    {
        $validation = new Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForPbxExtensionModulesModels')
        ]));
        return $this->validate($validation);
    }

	public static function ifModule4ExtensionDisabled( String $number ) :bool
    {
		$module = self::getModuleByExtension( $number );
		if ( $module ) {
			return $module->disabled ==='1';
		} else {
			return TRUE;
		}

	}

	public static function getModuleByExtension( String $number ) 
    {
		$result     = FALSE;
		$extension = Extensions::findFirst("number ='{$number}'");
		$relatedLinks = $extension->getRelatedLinks();
		$moduleUniqueID = false;
		foreach ($relatedLinks as $relation){
			$obj = $relation['object'];
			if (strpos(get_class($obj), 'Modules\\') === 0){
				$moduleUniqueID = explode('Models\\',get_class ($obj))[1];
			}
		}
		if ($moduleUniqueID){
			$result = self::findFirst("uniqid='{$moduleUniqueID}'");
		}
		return $result;
	}

}

