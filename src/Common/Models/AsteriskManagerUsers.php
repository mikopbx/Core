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
 * Class AsteriskManagerUsers
 *
 * @package MikoPBX\Common\Models
 */
class AsteriskManagerUsers extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * AMI users username
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $username = null;

    /**
     * AMI users password
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $call = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $cdr = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $originate = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $reporting = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $agent = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $config = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dialplan = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dtmf = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $log = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $system = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $user = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $verbose = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = null;

    /**
     * AMI users Description
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = null;

    public function initialize(): void
    {
        $this->setSource('m_AsteriskManagerUsers');
        parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            NetworkFilters::class,
            'id',
            [
                'alias'      => 'NetworkFilters',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'username',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUsernameNotUniqueForStorageModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}