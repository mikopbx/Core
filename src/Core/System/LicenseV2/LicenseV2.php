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
    private ?License $legacy;

    public function __construct()
    {
        $dir = Directories::getDir(Directories::CORE_CF_DIR) . '/conf/license-v2';
        $this->store = new EntitlementStore($dir, new InstallationIdentity($dir), self::SERVER_PUBLIC_KEY_PEM);
        $this->legacy = extension_loaded('mikopbx') ? new License() : null;
    }

    /**
     * Key management is not part of the MVP and stays with the compiled class.
     *
     * @param array<int, mixed> $arguments
     */
    public function __call(string $name, array $arguments): mixed
    {
        if ($this->legacy === null) {
            throw new BadMethodCallException("License method $name needs the legacy license service");
        }
        $result = $this->legacy->$name(...$arguments);
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
     * PBX modules are licensed per installation, there are no seats to capture.
     *
     * @return array{success: bool, error?: string}
     */
    public function captureFeature(mixed $featureId): array
    {
        return $this->featureAvailable($featureId);
    }

    /**
     * @return array{success: bool}
     */
    public function releaseFeature(mixed $featureId): array
    {
        return ['success' => true];
    }

    public function checkPBX(): void
    {
        $this->refresh();
    }

    public function translateLicenseErrorMessage(string $message): string
    {
        return $this->legacy?->translateLicenseErrorMessage($message) ?? $message;
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
        return PbxSettings::getValueByKey(PbxSettings::PBX_LICENSE);
    }

    /**
     * Online exchange with the licensing server. A failure is not fatal: the stored token keeps
     * working until it expires, then the enforcer fails closed.
     */
    public function refresh(bool $force = false): bool
    {
        $serverUrl = rtrim(PbxSettings::getValueByKey(PbxSettings::LICENSE_V2_SERVER_URL), '/');
        if ($serverUrl === '') {
            // Closed contour: tokens arrive by the file exchange only.
            return false;
        }
        $payload = $this->store->lastVerifiedPayload();
        $halfLife = ((int)($payload['iat'] ?? 0) + (int)($payload['exp'] ?? 0)) / 2;
        $sameKey = hash_equals($this->licenseKey(), (string)($payload['key'] ?? ''));
        if (!$force && $sameKey && $this->store->now() < $halfLife) {
            return false;
        }
        try {
            $response = (new GuzzleHttp\Client())->request('POST', "$serverUrl/entitlement", [
                'json' => $this->buildRequest(false),
                'timeout' => 15,
            ]);
            $answer = json_decode($response->getBody()->getContents(), true);
            $this->store->acceptToken((string)($answer['token'] ?? ''));
            return true;
        } catch (Throwable $e) {
            $this->log('Entitlement refresh failed: ' . $e->getMessage());
            return false;
        }
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
        $moduleJson = json_decode(
            (string)@file_get_contents(PbxExtensionUtils::getModuleDir($moduleUniqueId) . '/module.json'),
            true
        );
        $featureId = (int)($moduleJson['lic_feature_id'] ?? 0);
        return $featureId > 0 ? (string)$featureId : '';
    }
}
