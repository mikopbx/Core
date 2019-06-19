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


class Storage extends ModelsBase
{

    public $id;
    public $name;
    public $uniqid;
    public $device;
    public $media;
    public $persistence;
    public $astlogs;
    public $faxarchive;
    public $voicemailarchive;
    public $mountpoint;
    public $filesystemtype;
    public $syslog;
    public $check_when_booting;


    public function getSource()
    {
        return 'm_Storage';
    }

    public function initialize() {
	    parent::initialize();
    }

	public function validation()
    {
        $validation = new \Phalcon\Validation();
        $validation->add('device', new UniquenessValidator([
            'message' => $this->t("mo_ThisDeviceNotUniqueForStorageModels")
        ]));
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t("mo_ThisUniqidNotUniqueForStorageModels")
        ]));
        return $this->validate($validation);
    }

}