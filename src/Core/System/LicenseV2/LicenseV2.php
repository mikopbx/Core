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

namespace MikoPBX\Core\System\LicenseV2;

use BadMethodCallException;
use Closure;
use GuzzleHttp;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Service\License;
use RuntimeException;
use Throwable;

/**
 * Drop-in replacement of the compiled 'license' service for feature checks: entitlements come
 * from a server-signed token instead of the local gnatsd answer. Enabled by
 * PbxSettings::LICENSE_V2_ENABLED; key management (trial, coupon, metrics, license info)
 * is still served by the legacy compiled class.
 */
class LicenseV2
{
    /**
     * Public key of the licensing server, pinned in the read-only rootfs.
     *
     * ponytail: MVP test key (issuer script in _temp); replace with the production key
     * of /protect/v2 before this leaves the MVP branch.
     */
    private const string SERVER_PUBLIC_KEY_PEM = <<<'PEM'
        -----BEGIN PUBLIC KEY-----
        MCowBQYDK2VwAyEACbfQOaxyRmg5MXtGAEI/ZEtIKfV1fmPTl565zNIsthU=
        -----END PUBLIC KEY-----
        PEM;

    /** The same text the legacy service produces, so translateLicenseErrorMessage() keeps working. */
    private const string ERROR_NOT_LICENSED = 'Feature is expired or not licensed (2011)';

    /** Legacy calls that change what the key is entitled to; the stored token is stale after them. */
    private const array ENTITLEMENT_CHANGING_CALLS = ['addtrial', 'activatecoupon', 'changelicensekey'];

    private EntitlementStore $store;
    private SeatLedger $ledger;
    private Closure $licenseKey;
    private ?License $legacy = null;

    /**
     * The arguments exist for tests and callers that own the storage; production builds the
     * defaults from the settings, so `new LicenseV2()` keeps working unchanged.
     */
    public function __construct(
        ?EntitlementStore $store = null,
        ?SeatLedger $ledger = null,
        ?Closure $licenseKey = null
    ) {
        $cfDir = Directories::getDir(Directories::CORE_CF_DIR) . '/conf/license-v2';
        $this->store = $store
            ?? new EntitlementStore($cfDir, new InstallationIdentity($cfDir), self::SERVER_PUBLIC_KEY_PEM);
        // Leases are rewritten on every keepalive: they live on the storage disk, not on the /cf settings partition.
        $this->ledger = $ledger ?? new SeatLedger(Directories::getDir(Directories::CORE_TEMP_DIR) . '/license-v2');
        $this->licenseKey = $licenseKey ?? static fn(): string => PbxSettings::getValueByKey(PbxSettings::PBX_LICENSE);
    }

    public function store(): EntitlementStore
    {
        return $this->store;
    }

    /**
     * Built on demand: the compiled class needs the DI container, which feature checks do not.
     */
    private function legacy(): ?License
    {
        if ($this->legacy === null && extension_loaded('mikopbx')) {
            $this->legacy = new License();
        }
        return $this->legacy;
    }

    /**
     * Key management is not part of the MVP and stays with the compiled class.
     *
     * @param array<int, mixed> $arguments
     */
    public function __call(string $name, array $arguments): mixed
    {
        $legacy = $this->legacy();
        if ($legacy === null) {
            throw new BadMethodCallException("License method $name needs the legacy license service");
        }
        $result = $legacy->$name(...$arguments);
        if (in_array(strtolower($name), self::ENTITLEMENT_CHANGING_CALLS, true)) {
            $this->refresh(true);
        }
        return $result;
    }

    /**
     * @return array{success: bool, error?: string}
     */
    public function featureAvailable(mixed $featureId): array
    {
        return $this->store->featureAvailable((string)$featureId, $this->licenseKey())
            ? ['success' => true]
            : ['success' => false, 'error' => self::ERROR_NOT_LICENSED];
    }

    /**
     * Opens a seat session for one device. The ceiling is derived from the licensed seats, so a
     * flood of sessions can not exhaust the ledger while leaving room for churn and retries.
     *
     * @param array<string, mixed> $holder Who holds the session (hostname, username, process...).
     * @return array{success: bool, session_id?: string, validttl?: int, error?: string,
     *     extcode?: int, httpCode?: int}
     */
    public function sessionStart(array $holder, int $ttl = SeatLedger::TTL_DEFAULT): array
    {
        try {
            $payload = $this->store->lastVerifiedPayload();
            $limits = array_filter((array)($payload['seats'] ?? []), 'is_int');
            $sessionId = $this->ledger->startSession($holder, $ttl, ($limits === [] ? 0 : max($limits)) * 4 + 16);
            return ['success' => true, 'session_id' => $sessionId, 'validttl' => $ttl];
        } catch (RuntimeException $e) {
            return $this->failure($e);
        }
    }

