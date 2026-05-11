<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Http;

/**
 * Filter HTTP request headers before forwarding into the worker queue.
 *
 * Rationale — see ADR in `src/PBXCoreREST/CLAUDE.md` (#HttpHeaderFilter).
 *
 * Background workers run in a separate process and read request data
 * from a Redis-backed queue. Phalcon's Request is not reachable inside
 * the worker, so actions can only see what was serialized into the
 * message envelope by {@see \MikoPBX\PBXCoreREST\Controllers\BaseController::prepareRequestMessage()}.
 *
 * Naively forwarding every incoming header would:
 *  - Leak `Authorization: Bearer <token>` and `Cookie: refreshToken=...`
 *    into the worker namespace where any module action can read them
 *    (and possibly log them).
 *  - Double the Redis queue payload on busy installations.
 *  - Force every action to handle header-name casing inconsistency.
 *
 * Policy — three layers:
 *  1. **Deny-list (final word).** Authorization, Cookie, Set-Cookie and
 *     any `Authentication-*` variant are stripped no matter what. This
 *     is the last check; allow-list cannot override it.
 *  2. **Allow-list (exact names).** Public-safe client/proxy metadata
 *     useful for diagnostics and self-check: X-Forwarded-* family,
 *     X-Real-IP, User-Agent, Referer, Origin, Host, Accept-Language.
 *  3. **Allow-prefix (namespaced).** Headers starting with
 *     `X-Mikopbx-` (reserved for core features) or `X-Module-`
 *     (reserved for extension modules) — lets future modules carry
 *     their own headers through without re-editing this class.
 *
 * Header names are normalised to **lowercase** in the output. Values
 * are forced to strings (array-typed values from `getHeaders()` are
 * joined with `, ` per RFC 7230 §3.2.2).
 *
 * Per-header value cap of {@see self::MAX_VALUE_LENGTH} bytes keeps a
 * pathological client from inflating the queue payload.
 */
final class ForwardedHeaderFilter
{
    /** Max bytes per header value — covers realistic XFF chains. */
    public const int MAX_VALUE_LENGTH = 1024;

    /** Public-safe headers forwarded by default. Compared case-insensitively. */
    public const array ALLOW_LIST = [
        'x-forwarded-for',
        'x-forwarded-proto',
        'x-forwarded-host',
        'x-forwarded-port',
        'x-real-ip',
        'user-agent',
        'referer',
        'origin',
        'host',
        'accept-language',
    ];

    /**
     * Headers starting with these prefixes are forwarded.
     *
     * Reserved namespaces:
     *  - `x-mikopbx-` : core features (rate-limit hints, debug toggles, …)
     *  - `x-module-`  : extension modules (per-module conventions)
     *
     * Comparison is case-insensitive.
     */
    public const array ALLOW_PREFIXES = [
        'x-mikopbx-',
        'x-module-',
    ];

    /**
     * Stripped unconditionally — never forwarded even if listed elsewhere.
     *
     * Comparison is case-insensitive on the lowercased canonical name.
     * Prefix `authentication-` covers any future Authentication-Info etc.
     */
    public const array DENY_LIST = [
        'authorization',
        'cookie',
        'set-cookie',
        'proxy-authorization',
        // CrowdSec / firewall-bouncer convention — same token as
        // `Authorization: Bearer`, recognised by Request::getBearerToken().
        // Must never reach worker actions.
        'x-api-key',
    ];

    public const array DENY_PREFIXES = [
        'authentication-',
    ];

    /**
     * Filter raw headers using the layered policy.
     *
     * @param array<string, mixed> $rawHeaders Header-Name => value | string[]
     *                                         (shape returned by Phalcon's
     *                                         {@see \Phalcon\Http\Request::getHeaders()}).
     * @return array<string, string> Lowercased name => string value.
     */
    public static function filter(array $rawHeaders): array
    {
        $out = [];

        foreach ($rawHeaders as $name => $value) {
            $canonical = strtolower((string)$name);

            if (self::isDenied($canonical)) {
                continue;
            }

            if (!self::isAllowed($canonical)) {
                continue;
            }

            $joined = is_array($value)
                ? implode(', ', array_map('strval', $value))
                : (string)$value;

            if ($joined === '') {
                continue;
            }

            if (strlen($joined) > self::MAX_VALUE_LENGTH) {
                $joined = substr($joined, 0, self::MAX_VALUE_LENGTH);
            }

            $out[$canonical] = $joined;
        }

        return $out;
    }

    /**
     * Final-word check: header must never be forwarded.
     */
    private static function isDenied(string $canonical): bool
    {
        if (in_array($canonical, self::DENY_LIST, true)) {
            return true;
        }
        foreach (self::DENY_PREFIXES as $prefix) {
            if (str_starts_with($canonical, $prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * True when header is either in the allow-list or matches an allow-prefix.
     */
    private static function isAllowed(string $canonical): bool
    {
        if (in_array($canonical, self::ALLOW_LIST, true)) {
            return true;
        }
        foreach (self::ALLOW_PREFIXES as $prefix) {
            if (str_starts_with($canonical, $prefix)) {
                return true;
            }
        }
        return false;
    }
}
