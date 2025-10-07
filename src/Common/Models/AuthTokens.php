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

/**
 * Class AuthTokens
 *
 * SQLite storage for long-lived authentication tokens.
 *
 * Token storage strategy:
 * - TOKEN_TYPE_REMEMBER_ME: Stored in SQLite (this table) - Long-lived web app tokens
 *
 * For JWT refresh tokens, see RedisTokenStorage class which provides:
 * - O(1) lookup performance (vs O(n) SQLite scan)
 * - Automatic TTL expiration
 * - No need for hash verification loop
 *
 * @package MikoPBX\Common\Models
 * @see \MikoPBX\Common\Library\Auth\RedisTokenStorage For JWT refresh token storage
 *
 * @Indexes(
 *     [name='userid', columns=['userId'], type=''],
 *     [name='tokenhash', columns=['tokenHash'], type=''],
 *     [name='tokentype', columns=['tokenType'], type=''],
 *     [name='jti', columns=['jti'], type=''],
 *     [name='expirydate', columns=['expiryDate'], type=''],
 *     [name='lastusedat', columns=['userId', 'tokenType'], type='']
 * )
 */
class AuthTokens extends ModelsBase
{
    /**
     * Token types
     */
    public const string TOKEN_TYPE_REMEMBER_ME = 'remember_me';  // Web app remember me (stored in SQLite)

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Hashed token value (indexed for fast lookup)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $tokenHash = '';

    /**
     * User identifier (for quick filtering)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $userId = '';

    /**
     * Token type: remember_me, refresh, api
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $tokenType = self::TOKEN_TYPE_REMEMBER_ME;

    /**
     * Serialized session parameters (for remember_me tokens)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $sessionParams = '';

    /**
     * JWT ID for access tokens (for revocation)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $jti = '';

    /**
     * Expiry date of the token
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $expiryDate = '';

    /**
     * Last used timestamp (for rotation and analytics)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $lastUsedAt = '';

    /**
     * Client IP address (for security)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $clientIp = '';

    /**
     * User agent (for analytics and security)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $userAgent = '';


    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_AuthTokens');
        parent::initialize();
    }

    /**
     * Check if token is expired
     *
     * @return bool
     */
    public function isExpired(): bool
    {
        return strtotime($this->expiryDate) < time();
    }

    /**
     * Update last used timestamp
     */
    public function touch(): void
    {
        $this->lastUsedAt = date('Y-m-d H:i:s');
    }

}