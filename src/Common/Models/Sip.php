<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
     * @Column(type="string", length=1, nullable=false)
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
    public ?int $qualifyfreq = 60;

    /**
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $qualify = '1';

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
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $disablefromuser = '0';

    /**
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $noregister = '0';

    /**
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $receive_calls_without_auth = '0';

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

        $this->hasMany(
            'uniqid',
            SipHosts::class,
            'provider_id',
            [
                'alias'      => 'SipHosts',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE //Удалить подчиненные SipHosts
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