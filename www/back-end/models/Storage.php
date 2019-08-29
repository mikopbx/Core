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
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $name;

    /**
     * @var string
     */
    public $uniqid;

    /**
     * @var string
     */
    public $device;

    /**
     * @var integer
     */
    public $media;

    /**
     * @var integer
     */
    public $persistence;

    /**
     * @var integer
     */
    public $astlogs;

    /**
     * @var string
     */
    public $faxarchive;

    /**
     * @var integer
     */
    public $voicemailarchive;

    /**
     * @var string
     */
    public $mountpoint;

    /**
     * @var string
     */
    public $filesystemtype;

    /**
     * @var integer
     */
    public $syslog;

    /**
     * @var integer
     */
    public $check_when_booting;


    public function getSource() :string
    {
        return 'm_Storage';
    }


	public function validation() :bool
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