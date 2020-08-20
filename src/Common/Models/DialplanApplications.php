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
 * Class DialplanApplications
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
class DialplanApplications extends ModelsBase
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
     * @Column(type="string", nullable=true)
     */
    public $name;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $hint;

    /**
     * @Column(type="string", nullable=true)
     */
    public $applicationlogic;

    /**
     * @Column(type="string", nullable=true) {'plaintext'|'php'}
     */
    public $type;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function initialize(): void
    {
        $this->setSource('m_DialplanApplications');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION //DialplanApplications удаляем через его Extension
                ],
            ]
        );
    }

    public function getApplicationlogic(): string
    {
        return base64_decode($this->applicationlogic);
    }

    public function setApplicationlogic($text): void
    {
        $this->applicationlogic = base64_encode($text);
    }

    public function validation(): bool
    {
        $validation = new Validation();

        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidNotUniqueForDialplanApplicationsModels'),
                ]
            )
        );

        $validation->add(
            'extension',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisExtensionNotUniqueForDialplanApplicationsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}