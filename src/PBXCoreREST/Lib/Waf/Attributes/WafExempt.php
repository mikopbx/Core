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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\Waf\Attributes;

use Attribute;
use InvalidArgumentException;

/**
 * Declare that a REST controller (or one of its action methods) opts out of
 * specific WAF scopes documented in {@see WafExempt::ALLOWED_SCOPES}.
 *
 * The attribute is picked up at boot by {@see \MikoPBX\PBXCoreREST\Lib\Waf\WafRegistry}
 * and published to Redis as membership in six per-scope SETs under
 * `_PH_REDIS_CLIENT:waf:exempt:<scope>:<exact|prefix>`. The
 * `unified-security.lua` script consults those sets via `SISMEMBER` to skip
 * the corresponding WAF checks for the matching URI.
 *
 * PLACEMENT RULES:
 *  - **Class-level** placement publishes a prefix entry at the controller's
 *    `ApiResource::path`. It covers every concrete URI the Phalcon router
 *    enumerates for that controller — base path, `/{id}` children, and
 *    `:methodName` custom actions. Use this when the entire resource needs
 *    the same exemption (e.g. a webhook receiver or a dialplan editor).
 *  - **Method-level** placement publishes an exact entry. The URI is
 *    derived from the controller's `#[HttpMapping]` attribute when present,
 *    or from the well-known CRUD-name convention otherwise. Two cases:
 *      * Custom method (collection-level) → URI `<basePath>:<methodName>`.
 *      * CRUD collection methods (`create`, `getList`) → URI `<basePath>`.
 *      * CRUD resource methods (`update`, `patch`, `delete`, `getRecord`)
 *        AND resource-level custom methods (any method declared in the
 *        controller's `HttpMapping::resourceLevelMethods`, e.g. `copy`) →
 *        REJECTED with a syslog warning, because their routed URI is
 *        `<basePath>/{id}` or `<basePath>/{id}:<methodName>` and is not
 *        representable as exact match. Move the attribute to the class.
 *
 * Allowed scopes:
 *  - `body-scan`    — skips SQL / traversal / null-byte checks in POST/PUT/PATCH body
 *  - `request-line` — skips SQL / traversal / null-byte checks on URI / args / UA
 *  - `rate-limit`   — skips per-IP rate limiting
 *
 * The `reason` argument is documentation only and is intentionally not exposed
 * to Redis or Lua.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Waf\Attributes
 */
#[Attribute(Attribute::TARGET_CLASS | Attribute::TARGET_METHOD)]
final readonly class WafExempt
{
    /**
     * @var array<int, string>
     */
    public const array ALLOWED_SCOPES = ['body-scan', 'request-line', 'rate-limit'];

    /**
     * @param array<int, string> $scopes One or more values from {@see self::ALLOWED_SCOPES}.
     * @param string $reason Human-readable justification for the exemption (documentation only).
     *
     * @throws InvalidArgumentException When the scopes array is empty or contains an unknown value.
     */
    public function __construct(
        public array $scopes,
        public string $reason = ''
    ) {
        if ($this->scopes === []) {
            throw new InvalidArgumentException(
                'WafExempt requires at least one scope (one of: '
                . implode(', ', self::ALLOWED_SCOPES) . ')'
            );
        }
        foreach ($this->scopes as $scope) {
            if (!is_string($scope) || !in_array($scope, self::ALLOWED_SCOPES, true)) {
                throw new InvalidArgumentException(sprintf(
                    'WafExempt: unknown scope "%s". Allowed: %s',
                    is_string($scope) ? $scope : gettype($scope),
                    implode(', ', self::ALLOWED_SCOPES)
                ));
            }
        }
    }
}
