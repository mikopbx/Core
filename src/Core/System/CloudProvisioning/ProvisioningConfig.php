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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Utilities\IpAddressHelper;
use ReflectionClass;

/**
 * Data Transfer Object for cloud provisioning configuration.
 *
 * Provides a unified structure for provisioning data from different sources:
 * - Docker environment variables
 * - Cloud provider IMDS metadata
 * - Cloud-init user-data (YAML/JSON)
 * - NoCloud seed files
 *
 * @package MikoPBX\Core\System\CloudProvisioning
 */
class ProvisioningConfig
{
    /**
     * Maximum length for string fields to prevent resource exhaustion.
     */
    private const int MAX_STRING_LENGTH = 1024;

    /**
     * Maximum length for hostname (RFC 1123).
     */
    private const int MAX_HOSTNAME_LENGTH = 253;

    /**
     * Maximum length for SSH keys (multiple keys allowed).
     */
    private const int MAX_SSH_KEYS_LENGTH = 65536;

    /**
     * Regex pattern for valid hostname (RFC 1123).
     * Allows alphanumeric characters, hyphens, and dots.
     */
    private const string HOSTNAME_PATTERN = '/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/';

    /**
     * Hostname for the PBX system.
     */
    public ?string $hostname = null;

    /**
     * External IP address for SIP/NAT configuration.
     */
    public ?string $externalIp = null;

    /**
     * External hostname for SIP/NAT configuration.
     */
    public ?string $externalHostname = null;

    /**
     * SSH authorized keys (OpenSSH format, may contain multiple keys).
     */
    public ?string $sshKeys = null;

    /**
     * SSH login username.
     */
    public ?string $sshLogin = null;

    /**
     * Web admin password.
     */
    public ?string $webPassword = null;

    /**
     * Cloud instance ID (used for default password and identification).
     */
    public ?string $instanceId = null;

    /**
     * Network topology: 'public' or 'private'.
     */
    public ?string $topology = null;

    /**
     * Key-value pairs for PbxSettings table.
     * Keys should be PbxSettings constant values (e.g., 'Name', 'SSHPort').
     *
     * @var array<string, string|int|null>
     */
    public array $pbxSettings = [];

    /**
     * Key-value pairs for LanInterfaces table.
     * Keys should be LanInterfaces column names (e.g., 'extipaddr', 'topology').
     *
     * @var array<string, string|int|null>
     */
    public array $networkSettings = [];

    /**
     * Creates a new ProvisioningConfig instance.
     *
     * @param string|null $hostname Hostname for the PBX system
     * @param string|null $externalIp External IP address for SIP/NAT
     * @param string|null $externalHostname External hostname for SIP/NAT
     * @param string|null $sshKeys SSH authorized keys
     * @param string|null $sshLogin SSH login username
     * @param string|null $webPassword Web admin password
     * @param string|null $instanceId Cloud instance ID
     * @param string|null $topology Network topology ('public' or 'private')
     * @param array<string, string|int|null> $pbxSettings PbxSettings key-value pairs
     * @param array<string, string|int|null> $networkSettings LanInterfaces key-value pairs
     */
    public function __construct(
        ?string $hostname = null,
        ?string $externalIp = null,
        ?string $externalHostname = null,
        ?string $sshKeys = null,
        ?string $sshLogin = null,
        ?string $webPassword = null,
        ?string $instanceId = null,
        ?string $topology = null,
        array $pbxSettings = [],
        array $networkSettings = []
    ) {
        $this->hostname = $hostname;
        $this->externalIp = $externalIp;
        $this->externalHostname = $externalHostname;
        $this->sshKeys = $sshKeys;
        $this->sshLogin = $sshLogin;
        $this->webPassword = $webPassword;
        $this->instanceId = $instanceId;
        $this->topology = $topology;
        $this->pbxSettings = $pbxSettings;
        $this->networkSettings = $networkSettings;
    }

