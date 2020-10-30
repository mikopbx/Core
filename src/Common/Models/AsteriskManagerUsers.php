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
    public ?string $username = '';

    /**
     * AMI users password
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $call = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $cdr = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $originate = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $reporting = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $agent = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $config = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dialplan = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dtmf = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $log = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $system = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $user = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $verbose = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = '';

    /**
     * AMI users Description
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

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