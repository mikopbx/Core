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

class ConferenceRooms extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public $uniqid;

    /**
     * Link to Extension
     *
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $name;

    public function getSource(): string
    {
        return 'm_ConferenceRooms';
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
                    'action'     => Relation::NO_ACTION // Удаляем всегда Extension, а он удалить эту запись
                ],
            ]
        );


    }

    public function validation()
    {

        $validation = new Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForConferenceRoomsModels'),
        ]));

        return $this->validate($validation);


    }
}