    /**
     * Creates a ProvisioningConfig from environment variables.
     *
     * Maps ENV variable names (matching PbxSettings constants) to their values.
     * Special handling for network-related variables (ENABLE_USE_NAT, EXTERNAL_SIP_*).
     *
     * @return self
     */
    public static function fromEnvironment(): self
    {
        $config = new self();

        $reflection = new ReflectionClass(PbxSettings::class);
        $constants = $reflection->getConstants();

        foreach ($constants as $envName => $dbKey) {
            $envValue = getenv($envName);
            if ($envValue === false) {
                continue;
            }

            // Handle special cases
            switch ($dbKey) {
                case PbxSettings::PBX_NAME:
                    $config->hostname = $envValue;
                    break;

                case PbxSettings::WEB_ADMIN_PASSWORD:
                    $config->webPassword = $envValue;
                    break;

                case PbxSettings::SSH_AUTHORIZED_KEYS:
                    $config->sshKeys = $envValue;
                    break;

                case PbxSettings::SSH_LOGIN:
                    $config->sshLogin = $envValue;
                    break;

                case PbxSettings::ENABLE_USE_NAT:
                    if ($envValue === '1') {
                        $config->topology = LanInterfaces::TOPOLOGY_PRIVATE;
                        $config->networkSettings['topology'] = LanInterfaces::TOPOLOGY_PRIVATE;
                    }
                    break;

                case PbxSettings::EXTERNAL_SIP_HOST_NAME:
                    $config->externalHostname = $envValue;
                    $config->networkSettings['exthostname'] = $envValue;
                    break;

                case PbxSettings::EXTERNAL_SIP_IP_ADDR:
                    $config->externalIp = $envValue;
                    $config->networkSettings['extipaddr'] = $envValue;
                    break;

                // Port settings are stored in JSON config, not DB
                case PbxSettings::BEANSTALK_PORT:
                case PbxSettings::REDIS_PORT:
                case PbxSettings::GNATS_PORT:
                case PbxSettings::GNATS_HTTP_PORT:
                    // These are handled separately by DockerEntrypoint
                    // as they go to /etc/inc/mikopbx-settings.json
                    break;

                default:
                    // All other PbxSettings constants go directly to pbxSettings array
                    $config->pbxSettings[$dbKey] = $envValue;
                    break;
            }
        }

        return $config;
    }

    /**
     * Creates a ProvisioningConfig from YAML user-data.
     *
     * Supports cloud-init style YAML format with mikopbx-specific sections:
     *
     * ```yaml
     * #cloud-config
     * mikopbx:
     *   hostname: my-pbx
     *   ssh_authorized_keys:
     *     - ssh-rsa AAAA...
     *   web_password: secret123
     *   pbx_settings:
     *     PBXLanguage: ru-ru
     *     SIPPort: 5060
     *   network:
     *     topology: private
     *     extipaddr: 1.2.3.4
     * ```
     *
     * Requires PHP yaml extension (yaml_parse function).
     *
     * @param string $yaml YAML content
     * @return self|null Returns null if parsing fails or yaml extension not available
     */
    public static function fromYaml(string $yaml): ?self
    {
        // Skip if starts with #! (script) or is empty
        $trimmed = trim($yaml);
        if (empty($trimmed) || str_starts_with($trimmed, '#!')) {
            return null;
        }

        // Check if yaml extension is available
        if (!function_exists('yaml_parse')) {
            // Note: Not logging here as this may be called during early boot before DI is available
            return null;
        }

        $data = yaml_parse($yaml);
        if ($data === false || !is_array($data)) {
            // Note: Not logging here as this may be called during early boot before DI is available
            return null;
        }

        return self::fromArray($data);
    }

