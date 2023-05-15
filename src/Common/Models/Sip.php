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
 * @property SipHosts SipHosts
 * @property Providers Providers
 * @property Extensions Extensions
 * @property NetworkFilters NetworkFilters
 *
 * @package MikoPBX\Common\Models
 */
class Sip extends ModelsBase
{
    public const TRANSPORT_UDP_TCP = '';
    public const TRANSPORT_UDP = 'udp';
    public const TRANSPORT_TCP = 'tcp';
    public const TRANSPORT_TLS = 'tls';

    public const REG_TYPE_OUTBOUND = 'outbound';
    public const REG_TYPE_INBOUND = 'inbound';
    public const REG_TYPE_NONE = 'none';

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
    public ?string $registration_type = '';

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
     * TLS / UDP / TCP
     * @Column(type="string", nullable=true)
     */
    public ?string $transport = '';

    /**
     * outbound_proxy
     * @Column(type="string", nullable=true)
     */
    public ?string $outbound_proxy = '';

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

    /**
     * @Column(type="integer", nullable=true, default="1")
     */
    public ?string $enableRecording = '1';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_Sip');
        parent::initialize();

        // Establish a belongsTo relationship with the Extensions model
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION
                    // Always delete Extensions first, and it will delete SIP records
                ],
            ]
        );

        // Establish a belongsTo relationship with the NetworkFilters model
        $this->belongsTo(
            'networkfilterid',
            NetworkFilters::class,
            'id',
            [
                'alias' => 'NetworkFilters',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );

        // Establish a belongsTo relationship with the Providers model
        $this->belongsTo(
            'uniqid',
            Providers::class,
            'sipuid',
            [
                'alias' => 'Providers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );

        // Establish a hasMany relationship with the SipHosts model
        $this->hasMany(
            'uniqid',
            SipHosts::class,
            'provider_id',
            [
                'alias' => 'SipHosts',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE
                    // Delete associated SipHosts records
                ],
            ]
        );
    }

    /**
     * Decode and retrieve the manual attributes.
     *
     * @return string The decoded manual attributes.
     */
    public function getManualAttributes(): string
    {
        return base64_decode((string)$this->manualattributes);
    }

    /**
     * Encode and set the manual attributes.
     *
     * @param string $text The manual attributes text to be encoded and set.
     */
    public function setManualAttributes($text): void
    {
        $this->manualattributes = base64_encode($text);
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
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