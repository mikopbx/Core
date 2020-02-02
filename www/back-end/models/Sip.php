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

class Sip extends ModelsBase
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
     * @Column(type="integer", nullable=true)
     */
    public $disabled;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * @Column(type="string", nullable=true)
     */
    public $type;

    /**
     * @Column(type="string", nullable=true)
     */
    public $host;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $port;

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
    public $defaultuser;

    /**
     * @Column(type="string", nullable=true)
     */
    public $fromuser;

    /**
     * @Column(type="string", nullable=true)
     */
    public $fromdomain;

    /**
     * @Column(type="string", nullable=true)
     */
    public $nat;

    /**
     * @Column(type="string", nullable=true)
     */
    public $dtmfmode;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $qualifyfreq;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $qualify;

    /**
     * @Column(type="string", nullable=true)
     */
    public $busylevel;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $networkfilterid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $manualattributes;

    /**
     * @Column(type="string", nullable=true)
     */
    public $manualregister;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $disablefromuser;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $noregister;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $receive_calls_without_auth;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function getSource(): string
    {
        return 'm_Sip';
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
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION //Всегда сначала удаляем Extensions, а он удалит SIP
                ],
            ]
        );

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
        $this->hasMany(
            'uniqid',
            'Models\SipCodecs',
            'sipuid',
            [
                'alias'      => 'Codecs',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\Codecs',
                    'action'     => Relation::ACTION_CASCADE,
                ],
                'params'     => [
                    'order' => 'priority asc',
                ],
            ]
        );

        $this->belongsTo(
            'uniqid',
            'Models\Providers',
            'sipuid',
            [
                'alias'      => 'Providers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    public function setManualAttributes($text): void
    {
        $this->manualattributes = base64_encode($text);
    }

    public function getManualAttributes(): string
    {
        return base64_decode($this->manualattributes);
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForSIPModels'),
        ]));

        return $this->validate($validation);
    }

}