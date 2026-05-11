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

namespace MikoPBX\PBXCoreREST\Lib\FirewallBouncer;

use MikoPBX\Core\System\DockerNetworkFilterService;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Build a CrowdSec-LAPI-compatible ban-decision snapshot.
 *
 * The response shape matches `/v1/decisions/stream` of a CrowdSec Local
 * API exactly (top-level `{new, deleted}`, no envelope), so stock
 * cs-firewall-bouncer and the rest of the CrowdSec ecosystem consume it
 * without custom code. The raw JSON is emitted via the `raw_json_body`
 * special-response channel in
 * {@see \MikoPBX\PBXCoreREST\Controllers\BaseController::handleRawJsonResponse()}
 * — without that bypass, the standard `Response::send()` re-wraps every
 * body into `{result, data, messages, meta}` and existing bouncers
 * cannot parse it.
 *
 * Note: this is the **MVP** behaviour — every poll returns the full
 * snapshot in `new` and `deleted` is always empty. Bouncers reapply
 * idempotently, so this is a valid LAPI variant and still simpler than
 * maintaining a delta-stream cursor.
 *
 * Two data sources are merged:
 *
 *   1. Redis ban set written by fail2ban for Docker bridge / userland
 *      proxy deployments — keys `firewall:{sip|http|ami|iax}:<ip>` with
 *      per-call TTL. Mapped to scenario `mikopbx/{category}` and origin
 *      `mikopbx-fail2ban`. CrowdSec `duration` is the remaining TTL,
 *      which is how `cs-firewall-bouncer` actually consumes the field
 *      (expiry countdown) — Redis does not preserve the original
 *      duration after `setex`, so no parallel storage is needed.
 *
 *   2. NetworkFilters deny rules from the operator's UI configuration.
 *      Persistent and category-agnostic — exposed as origin
 *      `mikopbx-networkfilters` with scenario `mikopbx/manual` and a
 *      long synthetic duration (`8760h`, one year) so bouncers do not
 *      expire them locally.
 *
 * The whitelist is intentionally NOT included in this response — LAPI
 * has no "allow" decision type and stock bouncers manage their own
 * whitelists via `whitelists.yaml`. Operator-defined whitelist entries
 * are exposed on the sibling endpoint
 * `/pbxcore/api/v3/firewall-bouncer/v1/whitelist` (custom MikoPBX
 * extension), and enforced server-side via
 * {@see DockerNetworkFilterService::isIpWhitelisted()} regardless.
 *
 * Stable `id` values via `crc32($ip . $scenario) & 0x7fffffff` mean
 * bouncers can deduplicate across polls even though we resend the
 * whole snapshot. CrowdSec requires positive 32-bit signed ints.
 *
 * @package MikoPBX\PBXCoreREST\Lib\FirewallBouncer
 */
class ExportDecisionsAction extends Injectable
{
    /** Origin string for fail2ban-driven bans (Redis-backed). */
    public const string ORIGIN_FAIL2BAN = 'mikopbx-fail2ban';

    /** Origin string for operator-defined NetworkFilters deny rules. */
    public const string ORIGIN_NETWORK_FILTERS = 'mikopbx-networkfilters';

    /**
     * Long synthetic duration for NetworkFilters entries.
     *
     * They have no Redis TTL — they live in the DB until the operator
     * removes them. We emit 8760h (one year) so well-behaved bouncers
     * keep them in their local store between polls without expiring.
     */
    public const string MANUAL_BAN_DURATION = '8760h';

    /**
     * Build the LAPI snapshot.
     *
     * @return PBXApiResult JSON payload with `new`, `deleted`, `whitelist`.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $new = [];

            foreach (DockerNetworkFilterService::getRedisBouncerDecisions() as $decision) {
                $scenario = 'mikopbx/' . $decision['category'];
                $new[] = [
                    'id'       => self::buildStableId($decision['ip'], $scenario),
                    'origin'   => self::ORIGIN_FAIL2BAN,
                    'type'     => 'ban',
                    'scope'    => 'Ip',
                    'value'    => $decision['ip'],
                    'duration' => self::ttlToDuration($decision['ttl']),
                    'scenario' => $scenario,
                ];
            }

            foreach (DockerNetworkFilterService::getNetworkFiltersDenyList() as $denyEntry) {
                $scope = self::detectScope($denyEntry);
                if ($scope === null) {
                    continue;
                }
                $scenario = 'mikopbx/manual';
                $new[] = [
                    'id'       => self::buildStableId($denyEntry, $scenario),
                    'origin'   => self::ORIGIN_NETWORK_FILTERS,
                    'type'     => 'ban',
                    'scope'    => $scope,
                    'value'    => $denyEntry,
                    'duration' => self::MANUAL_BAN_DURATION,
                    'scenario' => $scenario,
                ];
            }

            // Emit the LAPI snapshot at the top level of the HTTP body via the
            // `raw_json_body` special-response channel; without this bypass the
            // standard `Response::send()` would re-wrap it into the MikoPBX
            // `{result, data, ...}` envelope and stock cs-firewall-bouncer
            // would not be able to parse the decisions list.
            $res->data = [
                'raw_json_body' => json_encode(
                    ['new' => $new, 'deleted' => []],
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'content_type'  => 'application/json',
                'http_code'     => 200,
            ];
            $res->success = true;
            $res->httpCode = 200;
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'Bouncer export failed: ' . $e->getMessage(), LOG_ERR);
            $res->success = false;
            $res->httpCode = 500;
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Convert remaining Redis TTL to CrowdSec duration string.
     *
     * `cs-firewall-bouncer` interprets `duration` as the expiry
     * countdown. TTL == -1 means the key is persistent — we surface
     * the same one-year synthetic value used for NetworkFilters so
     * downstream behaviour is uniform. TTL <= 0 (key vanished or
     * negative) falls back to a tiny non-zero duration so the bouncer
     * still applies the rule and re-evaluates on the next poll.
     *
     * @param int $ttl Seconds remaining (Redis TTL semantics).
     */
    private static function ttlToDuration(int $ttl): string
    {
        if ($ttl === -1) {
            return self::MANUAL_BAN_DURATION;
        }
        if ($ttl <= 0) {
            return '10s';
        }
        return $ttl . 's';
    }

    /**
     * Map our `permit` / NetworkFilters CIDR string to a CrowdSec
     * decision scope.
     *
     * CrowdSec accepts `"Ip"` (single address) or `"Range"` (CIDR).
     * We never emit scope `"Country"` etc. — those origins do not
     * exist in MikoPBX. The capitalisation matters: bouncers compare
     * scope case-sensitively against the literal strings above.
     *
     * @return string|null Null when the entry is unusable (empty etc).
     */
    private static function detectScope(string $entry): ?string
    {
        $entry = trim($entry);
        if ($entry === '' || $entry === '0.0.0.0/0' || $entry === '::/0') {
            return null;
        }
        return str_contains($entry, '/') ? 'Range' : 'Ip';
    }

    /**
     * Stable positive 32-bit signed int — bouncers use `id` to
     * deduplicate identical decisions across polls.
     *
     * `crc32 & 0x7fffffff` keeps the value positive (CrowdSec
     * rejects signed-int wraparound). Collisions are astronomically
     * unlikely in the realistic decision-set size (a busy PBX has
     * thousands of decisions, not billions); a collision just causes
     * the bouncer to treat two decisions as one, which downgrades
     * to "still apply both" because we resend `new` every poll.
     */
    private static function buildStableId(string $ip, string $scenario): int
    {
        return crc32($ip . $scenario) & 0x7fffffff;
    }
}
