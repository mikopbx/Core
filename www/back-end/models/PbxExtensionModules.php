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

    public $id;
    public $uniqid;
    public $name;
    public $version;
    public $developer;
	public $support_email;
    public $path;
    public $description;
	public $disabled;

    public function getSource()
    {
        return 'm_PbxExtensionModules';
    }

    public function initialize() {
	    parent::initialize();
	    $this->hasMany(
		    'uniqid',
		    'Models\PbxExtensionRelationship',
		    'moduleUniqid',
		    [
			    "alias"      => "PbxExtensionRelationship",
			    "foreignKey" => [
				    "allowNulls" => FALSE,
				    "action"     => Relation::ACTION_CASCADE,
			    ],
		    ]
	    );

    }

	public function validation()
    {
        $validation = new Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t("mo_ThisUniqidMustBeUniqueForPbxExtensionModulesModels")
        ]));
        return $this->validate($validation);
    }

	public static function ifModule4ExtensionDisabled( String $number ) {
		$module = PbxExtensionModules::getModuleByExtension( $number );
		if ( $module ) {
			return $module->disabled;
		} else {
			return TRUE;
		}

	}

	public static function getModuleByExtension( String $number ) {
		$result     = FALSE;
		$parameters = [
			'conditions' => 'model = :model: 
    		            and alias = moduleUniqid
    		            and fields = :fields:
    		            and action = :action:
    		            ',
			'bind'       => [
				'model'  => 'Models\Extensions',
				'fields' => 'number',
				'action' => '2',
			],
		];

		$relationship = PbxExtensionRelationship::find( $parameters );
		foreach ( $relationship as $rule ) {
			$model      = $rule->referenceModel;
			if ( ! class_exists( $model ) ) {
				continue;
				//throw new \Exception( 'Error on getModuleByExtension: "Database corrupted"' );
			}
			$parameters = [
				'conditions' => "{$rule->referencedFields} = :number:",
				'bind'       => [
					'number' => $number,
				],
			];

			$record     = $model::findFirst( $parameters );
			if ( $record ) {
				$result = $rule->PbxExtensionModules;
				break;
			}
		}

		return $result;
	}

}

