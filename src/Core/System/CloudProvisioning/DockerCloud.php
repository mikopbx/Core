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

namespace MikoPBX\Core\System\CloudProvisioning;

use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use ReflectionClass;

/**
 * Docker cloud provider for container-based deployments.
 *
 * This provider handles provisioning of MikoPBX when running in Docker containers.
 * It reads configuration from environment variables using the same format as
 * traditional cloud providers' user-data.
 *
 * Environment variables are mapped to PbxSettings constants:
 * - PBX_NAME -> hostname
 * - WEB_ADMIN_PASSWORD -> web admin password
 * - SSH_AUTHORIZED_KEYS -> SSH keys
 * - ENABLE_USE_NAT -> network topology (private)
 * - EXTERNAL_SIP_IP_ADDR -> external IP address
 * - EXTERNAL_SIP_HOST_NAME -> external hostname
 * - Any other PbxSettings constant -> direct database update
 *
 * Port settings (BEANSTALK_PORT, REDIS_PORT, GNATS_PORT, GNATS_HTTP_PORT)
 * are handled separately as they go to /etc/inc/mikopbx-settings.json.
 *
 * @package MikoPBX\Core\System\CloudProvisioning
 */
class DockerCloud extends CloudProvider
{
    public const string CloudID = 'DockerCloud';

    private const string JSON_SETTINGS_PATH = '/etc/inc/mikopbx-settings.json';

    /**
     * Performs an asynchronous check to determine if running in Docker.
     *
     * @return PromiseInterface Promise that resolves to bool
     */
    public function checkAvailability(): PromiseInterface
    {
        return Create::promiseFor(Util::isDocker());
    }

    /**
     * Applies environment variable overrides on EVERY container start.
     *
     * This follows the 12-factor app pattern where configuration via ENV
     * should be dynamic and applied on each restart. This is different from
     * cloud-init which runs only once per instance.
     *
     * Called from CloudProvisioning::start() before the one-time provisioning check.
     * Only updates settings that have actually changed (efficient for repeated calls).
     */
    public static function applyEnvironmentOverrides(): void
    {
        $message = PHP_EOL . "   |- Applying Docker environment overrides...";
        SystemMessages::echoToTeletype($message);

        $instance = new self();

        // Handle port settings first (they go to JSON config, not DB)
        $instance->applyPortSettings();

        // Build configuration from environment variables
        $config = ProvisioningConfig::fromEnvironment();

        if ($config->isEmpty()) {
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
            return;
        }

        // Apply the configuration using direct SQLite method (no Redis/ORM)
        // This only updates settings that have changed
        $instance->applyConfigDirect($config);

        SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_DONE);
    }

    /**
     * Performs one-time Docker provisioning (first container start only).
     *
     * ENV variables are already applied by applyEnvironmentOverrides() which runs
     * on every start. This method only confirms we're in Docker for the one-time
     * provisioning marker (VIRTUAL_HARDWARE_TYPE, firewall settings, etc.).
     *
     * @return bool True if running in Docker, false otherwise.
     */
    public function provision(): bool
    {
        // ENV already applied by applyEnvironmentOverrides()
        // Just confirm we're in Docker for the provisioning marker
        return Util::isDocker();
    }

    /**
     * Applies port-related settings to the JSON configuration file.
     *
     * These settings cannot be stored in the database and must be written
     * directly to /etc/inc/mikopbx-settings.json before system services start.
     */
    private function applyPortSettings(): void
    {
        $portMappings = [
            PbxSettings::BEANSTALK_PORT => ['beanstalk', 'port'],
            PbxSettings::REDIS_PORT => ['redis', 'port'],
            PbxSettings::GNATS_PORT => ['gnats', 'port'],
            PbxSettings::GNATS_HTTP_PORT => ['gnats', 'httpPort'],
        ];

        $reflection = new ReflectionClass(PbxSettings::class);
        $constants = $reflection->getConstants();

        $jsonContent = file_get_contents(self::JSON_SETTINGS_PATH);
        if ($jsonContent === false) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to read JSON settings file");
            return;
        }

        $jsonSettings = json_decode($jsonContent, true);
        if (!is_array($jsonSettings)) {
            SystemMessages::sysLogMsg(__CLASS__, "Invalid JSON settings format");
            return;
        }

        $modified = false;

        foreach ($portMappings as $dbKey => $jsonPath) {
            // Find the ENV name for this dbKey
            $envName = array_search($dbKey, $constants, true);
            if ($envName === false) {
                continue;
            }

            $envValue = getenv($envName);
            if ($envValue === false) {
                continue;
            }

            [$section, $key] = $jsonPath;
            $newValue = (int)$envValue;

            if (($jsonSettings[$section][$key] ?? null) !== $newValue) {
                $jsonSettings[$section][$key] = $newValue;
                $modified = true;
                $message = "      |- Update JSON settings $section.$key → $newValue";
                SystemMessages::echoToTeletype($message);
                SystemMessages::teletypeEchoResult($message);
            }
        }

        if ($modified) {
            $newContent = json_encode($jsonSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            file_put_contents(self::JSON_SETTINGS_PATH, $newContent);
        }
    }
}
