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

use MikoPBX\Core\System\PasswordService;
use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness as UniquenessValidator;
use Phalcon\Filter\Validation\Validator\Regex as RegexValidator;
use Phalcon\Filter\Validation\Validator\Callback as CallbackValidator;
use Phalcon\Mvc\Model\Relation;

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
    public const string TRANSPORT_AUTO = 'udp,tcp';
    public const string TRANSPORT_UDP = 'udp';
    public const string TRANSPORT_TCP = 'tcp';
    public const string TRANSPORT_TLS = 'tls';

    public const string REG_TYPE_OUTBOUND = 'outbound';
    public const string REG_TYPE_INBOUND = 'inbound';
    public const string REG_TYPE_NONE = 'none';

    // CallerID source options
    public const string CALLERID_SOURCE_DEFAULT = 'default';
    public const string CALLERID_SOURCE_FROM = 'from';
    public const string CALLERID_SOURCE_RPID = 'rpid';
    public const string CALLERID_SOURCE_PAI = 'pai';
    public const string CALLERID_SOURCE_CUSTOM = 'custom';

    // DID source options
    public const string DID_SOURCE_DEFAULT = 'default';
    public const string DID_SOURCE_TO = 'to';
    public const string DID_SOURCE_DIVERSION = 'diversion';
    public const string DID_SOURCE_CUSTOM = 'custom';

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
     * Type of SIP account (peer, friend)
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
     * Whether the endpoint should accept a second concurrent call (call waiting).
     * '0' = single line per device (device_state_busy_at = 1, BLF goes red on first call,
     *        queue/follow-me treat the user as busy on the first call).
     * '1' = call waiting (device_state_busy_at = 2, second call rings as a waiting call).
     * Power users can override device_state_busy_at via SIP manualattributes for higher values.
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $accept_multiple_calls = '0';


    /**
     * Status of the peer secret check by weak dictionary (0 = not checked, 1 = ok, 2 = weak).
     *
     * @Column(type="integer", nullable=true, default="0")
     */
    public ?string $weakSecret= '0';

    /**
     * Source for CallerID extraction (default, from, rpid, pai, custom)
     *
     * @Column(type="string", nullable=true, default="default")
     */
    public ?string $cid_source = 'default';

    /**
     * Custom header name for CallerID extraction when cid_source is 'custom'
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $cid_custom_header = '';

    /**
     * Start delimiter for CallerID parsing from custom header
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $cid_parser_start = '';

    /**
     * End delimiter for CallerID parsing from custom header
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $cid_parser_end = '';

    /**
     * Regular expression for CallerID parsing from custom header (optional)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $cid_parser_regex = '';

    /**
     * Source for DID extraction (default, to, diversion, custom)
     *
     * @Column(type="string", nullable=true, default="default")
     */
    public ?string $did_source = 'default';

    /**
     * Custom header name for DID extraction when did_source is 'custom'
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $did_custom_header = '';

    /**
     * Start delimiter for DID parsing from custom header
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $did_parser_start = '';

    /**
     * End delimiter for DID parsing from custom header
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $did_parser_end = '';

    /**
     * Regular expression for DID parsing from custom header (optional)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $did_parser_regex = '';

    /**
     * Debug mode for CallerID/DID processing (0 = disabled, 1 = enabled)
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $cid_did_debug = '0';

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

        // For inbound providers, validate username contains only allowed characters.
        // NOTE: use !== '' rather than empty() — empty('0') is true in PHP, and "0" is a
        // valid Login that SIPConf::getProviderSectionName() treats as non-empty (it uses
        // !== ''), so empty() here would silently exempt Login "0" from every guard below.
        $inboundLogin = ($this->registration_type === self::REG_TYPE_INBOUND) ? (string)($this->username ?? '') : '';
        if ($inboundLogin !== '') {
            $validation->add(
                'username',
                new RegexValidator(
                    [
                        'pattern' => '/^[a-zA-Z0-9._+*-]+$/',
                        'message' => $this->t('mo_SipUsernameInvalidCharacters'),
                    ]
                )
            );

            // Issue #1204: for INBOUND providers the pjsip aor/endpoint section name is the
            // username (not the uniqid), so two INBOUND providers sharing one Login emit
            // duplicate [username] objects. Asterisk 22 res_sorcery_config then rejects the
            // WHOLE pjsip.conf, taking down every trunk and extension. The uniqid Uniqueness
            // check above does not cover this (the offending rows have distinct uniqids), so
            // enforce Login uniqueness among INBOUND providers via a custom callback (NOT
            // Phalcon's built-in UniquenessValidator — it cannot filter by another column, and
            // would otherwise block re-enabling THIS row against an already-disabled sibling
            // that can never actually collide; see the disabled<>'1' filter below).
            //
            // Both collision checks below are skipped while this row is being saved as
            // disabled: a disabled row never renders into pjsip.conf (SIPConf::getProviders()/
            // getPeers() filter `disabled <> '1'`), so it cannot collide while disabled, and
            // blocking the save would also block the admin's natural fix — disabling one of
            // two pre-existing colliding rows via the quick status-only toggle
            // (SaveRecordAction::updateStatusOnly(), which calls save() with no other field
            // changed) must always succeed. The check re-applies the moment the row is
            // re-enabled (disabled becomes '0'), which is exactly when the risk re-appears.
            if ($this->disabled !== '1') {
                $validation->add(
                    'username',
                    new CallbackValidator(
                        [
                            'message' => $this->t('mo_SipInboundUsernameMustBeUnique'),
                            'callback' => function ($model) {
                                $conditions = "username = :username: AND registration_type = :regtype: "
                                    . "AND disabled <> '1'";
                                $bind = [
                                    'username' => $model->username,
                                    'regtype' => self::REG_TYPE_INBOUND,
                                ];
                                if (!empty($model->id)) {
                                    $conditions .= ' AND id <> :id:';
                                    $bind['id'] = $model->id;
                                }
                                $clash = Sip::findFirst([$conditions, 'bind' => $bind]);
                                return $clash === null;
                            },
                        ]
                    )
                );

                // Issue #1204: an INBOUND Login that equals an extension number collides with
                // that extension's pjsip objects — peers emit [{extension}](aor)/
                // [{extension}](endpoint) (SIPConf::generatePeerAor/Endpoint) while an INBOUND
                // provider emits [{username}] objects. Equal names in the same file => duplicate
                // object => Asterisk 22 rejects the whole pjsip.conf. Neither the uniqid nor the
                // Login-uniqueness check above sees this cross-namespace clash, so reject an
                // INBOUND Login that matches any enabled SIP peer's extension.
                $validation->add(
                    'username',
                    new CallbackValidator(
                        [
                            'message' => $this->t('mo_SipInboundUsernameClashesExtension'),
                            'callback' => function ($model) {
                                $clash = Sip::findFirst(
                                    [
                                        "type = 'peer' AND disabled <> '1' AND extension = :ext:",
                                        'bind' => ['ext' => $model->username],
                                    ]
                                );
                                return $clash === null;
                            },
                        ]
                    )
                );
            }
        }

        // Issue #1204 (other direction): an extension number that equals an existing INBOUND
        // provider's Login collides the same way, but from the peer/extension side. The guard
        // above only runs when saving the PROVIDER row, so renaming/creating an extension to
        // match an existing INBOUND Login would otherwise slip through unchecked. Same
        // disabled-skip reasoning as above: do not block saving this peer as disabled, only
        // when it is (re-)enabled.
        $peerExtension = ($this->type === 'peer') ? (string)($this->extension ?? '') : '';
        if ($peerExtension !== '' && $this->disabled !== '1') {
            $validation->add(
                'extension',
                new CallbackValidator(
                    [
                        'message' => $this->t('mo_SipExtensionClashesInboundUsername'),
                        'callback' => function ($model) {
                            $clash = Sip::findFirst(
                                [
                                    "type = 'friend' AND registration_type = :regtype: "
                                    . "AND disabled <> '1' AND username = :ext:",
                                    'bind' => [
                                        'regtype' => self::REG_TYPE_INBOUND,
                                        'ext' => $model->extension,
                                    ],
                                ]
                            );
                            return $clash === null;
                        },
                    ]
                )
            );
        }

        return $this->validate($validation);
    }

    /**
     * Generates a random SIP password.
     *
     * @param int $length Password length (default: 20) for Grandstream GDMS compatibility without special characters
     * @return string The generated SIP password.
     */
    public static function generateSipPassword(int $length = 20): string
    {
        return PasswordService::generate(['length' => $length, 'includeSpecial' => false]);
    }

    /**
     * Generates a random unique id.
     *
     * @return string The generated unique id.
     */
    public static function generateUniqueID(string $alias = ''):string
    {
        if (empty($alias)){
            $alias = Extensions::PREFIX_SIP;
        }
        return parent::generateUniqueID($alias);
    }

}