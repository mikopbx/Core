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
 * @method static mixed findFirstByUniqid(array|string|int $parameters=null)
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
    public $uniqid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $username;

    /**
     * @Column(type="string", nullable=true)
     */
    public $secret;

    /**
     * @Column(type="string", nullable=true)
     */
    public $host;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $qualify;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $disabled;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $noregister;

    /**
     * @Column(type="string", nullable=true)
     */
    public $manualattributes;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;


    public function initialize(): void
    {
        $this->setSource('m_Iax');
        parent::initialize();
        $this->hasMany(
            'uniqid',
            IaxCodecs::class,
            'iaxuid',
            [
                'alias'      => 'Codecs',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::ACTION_CASCADE,
                ],
                'params'     => [
                    'order' => 'priority asc',
                ],
            ]
        );

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
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForIAXModels'),
        ]));

        return $this->validate($validation);


    }

}

