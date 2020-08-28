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
    public ?string $uniqid = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $disabled = '0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $type = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $host = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $port = '5060';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $defaultuser = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $fromuser = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $fromdomain = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $nat = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dtmfmode = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $qualifyfreq = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $qualify = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $busylevel = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $manualattributes = '';


    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $disablefromuser = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $noregister = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $receive_calls_without_auth = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';


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