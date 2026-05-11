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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Core\System\System;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Self-check: how does the PBX see the current HTTP client?
 *
 * Answer drives the Firewall page banner in Docker bridge mode and a
 * "Check my IP visibility" button — junior admins should be able to
 * diagnose the "my firewall rules don't seem to work" failure mode
 * without reading documentation.
 *
 * The HTTP-level data arrives via two envelope fields populated by
 * {@see \MikoPBX\PBXCoreREST\Controllers\BaseController::prepareRequestMessage()}:
 *  - `sessionContext.remote_addr` — request peer (Bearer-auth only).
 *  - `httpHeaders` — filtered subset of request headers per
 *    {@see \MikoPBX\PBXCoreREST\Http\ForwardedHeaderFilter}, lowercased
 *    keys. Authorization / Cookie / Authentication-* are stripped here
 *    and never reach actions.
 *
 * Verdict heuristics:
 *  - `proxy_detected` when X-Forwarded-For or X-Real-IP is present AND
 *    differs from `remote_addr` — there's a reverse proxy in front; the
 *    PBX is NOT going to see the real client IP unless nginx is
 *    configured with `real_ip_header` (it is not, by design).
 *  - `ip_not_visible` when the deployment is `bridge` mode Docker AND
 *    `remote_addr` falls inside an RFC1918 / docker-bridge range —
 *    almost certainly `userland-proxy=true` translating the real IP to
 *    the docker0 gateway. This is the "Firewall UI is lying to you"
 *    failure mode the bouncer endpoint is designed to fix.
 *  - `ip_visible` otherwise — bare-metal, LXC, Docker host-mode, or
 *    Docker bridge with `userland-proxy=false` so the real source IP
 *    survives.
 *
 * The heuristic is intentionally conservative on `bridge` — it can
 * still false-negative when the bouncer host genuinely lives inside
 * the docker bridge subnet (e.g., sidecar). Documented in the response
 * so the UI can offer "I know what I'm doing, dismiss this banner."
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class CheckClientIpVisibilityAction extends Injectable
{
    /**
     * @param array<string, mixed>  $sessionContext Bearer-auth context (remote_addr).
     * @param array<string, string> $httpHeaders    Filtered request headers (lowercased keys).
     */
    public static function main(array $sessionContext = [], array $httpHeaders = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $remoteAddr    = (string)($sessionContext['remote_addr'] ?? '');
        $xff           = self::firstNonEmpty($httpHeaders['x-forwarded-for'] ?? null);
        $xRealIp       = self::firstNonEmpty($httpHeaders['x-real-ip'] ?? null);
        $containerMode = System::getDockerNetworkMode();
        $isDocker      = System::isDocker();

        $res->data = [
            'remote_addr'     => $remoteAddr,
            'x_forwarded_for' => $xff,
            'x_real_ip'       => $xRealIp,
            'container_mode'  => $containerMode,
            'is_docker'       => $isDocker,
            'verdict'         => self::computeVerdict($remoteAddr, $xff, $xRealIp, $containerMode),
        ];
        $res->success = true;
        $res->httpCode = 200;
        return $res;
    }

    /**
     * Normalise a comma-list header to its first non-empty entry.
     *
     * `X-Forwarded-For` arrives as `client, proxy1, proxy2` after a
     * chain of hops; we care about the original client (first hop).
     * Returns null for empty / missing values so callers can keep a
     * tri-state (`present-and-different` vs `present-but-same` vs
     * `absent`).
     */
    private static function firstNonEmpty(?string $headerValue): ?string
    {
        if ($headerValue === null) {
            return null;
        }
        $first = trim(explode(',', $headerValue)[0] ?? '');
        return $first === '' ? null : $first;
    }

    /**
     * Compute the single-word verdict the UI maps to a human message.
     *
     * Order matters: proxy headers take precedence because they prove
     * the request is being relayed regardless of container topology.
     */
    private static function computeVerdict(
        string $remoteAddr,
        ?string $xForwardedFor,
        ?string $xRealIp,
        string $containerMode
    ): string {
        if (self::headerImpliesProxy($remoteAddr, $xForwardedFor)
            || self::headerImpliesProxy($remoteAddr, $xRealIp)
        ) {
            return 'proxy_detected';
        }

        if ($containerMode === 'bridge' && self::isPrivateOrDockerBridgeAddress($remoteAddr)) {
            return 'ip_not_visible';
        }

        return 'ip_visible';
    }

    /**
     * Proxy header present AND not pointing at the same IP as the peer.
     *
     * If a proxy forwards the original client unchanged (rare but
     * possible with overlay networks), the header equals `remote_addr`
     * and we treat the connection as direct. The header value is
     * expected to be already-first-hop (see {@see self::firstNonEmpty()}).
     */
    private static function headerImpliesProxy(string $remoteAddr, ?string $header): bool
    {
        return $header !== null && $header !== $remoteAddr;
    }

    /**
     * Crude detector for Docker bridge / RFC1918 source addresses.
     *
     * Docker's default bridge sits at 172.17.0.0/16; user-defined
     * bridges land anywhere in 172.16.0.0/12. Compose stacks often
     * pick 192.168.x.0/24. We also flag 10.0.0.0/8 — it's the same
     * "private LAN" failure mode from the user's perspective. IPv6
     * unique-local (fc00::/7) and the docker default `fd00::/8`
     * range are flagged too.
     */
    private static function isPrivateOrDockerBridgeAddress(string $ip): bool
    {
        if ($ip === '' || IpAddressHelper::getIpVersion($ip) === false) {
            return false;
        }

        if (IpAddressHelper::isIpv4($ip)) {
            return IpAddressHelper::ipInNetwork($ip, '10.0.0.0/8')
                || IpAddressHelper::ipInNetwork($ip, '172.16.0.0/12')
                || IpAddressHelper::ipInNetwork($ip, '192.168.0.0/16');
        }

        // IPv6: unique-local (fc00::/7) covers fc and fd prefixes
        return str_starts_with(strtolower($ip), 'fc')
            || str_starts_with(strtolower($ip), 'fd');
    }
}
