<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

class DialplanApplications extends ModelsBase
{
    public $id;
    public $uniqid;
    public $name;
    public $extension;
    public $hint;
    public $applicationlogic;
    public $type;
    public $description;

    public function getSource()
    {
        return 'm_DialplanApplications';
    }
    public function initialize()
    {
	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                "alias"=>"Extensions",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::NO_ACTION //DialplanApplications удаляем через его Extension
                ]
            ]
        );

    }
    public function setApplicationlogic($text) {
        $this->applicationlogic = base64_encode($text);
    }
    public function getApplicationlogic() {
        return base64_decode($this->applicationlogic);
    }

    public function validation()
    {
        $validation = new \Phalcon\Validation();

        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t("mo_ThisUniqidNotUniqueForDialplanApplicationsModels")
        ]));

        $validation->add('extension', new UniquenessValidator([
            'message' => $this->t("mo_ThisExtensionNotUniqueForDialplanApplicationsModels")
        ]));
        return $this->validate($validation);
    }
}