    /**
     * Without a session: the installation-level check the core makes (module install, hourly enforcer).
     * With a session: a seat for one device; features without a seat limit are granted uncounted.
     * A success without a session is NOT a permission to serve a device of a seat-limited feature.
     *
     * @return array{success: bool, validttl?: int, error?: string, extcode?: int}
     */
    public function captureFeature(mixed $featureId, ?string $sessionId = null): array
    {
        $featureId = (string)$featureId;
        if ($sessionId === null) {
            return $this->featureAvailable($featureId);
        }
        try {
            $licenseKey = $this->licenseKey();
            $payload = $this->entitledPayload($featureId, $licenseKey);
            // A feature without a seat limit takes no seat, and neither case renews the lease:
            // only sessionKeepalive() re-checks the rights, so only it may keep a session alive.
            $leaseLeft = $this->ledger->capture(
                $sessionId,
                $featureId,
                EntitlementToken::seatLimit($payload, $featureId)
            );
            return ['success' => true, 'validttl' => $this->validTtl($payload, $featureId, $leaseLeft, $licenseKey)];
        } catch (RuntimeException $e) {
            return $this->failure($e);
        }
    }

    /**
     * Renews the lease and re-checks every held feature: a changed key, an expired feature, a signed
     * refusal past exp or a lowered limit takes the feature away here, so nothing is held for ever.
     *
     * @return array{success: bool, validttl?: int, dropped_features?: array<int, string>,
     *     error?: string, extcode?: int}
     */
    public function sessionKeepalive(string $sessionId): array
    {
        try {
            $held = $this->ledger->sessionFeatures($sessionId);
            // One token and one key for the whole call: every feature is judged by the same document.
            $payload = $this->store->lastVerifiedPayload();
            $licenseKey = $this->licenseKey();
            $usage = $this->ledger->usage();
            $dropped = [];
            foreach ($held as $featureId) {
                $limit = $payload === null ? null : EntitlementToken::seatLimit($payload, $featureId);
                // A cut limit takes the feature from everyone who captured it after the first
                // $limit holders, so the whole excess is gone within one keepalive round.
                $overLimit = $limit !== null && ($usage[$featureId] ?? 0) > $limit
                    && $this->ledger->isOverLimit($sessionId, $featureId, $limit);
                if (
                    $payload === null || $overLimit
                    || !$this->store->featureAvailable($featureId, $licenseKey, $payload)
                ) {
                    $dropped[] = $featureId;
                }
            }
            $leaseLeft = $this->ledger->keepalive($sessionId, $dropped);
            $validTtl = $leaseLeft;
            if ($payload !== null) {
                foreach (array_diff($held, $dropped) as $featureId) {
                    $validTtl = min($validTtl, $this->validTtl($payload, $featureId, $leaseLeft, $licenseKey));
                }
            }
            return ['success' => true, 'validttl' => $validTtl, 'dropped_features' => $dropped];
        } catch (RuntimeException $e) {
            return $this->failure($e);
        }
    }

    /**
     * @return array{success: bool, error?: string, extcode?: int}
     */
    public function releaseFeature(mixed $featureId, ?string $sessionId = null): array
    {
        if ($sessionId === null) {
            return ['success' => true];
        }
        try {
            $this->ledger->release($sessionId, (string)$featureId);
            return ['success' => true];
        } catch (RuntimeException $e) {
            return $this->failure($e);
        }
    }

    /**
     * @return array{success: bool, error?: string, extcode?: int}
     */
    public function sessionEnd(string $sessionId): array
    {
        try {
            $this->ledger->endSession($sessionId);
            return ['success' => true];
        } catch (RuntimeException $e) {
            return $this->failure($e);
        }
    }

