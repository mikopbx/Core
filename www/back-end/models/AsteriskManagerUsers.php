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
    public $username;

    /**
     * AMI users password
     *
     * @Column(type="string", nullable=true)
     */
    public $secret;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $call;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $cdr;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $originate;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $reporting;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $agent;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $config;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $dialplan;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $dtmf;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $log;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $system;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $user;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $verbose;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $networkfilterid;

    /**
     * AMI users Description
     *
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function getSource(): string
    {
        return 'm_AsteriskManagerUsers';
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add('username', new UniquenessValidator([
            'message' => $this->t('mo_ThisUsernameNotUniqueForStorageModels'),
        ]));

        return $this->validate($validation);
    }

    public function initialize(): void
    {
        parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            'Models\NetworkFilters',
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
}