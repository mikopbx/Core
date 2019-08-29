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
    public $extension;

    /**
     * @var string
     */
    public $hint;

    /**
     * @var string
     */
    public $applicationlogic;

    /**
     * @var string {'plaintext'|'php'}
     */
    public $type;

    /**
     * @var string
     */
    public $description;

    public function getSource() :string
    {
        return 'm_DialplanApplications';
    }

    public function initialize() :void
    {
	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                'alias'=>'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION //DialplanApplications удаляем через его Extension
                ]
            ]
        );

    }

    public function setApplicationlogic($text) :void
    {
        $this->applicationlogic = base64_encode($text);
    }

    public function getApplicationlogic() :string
    {
        return base64_decode($this->applicationlogic);
    }

    public function validation() :bool
    {
        $validation = new \Phalcon\Validation();

        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidNotUniqueForDialplanApplicationsModels')
        ]));

        $validation->add('extension', new UniquenessValidator([
            'message' => $this->t('mo_ThisExtensionNotUniqueForDialplanApplicationsModels')
        ]));
        return $this->validate($validation);
    }
}