    /**
     * Creates a ProvisioningConfig from JSON user-data.
     *
     * Supports the same structure as YAML but in JSON format:
     *
     * ```json
     * {
     *   "mikopbx": {
     *     "hostname": "my-pbx",
     *     "ssh_authorized_keys": ["ssh-rsa AAAA..."],
     *     "web_password": "secret123",
     *     "pbx_settings": {
     *       "PBXLanguage": "ru-ru"
     *     }
     *   }
     * }
     * ```
     *
     * @param string $json JSON content
     * @return self|null Returns null if parsing fails
     */
    public static function fromJson(string $json): ?self
    {
        $data = json_decode($json, true);
        if (!is_array($data)) {
            // Note: Not logging here as this may be called during early boot before DI is available
            return null;
        }

        return self::fromArray($data);
    }

    /**
     * Creates a ProvisioningConfig from an array (parsed YAML or JSON).
     *
     * Validates and sanitizes all input values to prevent:
     * - XSS attacks (via hostname/strings stored in DB and displayed in UI)
     * - SQL injection (via overly long strings or special characters)
     * - Resource exhaustion (via extremely long values)
     *
     * @param array $data Parsed configuration data
     * @return self
     */
    public static function fromArray(array $data): self
    {
        $config = new self();

        // Check for mikopbx section (cloud-init style)
        $mikopbx = $data['mikopbx'] ?? $data;

        // Validate and set hostname (RFC 1123)
        $hostname = $mikopbx['hostname'] ?? $mikopbx['name'] ?? null;
        if ($hostname !== null) {
            $config->hostname = self::validateHostname($hostname);
        }

        // Validate and set external IP (IPv4 or IPv6)
        $externalIp = $mikopbx['external_ip'] ?? $mikopbx['extipaddr'] ?? null;
        if ($externalIp !== null) {
            $config->externalIp = self::validateIpAddress($externalIp);
        }

        // Validate and set external hostname
        $externalHostname = $mikopbx['external_hostname'] ?? $mikopbx['exthostname'] ?? null;
        if ($externalHostname !== null) {
            $config->externalHostname = self::validateHostname($externalHostname);
        }

        // Sanitize web password (no validation, just length limit)
        $webPassword = $mikopbx['web_password'] ?? $mikopbx['web_admin_password'] ?? null;
        if ($webPassword !== null) {
            $config->webPassword = self::sanitizeString($webPassword);
        }

        // Sanitize SSH login
        $sshLogin = $mikopbx['ssh_login'] ?? $mikopbx['ssh_user'] ?? null;
        if ($sshLogin !== null) {
            $config->sshLogin = self::sanitizeString($sshLogin, 64);
        }

        // Sanitize instance ID
        $instanceId = $mikopbx['instance_id'] ?? null;
        if ($instanceId !== null) {
            $config->instanceId = self::sanitizeString($instanceId);
        }

        // Validate topology (must be 'public' or 'private')
        $topology = $mikopbx['topology'] ?? null;
        if ($topology !== null) {
            $config->topology = self::validateTopology($topology);
        }

        // SSH keys - can be string or array, with length limit
        $sshKeys = $mikopbx['ssh_authorized_keys'] ?? $mikopbx['ssh_keys'] ?? null;
        if (is_array($sshKeys)) {
            $joined = implode("\n", array_map('strval', $sshKeys));
            $config->sshKeys = self::sanitizeString($joined, self::MAX_SSH_KEYS_LENGTH);
        } elseif (is_string($sshKeys)) {
            $config->sshKeys = self::sanitizeString($sshKeys, self::MAX_SSH_KEYS_LENGTH);
        }

        // PbxSettings - map snake_case to constant values with validation
        if (isset($mikopbx['pbx_settings']) && is_array($mikopbx['pbx_settings'])) {
            foreach ($mikopbx['pbx_settings'] as $key => $value) {
                // Accept both constant name (PBX_NAME) and DB key (Name)
                $dbKey = self::resolveSettingKey($key);
                if ($dbKey !== null && $value !== null) {
                    // Sanitize the value
                    $sanitized = self::sanitizeString((string)$value);
                    if ($sanitized !== null) {
                        $config->pbxSettings[$dbKey] = $sanitized;
                    }
                }
            }
        }

        // Network settings - validate each value
        if (isset($mikopbx['network']) && is_array($mikopbx['network'])) {
            foreach ($mikopbx['network'] as $key => $value) {
                // Only allow valid LAN column names
                $validatedKey = self::validateNetworkKey($key);
                if ($validatedKey !== null && $value !== null) {
                    $config->networkSettings[$validatedKey] = self::sanitizeString((string)$value, 256);
                }
            }

            // Extract common values with validation
            if (isset($mikopbx['network']['topology'])) {
                $config->topology = self::validateTopology($mikopbx['network']['topology']) ?? $config->topology;
            }
            if (isset($mikopbx['network']['extipaddr'])) {
                $config->externalIp = self::validateIpAddress($mikopbx['network']['extipaddr']) ?? $config->externalIp;
            }
            if (isset($mikopbx['network']['exthostname'])) {
                $config->externalHostname = self::validateHostname($mikopbx['network']['exthostname']) ?? $config->externalHostname;
            }
        }

        return $config;
    }

