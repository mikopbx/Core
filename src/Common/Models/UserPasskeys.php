<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness;

/**
 * Class UserPasskeys
 *
 * Stores WebAuthn passkeys for passwordless authentication.
 * Each user can have multiple passkeys (different devices).
 * Uses login string directly without FK to Users table to support module authentication.
 *
 * @package MikoPBX\Common\Models
 */
class UserPasskeys extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Login string (admin login or module-provided login)
     * This is NOT a foreign key - supports both admin and module users
     *
     * @Column(type="string", nullable=false)
     */
    public string $login = '';

    /**
     * WebAuthn credential ID (base64url encoded)
     * Unique identifier for this passkey
     *
     * @Column(type="string", nullable=false)
     */
    public string $credential_id = '';

    /**
     * Public key data (base64 encoded COSE_key format)
     * Used to verify authentication assertions
     *
     * @Column(type="string", nullable=false)
     */
    public string $public_key = '';

    /**
     * Signature counter for replay attack prevention
     * Must increment with each authentication
     *
     * @Column(type="integer", nullable=false)
     */
    public int $counter = 0;

    /**
     * AAGUID (Authenticator Attestation GUID)
     * Identifies the type of authenticator
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $aaguid = '';

    /**
     * User-friendly name for this passkey
     * e.g., "iPhone 15", "YubiKey 5", "Windows Hello"
     *
     * @Column(type="string", nullable=false)
     */
    public string $name = '';

    /**
     * Timestamp when passkey was registered
     *
     * @Column(type="string", nullable=false)
     */
    public string $created_at = '';

    /**
     * Timestamp of last successful authentication
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $last_used_at = '';

    /**
     * Initialize the model
     */
    public function initialize(): void
    {
        $this->setSource('m_UserPasskeys');
        parent::initialize();
    }

    /**
     * Validation rules
     */
    public function validation(): bool
    {
        $validation = new Validation();

        // credential_id must be unique across all passkeys
        $validation->add(
            'credential_id',
            new Uniqueness(
                [
                    'message' => 'This credential is already registered',
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * Get display representation for this passkey
     *
     * @param bool $needLink Whether to return a link (not applicable for passkeys)
     * @return string
     */
    public function getRepresent(bool $needLink = false): string
    {
        return $this->name ?: $this->credential_id;
    }

    /**
     * Before create hook - set created_at timestamp
     */
    public function beforeCreate(): void
    {
        $this->created_at = date('Y-m-d H:i:s');
    }
}
