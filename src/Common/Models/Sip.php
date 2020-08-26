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
 * Class Sip
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
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
    public ?string $uniqid = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $disabled = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $type = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $host = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $port = null;

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
    public ?string $defaultuser = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $fromuser = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public  ?string $fromdomain = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $nat = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dtmfmode = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $qualifyfreq = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $qualify = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $busylevel = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $manualattributes = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $manualregister = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $disablefromuser = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $noregister = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $receive_calls_without_auth = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = null;


    public function initialize(): void
    {
        $this->setSource('m_Sip');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
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

        $this->belongsTo(
            'uniqid',
            Providers::class,
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
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForSIPModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

}