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
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

class ExternalPhones extends ModelsBase
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
    public $extension;

    /**
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public $uniqid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $dialstring;

    /**
     * @Column(type="string", nullable=true)
     */
    public $manualdialplanincoming;

    /**
     * @Column(type="string", nullable=true)
     */
    public $manualdialplanoutgoing;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $disabled;

    public function getSource(): string
    {
        return 'm_ExternalPhones';
    }

    public function initialize(): void
    {
        parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION // Всегда сначала удаляем Extensions, а он удалит ExternalPhones
                ],
            ]
        );
    }

    public function validation()
    {
        $validation = new Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidNotUniqueForExternalPhonesModels'),
        ]));

        return $this->validate($validation);
    }
}