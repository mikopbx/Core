<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Security\Random;
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
     * Unique identifier for the SIP account
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * Flag indicating whether the SIP account is disabled or not
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '0';

    /**
     * Internal number assigned to this SIP account
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * Type of SIP account
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $type = '';

    /**
     * Registration type of the SIP account (outbound, inbound, none)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $registration_type = '';

    /**
     * Host or IP address of the SIP server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $host = '';

    /**
     *  Port number for the SIP server (default: 5060)
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $port = '5060';

    /**
     * Username for authentication with the SIP server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * Secret password for authentication with the SIP server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = '';

    /**
     * Transport protocol used for SIP communication (TLS / UDP / TCP)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $transport = '';

    /**
     * Outbound proxy server for SIP communication
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $outbound_proxy = '';

    /**
     *  From user identity for SIP messages
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $fromuser = '';

    /**
     * From domain for SIP messages
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $fromdomain = '';

    /**
     * NAT (Network Address Translation) settings for SIP communication
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $nat = '';

    /**
     *  DTMF (Dual Tone Multi-Frequency) mode for SIP communication
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dtmfmode = '';

    /**
     * Frequency of SIP qualify requests in seconds
     *
     * @Column(type="integer", nullable=true)
     */
    public ?int $qualifyfreq = 60;

    /**
     * Flag indicating whether SIP qualify requests are enabled or disabled (1 = enabled, 0 = disabled)
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $qualify = '1';

    /**
     * The network filter associated with the SIP account
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = '';

    /**
     * Manual attributes for SIP configuration
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $manualattributes = '';

    /**
     *  Flag indicating whether the "fromuser" field should be disabled (0 = enabled, 1 = disabled)
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $disablefromuser = '0';

    /**
     * Flag indicating whether SIP registration is disabled (0 = enabled, 1 = disabled)
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $noregister = '0';

    /**
     * Flag indicating whether to receive incoming calls without authentication (0 = disabled, 1 = enabled)
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $receive_calls_without_auth = '0';

    /**
     * Description of the SIP account
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Flag indicating whether call recording is enabled for the SIP account (0 = disabled, 1 = enabled)
     *
     * @Column(type="integer", nullable=true, default="1")
     */
    public ?string $enableRecording = '1';


    /**
     * Status of the peer secret check by weak dictionary (0 = not checked, 1 = ok, 2 = weak).
     *
     * @Column(type="integer", nullable=true, default="0")
     */
    public ?string $weakSecret= '0';

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
    public function setManualAttributes(string $text): void
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

    /**
     * Generates a random SIP password.
     *
     * @return string The generated SIP password.
     */
    public static function generateSipPassword(): string
    {
        $random = new Random();
        $passwordLength = 8;
        try {
            $password = $random->base64Safe($passwordLength);
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $password = md5(microtime());
        }
        return $password;
    }

    /**
     * Generates a random unique id.
     *
     * @return string The generated unique id.
     */
    public static function generateUniqueID($alias=''):string
    {
        if (empty($alias)){
            $alias = Extensions::TYPE_SIP.'-PHONE-';
        }
        return parent::generateUniqueID($alias);
    }

}