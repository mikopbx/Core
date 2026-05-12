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

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\DockerNetworkFilterService;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
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
 * The response combines two roles per CrowdSec LAPI semantics:
 *
 *   - `new[]` always carries the **full active snapshot** — bouncers
 *     refresh their ipset / nftables entry timeouts on every poll, so
 *     resending the same decision keeps it alive at the source's
 *     declared duration. This stays compatible with bouncers that
 *     ignore `deleted` and the historic MVP shape.
 *
 *   - `deleted[]` is computed per-bouncer as the diff between the
 *     **previous** snapshot (stored as a Redis cursor keyed by the
 *     authenticated ApiKey id) and the **current** snapshot. When an
 *     operator removes a Redis ban or a NetworkFilters entry, the next
 *     poll for that bouncer surfaces the gone decisions in `deleted[]`
 *     so the bouncer can immediately remove the matching ipset member,
 *     instead of waiting for natural TTL decay (`duration`).
 *
 * Cursor semantics (`_PH_REDIS_CLIENT:fwbouncer:cursor:<token-id>`):
 *
 *   - Stores the previous full snapshot as JSON, TTL refreshed to
 *     {@see self::CURSOR_TTL} on every poll so abandoned bouncers do
 *     not pile cursor state forever.
 *   - Reset (no `deleted[]` emitted) when `?startup=true` is set —
 *     bouncers send this on first poll after restart and expect a
 *     fresh full sync, so any cursor staleness from the bouncer's
 *     side would only emit phantom `deleted` entries.
 *   - When `sessionContext['token_id']` is absent (e.g. localhost
 *     debug call with no Bearer) the cursor falls back to a shared
 *     anonymous key — diff still works for a single-tester scenario.
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
     * Redis-key prefix for per-bouncer snapshot cursors.
     *
     * The suffix is the authenticated ApiKey row id (or `"anon"` for
     * unauthenticated localhost debug calls). Stored without the
     * Phalcon CACHE_PREFIX — the Redis adapter auto-prepends
     * `_PH_REDIS_CLIENT:` from
     * {@see RedisClientProvider::CACHE_PREFIX}.
     */
    public const string CURSOR_KEY_PREFIX = 'fwbouncer:cursor:';

    /**
     * Cursor TTL (seconds). Refreshed on every successful poll.
     *
     * Long enough to absorb a `update_frequency: 60s` bouncer
     * skipping a few cycles; short enough that an abandoned bouncer
     * does not retain cursor state indefinitely. After expiry the
     * next poll behaves as a startup sync (no spurious `deleted`).
     */
    public const int CURSOR_TTL = 3600;

    /**
     * Build the LAPI snapshot with per-bouncer delta tracking.
     *
     * @param array<string, mixed> $sessionContext Worker envelope auth
     *     bag — `token_id` identifies which ApiKey is polling so the
     *     cursor stays per-bouncer.
     * @param array<string, mixed> $data Action payload — query params
     *     passed by the controller. `startup` (string `"true"`) resets
     *     the cursor.
     * @return PBXApiResult JSON payload with `new`, `deleted`.
     */
    public static function main(array $sessionContext = [], array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $new = self::buildCurrentSnapshot();

            $isStartup = self::isStartupRequest($data);
            $cursorKey = self::cursorKeyFor($sessionContext);
            $previous  = $isStartup ? [] : self::readPreviousSnapshot($cursorKey);

            $deleted = self::diffRemoved($previous, $new);

            // Persist current snapshot for the NEXT poll's diff. Always
            // refresh — even on startup — so the cursor immediately
            // reflects the just-served state.
            self::writeCurrentSnapshot($cursorKey, $new);

            // Emit the LAPI snapshot at the top level of the HTTP body via the
            // `raw_json_body` special-response channel; without this bypass the
            // standard `Response::send()` would re-wrap it into the MikoPBX
            // `{result, data, ...}` envelope and stock cs-firewall-bouncer
            // would not be able to parse the decisions list.
            $res->data = [
                'raw_json_body' => json_encode(
                    ['new' => $new, 'deleted' => $deleted],
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
     * Gather the current full ban-decision snapshot from Redis +
     * NetworkFilters. The shape matches what cs-firewall-bouncer
     * expects in each `new[]` / `deleted[]` element.
     *
     * @return list<array<string, mixed>>
     */
    private static function buildCurrentSnapshot(): array
    {
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

        return $new;
    }

    /**
     * Decide whether the bouncer is requesting a startup sync.
     *
     * CrowdSec bouncers send `?startup=true` on first poll after
     * restart and expect a clean re-sync; on subsequent polls they
     * send `?startup=false`. We treat any non-`"true"` value (or
     * absence) as steady-state.
     *
     * @param array<string, mixed> $data
     */
    private static function isStartupRequest(array $data): bool
    {
        $raw = $data['startup'] ?? null;
        if (is_string($raw)) {
            return strtolower($raw) === 'true';
        }
        if (is_bool($raw)) {
            return $raw;
        }
        return false;
    }

    /**
     * Build the Redis cursor key for the polling bouncer.
     *
     * Preference order:
     *   1. `sessionContext['token_id']` — set by
     *      {@see \MikoPBX\PBXCoreREST\Controllers\BaseController::prepareRequestMessage()}
     *      when a Bearer / X-Api-Key matches an `m_ApiKeys` row.
     *   2. Anonymous fallback — hit by localhost debug calls without
     *      a token and by JWT-authenticated admin probes from the
     *      web UI (the admin JWT branch does not populate
     *      `token_id`). Not a multi-tenant case in practice — stock
     *      bouncers always present an `ApiKeys` row.
     *
     * @param array<string, mixed> $sessionContext
     */
    private static function cursorKeyFor(array $sessionContext): string
    {
        $tokenId = $sessionContext['token_id'] ?? null;
        if ($tokenId === null || $tokenId === '' || $tokenId === 0) {
            return self::CURSOR_KEY_PREFIX . 'anon';
        }
        return self::CURSOR_KEY_PREFIX . (string)(int)$tokenId;
    }

    /**
     * Decode the previous snapshot stored under `$cursorKey`.
     *
     * Returns an empty list on any failure — DI absent, Redis call
     * throws, corrupt JSON, etc. The contract is "degrade to first-
     * poll behaviour" rather than 500, matching what
     * `DockerNetworkFilterService::getRedisBouncerDecisions()` does
     * for the snapshot read path. A transient Redis blip therefore
     * produces a poll with `deleted: []` and the bouncer keeps its
     * existing rules, instead of receiving an error.
     *
     * @return list<array<string, mixed>>
     */
    private static function readPreviousSnapshot(string $cursorKey): array
    {
        try {
            $redis = Di::getDefault()?->getShared(RedisClientProvider::SERVICE_NAME);
            if ($redis === null) {
                return [];
            }
            $raw = $redis->get($cursorKey);
            if (!is_string($raw) || $raw === '') {
                return [];
            }
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                return [];
            }
            return array_values(array_filter($decoded, 'is_array'));
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'cursor read failed: ' . $e->getMessage(), LOG_WARNING);
            return [];
        }
    }

    /**
     * Persist the current snapshot for the next poll's diff.
     *
     * Uses `setex` so the cursor expires on its own if the bouncer
     * stops polling — no separate cleanup job needed. Swallows Redis
     * exceptions for the same reason as
     * {@see self::readPreviousSnapshot()}: the response is already
     * built; the next poll will simply behave as if no cursor was
     * stored, which produces an empty `deleted` array — degraded but
     * never 500.
     *
     * @param list<array<string, mixed>> $snapshot
     */
    private static function writeCurrentSnapshot(string $cursorKey, array $snapshot): void
    {
        try {
            $redis = Di::getDefault()?->getShared(RedisClientProvider::SERVICE_NAME);
            if ($redis === null) {
                return;
            }
            $payload = json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($payload === false) {
                return;
            }
            $redis->setex($cursorKey, self::CURSOR_TTL, $payload);
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'cursor write failed: ' . $e->getMessage(), LOG_WARNING);
        }
    }

    /**
     * Decisions that existed in the previous snapshot but are no
     * longer present in the current one. CrowdSec contract: each
     * `deleted[]` element is a full decision object (the bouncer
     * matches by `value` to evict the ipset / nftables entry).
     *
     * @param list<array<string, mixed>> $previous
     * @param list<array<string, mixed>> $current
     * @return list<array<string, mixed>>
     */
    private static function diffRemoved(array $previous, array $current): array
    {
        if ($previous === []) {
            return [];
        }
        $currentIds = [];
        foreach ($current as $d) {
            if (isset($d['id'])) {
                $currentIds[(int)$d['id']] = true;
            }
        }
        $deleted = [];
        foreach ($previous as $d) {
            if (!isset($d['id'])) {
                continue;
            }
            if (!isset($currentIds[(int)$d['id']])) {
                $deleted[] = $d;
            }
        }
        return $deleted;
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
