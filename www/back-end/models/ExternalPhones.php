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

class ExternalPhones extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $extension;

    /**
     * @var string
     */
    public $uniqid;

    /**
     * @var string
     */
    public $dialstring;

    /**
     * @var string
     */
    public $manualdialplanincoming;

    /**
     * @var string
     */
    public $manualdialplanoutgoing;

    /**
     * @var integer
     */
    public $disabled;

    public function getSource() :string 
    {
        return 'm_ExternalPhones';
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
                    'action'     => Relation::NO_ACTION // Всегда сначала удаляем Extensions, а он удалит ExternalPhones
                ]
            ]
        );
    }
    public function validation()
    {
        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidNotUniqueForExternalPhonesModels')
        ]));
        return $this->validate($validation);
    }
}