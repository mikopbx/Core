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
 * Class Iax
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
class Iax extends ModelsBase
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
    public ?string $uniqid = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $username = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $host = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $qualify = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $disabled = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $noregister = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $manualattributes = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = null;


    public function initialize(): void
    {
        $this->setSource('m_Iax');
        parent::initialize();
        $this->belongsTo(
            'uniqid',
            Providers::class,
            'iaxuid',
            [
                'alias'      => 'Providers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    public function getManualAttributes(): string
    {
        return base64_decode($this->manualattributes);
    }

    public function setManualAttributes($text): void
    {
        $this->manualattributes = base64_encode($text);
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForIAXModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

}

