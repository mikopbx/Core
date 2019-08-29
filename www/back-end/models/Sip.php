<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

use Phalcon\Mvc\Model\Relation;

class Sip extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $uniqid;

    /**
     * @var integer
     */
    public $disabled;

    /**
     * @var string
     */
    public $extension;

    /**
     * @var string
     */
    public $type;

    /**
     * @var string
     */
    public $host;

    /**
     * @var integer
     */
    public $port;

    /**
     * @var string
     */
    public $username;

    /**
     * @var string
     */
    public $secret;

    /**
     * @var string
     */
    public $defaultuser;

    /**
     * @var string
     */
    public $fromuser;

    /**
     * @var string
     */
    public $fromdomain;

    /**
     * @var string
     */
    public $nat;

    /**
     * @var string
     */
    public $dtmfmode;

    /**
     * @var integer
     */
    public $qualifyfreq;

    /**
     * @var integer
     */
    public $qualify;

    /**
     * @var string
     */
    public $busylevel;

    /**
     * @var integer
     */
    public $networkfilterid;

    /**
     * @var integer
     */
    public $manualattributes;

    /**
     * @var string
     */
    public $manualregister;

    /**
     * @var integer
     */
    public $disablefromuser;

    /**
     * @var integer
     */
    public $noregister;

    /**
     * @var integer
     */
    public $receive_calls_without_auth;

    /**
     * @var string
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

    public function setManualAttributes($text) :void
    {
        $this->manualattributes = base64_encode($text);
    }

    public function getManualAttributes() :string
    {
        return base64_decode($this->manualattributes);
    }

    public function validation() :bool
    {
        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForSIPModels'),
        ]));

        return $this->validate($validation);
    }

}