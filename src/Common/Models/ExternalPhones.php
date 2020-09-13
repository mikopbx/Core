<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class ExternalPhones
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
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
    public ?string $extension = '';

    /**
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dialstring = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $manualdialplanincoming = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $manualdialplanoutgoing = '';

    /**
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $disabled = '0';


    public function initialize(): void
    {
        $this->setSource('m_ExternalPhones');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
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
        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidNotUniqueForExternalPhonesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}