    /**
     * Validates a hostname according to RFC 1123.
     *
     * @param mixed $hostname The hostname to validate
     * @return string|null Valid hostname or null if invalid
     */
    private static function validateHostname(mixed $hostname): ?string
    {
        if (!is_string($hostname)) {
            return null;
        }

        $hostname = trim($hostname);

        // Check length
        if (empty($hostname) || strlen($hostname) > self::MAX_HOSTNAME_LENGTH) {
            return null;
        }

        // Validate against RFC 1123 pattern
        if (!preg_match(self::HOSTNAME_PATTERN, $hostname)) {
            return null;
        }

        return $hostname;
    }

    /**
     * Validates an IP address (IPv4 or IPv6).
     *
     * @param mixed $ip The IP address to validate
     * @return string|null Valid IP address or null if invalid
     */
    private static function validateIpAddress(mixed $ip): ?string
    {
        if (!is_string($ip)) {
            return null;
        }

        $ip = trim($ip);

        if (IpAddressHelper::isIpv4($ip) || IpAddressHelper::isIpv6($ip)) {
            return $ip;
        }

        return null;
    }

    /**
     * Validates network topology value.
     *
     * @param mixed $topology The topology to validate
     * @return string|null Valid topology ('public' or 'private') or null
     */
    private static function validateTopology(mixed $topology): ?string
    {
        if (!is_string($topology)) {
            return null;
        }

        $topology = strtolower(trim($topology));

        if ($topology === LanInterfaces::TOPOLOGY_PUBLIC || $topology === LanInterfaces::TOPOLOGY_PRIVATE) {
            return $topology;
        }

        return null;
    }

    /**
     * Validates a network settings key name.
     *
     * @param mixed $key The key to validate
     * @return string|null Valid key or null if invalid
     */
    private static function validateNetworkKey(mixed $key): ?string
    {
        if (!is_string($key)) {
            return null;
        }

        $validKeys = [
            'topology', 'extipaddr', 'exthostname', 'hostname',
            'ipaddr', 'subnet', 'gateway', 'primarydns', 'secondarydns',
            'ipv6_mode', 'ipv6addr', 'ipv6_subnet', 'ipv6_gateway',
            'primarydns6', 'secondarydns6', 'dhcp', 'internet', 'vlanid'
        ];

        if (in_array($key, $validKeys, true)) {
            return $key;
        }

        return null;
    }