    /**
     * @return array{success: bool, usage?: array<string, array{used: int, limit: int|null}>,
     *     error?: string, extcode?: int}
     */
    public function usageGet(): array
    {
        try {
            $payload = $this->store->lastVerifiedPayload();
            $usage = [];
            foreach ($this->ledger->usage() as $featureId => $used) {
                // JSON turns a numeric feature id back into an int key on the way out of the ledger.
                $featureId = (string)$featureId;
                $usage[$featureId] = [
                    'used' => $used,
                    'limit' => $payload === null ? null : EntitlementToken::seatLimit($payload, $featureId),
                ];
            }
            return ['success' => true, 'usage' => $usage];
        } catch (RuntimeException $e) {
            return $this->failure($e);
        }
    }

    /**
     * Reads the token once and answers with it, so the caller can judge the right, the limit and the
     * lifetime by the same document: a token replaced mid-call must not mix old and new terms.
     *
     * @return array<string, mixed>
     * @throws SeatException 2011
     */
    private function entitledPayload(string $featureId, string $licenseKey): array
    {
        $payload = $this->store->lastVerifiedPayload();
        if ($payload === null || !$this->store->featureAvailable($featureId, $licenseKey, $payload)) {
            throw new SeatException('Feature is expired or not licensed', SeatException::NOT_LICENSED);
        }
        return $payload;
    }

    /**
     * How long the answer may be trusted: the shortest of the lease, the feature and the token.
     *
     * @param array<string, mixed> $payload
     */
    private function validTtl(array $payload, string $featureId, int $leaseLeft, string $licenseKey): int
    {
        $now = $this->store->now();
        return max(0, min(
            $leaseLeft,
            (int)($payload['features'][$featureId] ?? 0) - $now,
            $this->store->effectiveExpiry($licenseKey, $payload) - $now
        ));
    }

