<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * @method static mixed findFirstByUniqid(array|string|int $parameters=null)
 */
class Storage extends ModelsBase
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
    public $name;

    /**
     * @Column(type="string", nullable=true)
     */
    public $device;

    /**
     * @Column(type="string", nullable=true)
     */
    public $mountpoint;

    /**
     * @Column(type="string", nullable=true)
     */
    public $uniqid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $filesystemtype;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $media;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $persistence;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $astlogs;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $voicemailarchive;


    /**
     * @Column(type="integer", nullable=true)
     */
    public $syslog;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $check_when_booting;

    public function initialize(): void
    {
        $this->setSource('m_Storage');
        parent::initialize();
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add('device', new UniquenessValidator([
            'message' => $this->t("mo_ThisDeviceNotUniqueForStorageModels"),
        ]));
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t("mo_ThisUniqidNotUniqueForStorageModels"),
        ]));

        return $this->validate($validation);
    }

}