    /**
     * Sanitizes a string value by trimming and limiting length.
     *
     * Removes potentially dangerous characters that could be used for XSS.
     *
     * @param mixed $value The value to sanitize
     * @param int $maxLength Maximum allowed length
     * @return string|null Sanitized string or null if invalid
     */
    private static function sanitizeString(mixed $value, int $maxLength = self::MAX_STRING_LENGTH): ?string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return null;
        }

        $str = trim((string)$value);

        if (empty($str)) {
            return null;
        }

        // Limit length
        if (strlen($str) > $maxLength) {
            $str = substr($str, 0, $maxLength);
        }

        // Remove null bytes and other control characters (except newlines for SSH keys)
        $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $str);

        return $str !== '' ? $str : null;
    }

    /**
     * Resolves a setting key to its database key value.
     *
     * Accepts:
     * - Constant name: 'PBX_NAME' -> 'Name'
     * - Database key: 'Name' -> 'Name'
     * - Snake case: 'pbx_name' -> 'Name'
     *
     * @param string $key The input key in any format
     * @return string|null The database key or null if not found
     */
    private static function resolveSettingKey(string $key): ?string
    {
        static $constantsMap = null;
        static $reverseMap = null;

        if ($constantsMap === null) {
            $reflection = new ReflectionClass(PbxSettings::class);
            $constantsMap = $reflection->getConstants();
            $reverseMap = array_flip($constantsMap);
        }

        // If key is already a valid DB key
        if (isset($reverseMap[$key])) {
            return $key;
        }

        // If key is a constant name (PBX_NAME)
        $upperKey = strtoupper($key);
        if (isset($constantsMap[$upperKey])) {
            return $constantsMap[$upperKey];
        }

        return null;
    }

    /**
     * Merges another ProvisioningConfig into this one.
     *
     * Values from $other override values in $this only if they are not null/empty.
     * Arrays are merged with $other values taking precedence.
     *
     * @param ProvisioningConfig $other Configuration to merge
     * @return self Returns $this for chaining
     */
    public function merge(ProvisioningConfig $other): self
    {
        if ($other->hostname !== null) {
            $this->hostname = $other->hostname;
        }
        if ($other->externalIp !== null) {
            $this->externalIp = $other->externalIp;
        }
        if ($other->externalHostname !== null) {
            $this->externalHostname = $other->externalHostname;
        }
        if ($other->sshKeys !== null) {
            $this->sshKeys = $other->sshKeys;
        }
        if ($other->sshLogin !== null) {
            $this->sshLogin = $other->sshLogin;
        }
        if ($other->webPassword !== null) {
            $this->webPassword = $other->webPassword;
        }
        if ($other->instanceId !== null) {
            $this->instanceId = $other->instanceId;
        }
        if ($other->topology !== null) {
            $this->topology = $other->topology;
        }

        // Merge arrays - other takes precedence
        $this->pbxSettings = array_merge($this->pbxSettings, $other->pbxSettings);
        $this->networkSettings = array_merge($this->networkSettings, $other->networkSettings);

        return $this;
    }

    /**
     * Checks if the configuration has any meaningful data.
     *
     * @return bool True if at least one field is set
     */
    public function isEmpty(): bool
    {
        return $this->hostname === null
            && $this->externalIp === null
            && $this->externalHostname === null
            && $this->sshKeys === null
            && $this->sshLogin === null
            && $this->webPassword === null
            && $this->instanceId === null
            && $this->topology === null
            && empty($this->pbxSettings)
            && empty($this->networkSettings);
    }

    /**
     * Returns a debug representation of the config.
     *
     * Masks sensitive values like passwords.
     *
     * @return array
     */
    public function toDebugArray(): array
    {
        return [
            'hostname' => $this->hostname,
            'externalIp' => $this->externalIp,
            'externalHostname' => $this->externalHostname,
            'sshKeys' => $this->sshKeys !== null ? '[SET]' : null,
            'sshLogin' => $this->sshLogin,
            'webPassword' => $this->webPassword !== null ? '[SET]' : null,
            'instanceId' => $this->instanceId !== null ? substr($this->instanceId, 0, 8) . '...' : null,
            'topology' => $this->topology,
            'pbxSettingsCount' => count($this->pbxSettings),
            'networkSettingsCount' => count($this->networkSettings),
        ];
    }
}