    /**
     * @return array{success: false, error: string, extcode?: int, httpCode?: int}
     */
    private function failure(RuntimeException $e): array
    {
        if ($e instanceof SeatException) {
            return ['success' => false, 'error' => $e->getMessage(), 'extcode' => $e->extcode];
        }
        if ($e instanceof SessionCeilingException) {
            // Our own protective cap, not a licensing refusal: no server code, ask again later.
            return ['success' => false, 'error' => $e->getMessage(), 'httpCode' => 429];
        }
        $this->log('Seat ledger failure: ' . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }

    public function checkPBX(): void
    {
        $this->refresh();
    }

    public function translateLicenseErrorMessage(string $message): string
    {
        return $this->legacy()?->translateLicenseErrorMessage($message) ?? $message;
    }

    /**
     * The enforcer: a paid module without a valid entitlement is switched off,
     * a module switched off by license comes back once the entitlement is valid again.
     */
    public function checkModules(): void
    {
        $this->refresh();
        $payload = $this->store->lastVerifiedPayload();
        // toArray(): the loop updates the same table, no open cursor must be held over it.
        foreach (PbxExtensionModules::find()->toArray() as $module) {
            $uniqid = (string)$module['uniqid'];
            $featureId = $this->paidFeatureOf($uniqid, $payload);
            if ($featureId === '') {
                continue;
            }
            $entitled = $this->featureAvailable($featureId)['success'];
            $disabled = (int)$module['disabled'] === 1;
            if (!$disabled && !$entitled) {
                $done = PbxExtensionUtils::forceDisableModule(
                    $uniqid,
                    PbxExtensionState::DISABLED_BY_LICENSE,
                    self::ERROR_NOT_LICENSED
                );
                $this->log("$uniqid (feature $featureId) is not licensed: " . ($done ? 'disabled' : 'DISABLE FAILED'));
            } elseif ($disabled && $entitled && $module['disableReason'] === PbxExtensionState::DISABLED_BY_LICENSE) {
                $this->reEnable($uniqid, $featureId);
            }
        }
    }

    /**
     * PbxExtensionState checks the feature named in module.json. When it disagrees with the signed
     * map the enable attempt is doomed, so it is skipped instead of being repeated every hour.
     */
    private function reEnable(string $uniqid, string $featureId): void
    {
        $gateFeature = $this->moduleJsonFeature($uniqid);
        if ($gateFeature !== '' && !$this->featureAvailable($gateFeature)['success']) {
            $this->log("$uniqid is licensed by feature $featureId, module.json asks for $gateFeature: left disabled");
            return;
        }
        $state = new PbxExtensionState($uniqid);
        $this->log(
            "$uniqid (feature $featureId) is licensed again: "
            . ($state->enableModule() ? 'enabled' : 'ENABLE FAILED ' . json_encode($state->getMessages()))
        );
    }

    private function log(string $message): void
    {
        SystemMessages::sysLogMsg(static::class, $message, LOG_WARNING);
    }

    private function licenseKey(): string
    {
        return ($this->licenseKey)();
    }

    /**
     * Online exchange with the licensing servers, tried in the configured order. An unreachable or
     * failing server passes the turn to the next one; when none answers the stored token keeps
     * working through its grace period, then the enforcer fails closed. A signed "no" is final:
     * the others are not asked and the grace period is cancelled. An unsigned error is what any
     * proxy or captive portal can produce, so it only passes the turn.
     */
    public function refresh(bool $force = false): bool
    {
        $configuredUrls = PbxSettings::getValueByKey(PbxSettings::LICENSE_V2_SERVER_URL);
        $serverUrls = preg_split('/[\s,]+/', $configuredUrls, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if ($serverUrls === []) {
            // Closed contour: tokens arrive by the file exchange only.
            return false;
        }
        $payload = $this->store->lastVerifiedPayload();
        $halfLife = ((int)($payload['iat'] ?? 0) + (int)($payload['exp'] ?? 0)) / 2;
        $sameKey = hash_equals($this->licenseKey(), (string)($payload['key'] ?? ''));
        if (!$force && $sameKey && $this->store->now() < $halfLife) {
            return false;
        }
        if (!$force && !$this->store->retryAllowed()) {
            return false;
        }
        foreach ($serverUrls as $serverUrl) {
            try {
                $response = (new GuzzleHttp\Client())->request('POST', rtrim($serverUrl, '/') . '/entitlement', [
                    'json' => $this->buildRequest(false),
                    'timeout' => 15,
                    'http_errors' => false,
                ]);
                $answer = (array)json_decode($response->getBody()->getContents(), true);
            } catch (Throwable $e) {
                $this->log("Entitlement server $serverUrl is unavailable: " . $e->getMessage());
                continue;
            }
            try {
                if (is_string($answer['refusal'] ?? null)) {
                    $this->log("Refused by $serverUrl: " . $this->store->acceptRefusal($answer['refusal']));
                    return false;
                }
                if ($response->getStatusCode() === 200) {
                    $this->store->acceptToken((string)($answer['token'] ?? ''));
                    return true;
                }
                $this->log("Entitlement server $serverUrl failed: HTTP " . $response->getStatusCode());
            } catch (Throwable $e) {
                $this->log("Answer of $serverUrl is rejected: " . $e->getMessage());
            }
        }
        try {
            $this->log('All entitlement servers failed, next attempt in ' . $this->store->noteFailure() . ' s');
        } catch (RuntimeException $e) {
            // Only root workers may write the backoff; a refresh forced from the web just reports.
            $this->log('All entitlement servers failed: ' . $e->getMessage());
        }
        return false;
    }

    /**
     * Request file for a closed contour: the administrator carries it to the licensing cabinet
     * and brings back a token for importOfflineToken().
     */
    public function exportOfflineRequest(): string
    {
        return (string)json_encode($this->buildRequest(true));
    }

    /**
     * @throws RuntimeException When the token is forged, foreign, expired or answers another request.
     */
    public function importOfflineToken(string $token): void
    {
        $this->store->acceptToken($token);
    }

    /**
     * @return array{request: string, sig: string}
     */
    private function buildRequest(bool $offline): array
    {
        return $this->store->buildRequest(
            $this->licenseKey(),
            PbxSettings::getValueByKey(PbxSettings::PBX_VERSION),
            $offline
        );
    }

    /**
     * Which feature a module needs. The signed map wins; module.json is trusted only while
     * the PBX has never received a signed map (first boot, closed contour before activation).
     *
     * @param array<string, mixed>|null $payload
     */
    private function paidFeatureOf(string $moduleUniqueId, ?array $payload): string
    {
        if ($payload !== null) {
            // 0 in the signed map means a free module, the same as in module.json.
            $featureId = (int)($payload['modules'][$moduleUniqueId] ?? 0);
            return $featureId > 0 ? (string)$featureId : '';
        }
        return $this->moduleJsonFeature($moduleUniqueId);
    }

    private function moduleJsonFeature(string $moduleUniqueId): string
    {
        $moduleJsonFile = PbxExtensionUtils::getModuleDir($moduleUniqueId) . '/module.json';
        $moduleJson = is_file($moduleJsonFile) ? json_decode((string)file_get_contents($moduleJsonFile), true) : null;
        $featureId = (int)($moduleJson['lic_feature_id'] ?? 0);
        return $featureId > 0 ? (string)$featureId : '';
    }
}
