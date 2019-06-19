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

class CustomFiles extends ModelsBase
{
    public $id;
    public $filepath;
    public $content;
    public $mode;
    public $changed;
    public $description;
    //append - добавить в конец файла
    //override - переопределить
    //none - ничего не делать

    public function getSource()
    {
        return 'm_CustomFiles';
    }

    public function initialize() {
	    parent::initialize();
    }

	public function validation()
    {

        $validation = new \Phalcon\Validation();
        $validation->add('filepath', new UniquenessValidator([
            'message' => $this->t("mo_ThisFilepathMustBeUniqueForCustomFilesModels")
        ]));
        return $this->validate($validation);
    }

    public function setContent($text) {
        $this->content = base64_encode($text);
    }
    public function getContent() {
        return base64_decode($this->content);
    }
}