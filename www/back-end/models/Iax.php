<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;
use Phalcon\Mvc\Model\Relation;

class Iax extends ModelsBase
{
    public $id;
    public $uniqid;
    public $username;
    public $secret;
    public $host;
    public $qualify;
    public $disabled;
    public $noregister;
    public $manualattributes;
    public $description;

    public function getSource()
    {
        return 'm_Iax';
    }

    public function initialize()
    {
	    parent::initialize();
        $this->hasMany(
            'uniqid',
            'Models\IaxCodecs',
            'iaxuid',
            [
                "alias"=>"Codecs",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_CASCADE
                ],
                'params' => array(
                    'order' => 'priority asc'
                )
            ]
        );

        $this->belongsTo(
            'uniqid',
            'Models\Providers',
            'iaxuid',
            [
                "alias"=>"Providers",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE,
                ]
            ]
        );
    }

	public function setManualAttributes( $text ) {
		$this->manualattributes = base64_encode( $text );
	}

	public function getManualAttributes() {
		return base64_decode( $this->manualattributes );
	}

    public function validation()
    {

        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t("mo_ThisUniqidMustBeUniqueForIAXModels")
        ]));
        return $this->validate($validation);


    }

}

