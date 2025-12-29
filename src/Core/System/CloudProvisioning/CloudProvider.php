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

use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use ReflectionClass;

abstract class CloudProvider
{
    protected const int HTTP_TIMEOUT = 3;

    /**
     * Path to the SQLite database file.
     */
    private const string PATH_DB = '/cf/conf/mikopbx.db';

    /**
     * Path to JSON settings file for service ports.
     */
    private const string PATH_JSON_SETTINGS = '/etc/inc/mikopbx-settings.json';

    /**
     * Valid column names for LAN interface updates.
     * Used to prevent SQL injection in direct SQLite queries.
     */
    private const array VALID_LAN_COLUMNS = [
        'topology', 'extipaddr', 'exthostname', 'hostname', 'domain',
        'ipaddr', 'subnet', 'gateway', 'primarydns', 'secondarydns',
        'ipv6_mode', 'ipv6addr', 'ipv6_subnet', 'ipv6_gateway',
        'primarydns6', 'secondarydns6', 'dhcp', 'internet', 'vlanid',
        'disabled'
    ];

    abstract public function provision(): bool;

    private bool $isTheFirstMessage = true;

    /**
     * Cache of current PbxSettings from database (loaded once on first use).
     * @var array<string, string>|null
     */
    private ?array $pbxSettingsCache = null;

    /**
     * Cache of JSON settings.
     * @var array<string, mixed>|null
     */
    private ?array $jsonSettingsCache = null;

    /**
     * Tracks changed PbxSettings keys for later notification.
     * @var array<string>
     */
    protected array $changedPbxSettings = [];

    /**
     * Performs an asynchronous check to determine if this cloud provider is available.
     * Returns a Promise that resolves to boolean indicating availability.
     *
     * @return PromiseInterface Promise that resolves to bool
     */
    abstract public function checkAvailability(): PromiseInterface;

    /**
     * Returns the hardware type name for VirtualHardwareType setting.
     *
     * Override in subclass to provide custom name (e.g., 'Lxc' instead of 'LxcCloud').
     * Default implementation removes 'Cloud' suffix from class name.
     *
     * @return string Hardware type name
     */
    public function getHardwareTypeName(): string
    {
        // Default: use class name without namespace (e.g., DockerCloud, AWSCloud)
        return basename(str_replace('\\', '/', static::class));
    }

    /**
     * Updates the SSH keys.
     *
     * @param string $data The SSH keys data.
     */
    protected function updateSSHKeys(string $data): void
    {
        if (empty($data)) {
            return;
        }
        $arrData = explode(':', $data);
        if (count($arrData) === 2) {
            $data = $arrData[1];
        }
        $this->updatePbxSettings(PbxSettings::SSH_AUTHORIZED_KEYS, $data);
    }

    /**
     * Updates the PBX settings with the provided key and data.
     *
     * @param string $keyName The key name.
     * @param string|int|null $data The data to be stored.
     */
    public function updatePbxSettings(string $keyName, string|int|null $data): void
    {
        $setting = PbxSettings::findFirst('key="' . $keyName . '"');
        if (!$setting) {
            $setting = new PbxSettings();
            $setting->key = $keyName;
        }
        $setting->value = $data;
        $result = $setting->save();
        $message = "      |- Update PbxSettings - $keyName ... ";
        $this->publishMessage($message);
        if ($result) {
            SystemMessages::teletypeEchoResult($message);
        } else {
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
        }
        unset($setting);
    }

    /**
     * Updates the LAN settings.
     *
     * @param string $extipaddr The external IP address.
     */
    protected function updateLanSettings(string $extipaddr): void
    {
        /** @var LanInterfaces|null $lanData */
        $lanData = LanInterfaces::findFirst();
        if ($lanData !== null) {

            if (empty($extipaddr)) {
                PbxSettings::setValueByKey(PbxSettings::AUTO_UPDATE_EXTERNAL_IP, '1');
            } elseif ($lanData->ipaddr === $extipaddr) {
                $lanData->topology = LanInterfaces::TOPOLOGY_PUBLIC;
            } else {
                $lanData->extipaddr = $extipaddr;
                $lanData->topology = LanInterfaces::TOPOLOGY_PRIVATE;
                PbxSettings::setValueByKey(PbxSettings::AUTO_UPDATE_EXTERNAL_IP, '1');
            }
            $message = "      |- Update LAN settings external IP: $extipaddr";
            $this->publishMessage($message);
            $result = $lanData->save();
            if ($result) {
                SystemMessages::teletypeEchoResult($message);
            } else {
                SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
            }
        } else {
            $message = "      |- LAN interface not found";
            $this->publishMessage($message);
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
        }
    }

    /**
     * Updates host name
     *
     * @param string $hostname The hostname.
     */
    protected function updateHostName(string $hostname): void
    {
        $this->updatePbxSettings(PbxSettings::PBX_NAME, $hostname);
        $lanData = LanInterfaces::findFirst();
        if ($lanData !== null) {
            $lanData->hostname = $hostname;
            $lanData->save();
        }
    }

    /**
     * Updates the SSH password.
     */
    protected function updateSSHCredentials(string $sshLogin, string $hashSalt): void
    {
        $ifconfigOutput = shell_exec(Util::which('ifconfig'));
        $data = md5(($ifconfigOutput ?? '') . $hashSalt . time());
        $this->updatePbxSettings(PbxSettings::SSH_LOGIN, $sshLogin);
        $this->updatePbxSettings(PbxSettings::SSH_PASSWORD, $data);
        $this->updatePbxSettings(PbxSettings::SSH_DISABLE_SSH_PASSWORD, '1');
    }

    /**
     * Updates the web password based on the instance name and ID.
     *
     * @param string $webPassword The web password.
     */
    protected function updateWebPassword(string $webPassword): void
    {
        if (empty($webPassword)) {
            return;
        }
        $this->updatePbxSettings(PbxSettings::WEB_ADMIN_PASSWORD, $webPassword);
        $this->updatePbxSettings(PbxSettings::CLOUD_INSTANCE_ID, $webPassword);
        $this->updatePbxSettings(PbxSettings::PBX_DESCRIPTION, PbxSettings::DEFAULT_CLOUD_PASSWORD_DESCRIPTION);
    }

    /**
     * Publishes a message with PHP_EOL if the first message
     *
     * @param string $msg
     * @return void
     */
    private function publishMessage(string $msg): void
    {
        if ($this->isTheFirstMessage) {
            $msg = PHP_EOL.$msg;
            $this->isTheFirstMessage = false;
        }
        SystemMessages::echoToTeletype($msg);
    }

    /**
     * Applies a unified provisioning configuration to the system.
     *
     * This method processes a ProvisioningConfig DTO and applies all settings
     * to the database. It replaces the individual update* methods when using
     * user-data or unified configuration sources.
     *
     * @param ProvisioningConfig $config The configuration to apply
     * @return bool True if configuration was applied successfully
     */
    protected function applyConfig(ProvisioningConfig $config): bool
    {
        if ($config->isEmpty()) {
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Apply hostname
        if ($config->hostname !== null) {
            $this->updateHostName($config->hostname);
        }

        // Apply external IP / topology
        if ($config->externalIp !== null) {
            $this->updateLanSettings($config->externalIp);
        } elseif ($config->topology !== null) {
            // If only topology is set without external IP
            $lanData = LanInterfaces::findFirst();
            if ($lanData !== null) {
                $lanData->topology = $config->topology;
                $lanData->save();
            }
        }

        // Apply external hostname
        if ($config->externalHostname !== null) {
            $lanData = LanInterfaces::findFirst();
            if ($lanData !== null) {
                $lanData->exthostname = $config->externalHostname;
                $lanData->save();
            }
        }

        // Apply SSH keys
        if ($config->sshKeys !== null) {
            $this->updateSSHKeys($config->sshKeys);
        }

        // Apply SSH credentials
        if ($config->sshLogin !== null && $config->instanceId !== null) {
            $this->updateSSHCredentials($config->sshLogin, $config->instanceId);
        }

        // Apply web password
        if ($config->webPassword !== null) {
            $this->updateWebPassword($config->webPassword);
        } elseif ($config->instanceId !== null) {
            // Use instance ID as web password (cloud provider behavior)
            $this->updateWebPassword($config->instanceId);
        }

        // Apply additional PbxSettings
        foreach ($config->pbxSettings as $key => $value) {
            $this->updatePbxSettings($key, $value);
        }

        // Apply additional network settings
        if (!empty($config->networkSettings)) {
            $lanData = LanInterfaces::findFirst();
            if ($lanData !== null) {
                $changed = false;
                foreach ($config->networkSettings as $key => $value) {
                    if (property_exists($lanData, $key)) {
                        $lanData->$key = $value;
                        $changed = true;
                    }
                }
                if ($changed) {
                    $message = "      |- Update LAN settings from config";
                    SystemMessages::echoToTeletype($message);
                    $result = $lanData->save();
                    if ($result) {
                        SystemMessages::teletypeEchoResult($message);
                    } else {
                        SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
                    }
                }
            }
        }

        return true;
    }

    /**
     * Fetches user-data from the cloud provider's metadata service.
     *
     * Override this method in providers that support user-data.
     * The returned string can be YAML, JSON, or a shell script.
     *
     * @return string|null User-data content or null if not available
     */
    protected function fetchUserData(): ?string
    {
        // Default implementation returns null - no user-data support
        // Override in cloud providers that support user-data
        return null;
    }

    /**
     * Parses user-data content and returns a ProvisioningConfig.
     *
     * Automatically detects the format (YAML, JSON, or shell script).
     *
     * @param string $userData Raw user-data content
     * @return ProvisioningConfig|null Parsed config or null if parsing failed
     */
    protected function parseUserData(string $userData): ?ProvisioningConfig
    {
        $trimmed = trim($userData);
        if (empty($trimmed)) {
            return null;
        }

        // Skip shell scripts
        if (str_starts_with($trimmed, '#!')) {
            return null;
        }

        // Try JSON first (starts with { or [)
        if (str_starts_with($trimmed, '{') || str_starts_with($trimmed, '[')) {
            return ProvisioningConfig::fromJson($userData);
        }

        // Try YAML (includes #cloud-config)
        return ProvisioningConfig::fromYaml($userData);
    }

    // =========================================================================
    // Direct SQLite Methods (no Redis/ORM dependency)
    // These methods work during early boot before Redis is available
    // =========================================================================

    /**
     * Loads PbxSettings from database into cache using direct SQLite query.
     * This method does not use Phalcon ORM or Redis.
     *
     * @return array<string, string> Key-value pairs of settings
     */
    protected function loadPbxSettingsDirectly(): array
    {
        if ($this->pbxSettingsCache !== null) {
            return $this->pbxSettingsCache;
        }

        $sqlite3 = Util::which('sqlite3');
        $out = [];
        Processes::mwExec("$sqlite3 " . self::PATH_DB . " 'SELECT key,value FROM m_PbxSettings'", $out);

        $this->pbxSettingsCache = [];
        foreach ($out as $row) {
            $data = explode('|', $row);
            $key = $data[0];
            $value = $data[1] ?? '';
            if ($key !== '') {
                $this->pbxSettingsCache[$key] = $value;
            }
        }

        return $this->pbxSettingsCache;
    }

    /**
     * Gets a PbxSettings value directly from SQLite database.
     *
     * @param string $key The setting key
     * @return string|null The value or null if not found
     */
    protected function getPbxSettingDirect(string $key): ?string
    {
        $settings = $this->loadPbxSettingsDirectly();
        return $settings[$key] ?? null;
    }

    /**
     * Updates or inserts a PbxSettings value directly in SQLite database.
     * Does not use Phalcon ORM or Redis cache.
     *
     * @param string $key The setting key
     * @param string|int|null $value The value to set
     * @return bool True if update was successful
     */
    protected function updatePbxSettingsDirect(string $key, string|int|null $value): bool
    {
        // VALIDATE KEY FIRST - prevent SQL injection
        $reflection = new ReflectionClass(PbxSettings::class);
        $constants = $reflection->getConstants();
        if (!in_array($key, $constants, true)) {
            SystemMessages::sysLogMsg(__METHOD__, "Invalid PbxSettings key: $key - skipping", LOG_WARNING);
            return false;
        }

        $sqlite3 = Util::which('sqlite3');
        $dbPath = self::PATH_DB;
        $escapedKey = str_replace("'", "''", $key);
        $escapedValue = str_replace("'", "''", (string)$value);
        $out = [];

        $settings = $this->loadPbxSettingsDirectly();

        if (array_key_exists($key, $settings)) {
            // Update existing setting if value is different
            if ($settings[$key] !== (string)$value) {
                $command = "$sqlite3 $dbPath \"UPDATE m_PbxSettings SET value='$escapedValue' WHERE key='$escapedKey'\"";
                $res = Processes::mwExec($command, $out);
                if ($res === 0) {
                    $this->pbxSettingsCache[$key] = (string)$value;
                    $this->changedPbxSettings[] = $key;
                    $message = "      |- Update PbxSettings - $key ... ";
                    $this->publishMessage($message);
                    SystemMessages::teletypeEchoResult($message);
                    return true;
                } else {
                    $message = "      |- Update PbxSettings - $key ... ";
                    $this->publishMessage($message);
                    SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
                    SystemMessages::sysLogMsg(__METHOD__, "Update $key failed: " . implode($out), LOG_ERR);
                    return false;
                }
            }
            return true; // Value unchanged, consider success
        } else {
            // Insert new setting (key already validated above)
            $command = "$sqlite3 $dbPath \"INSERT INTO m_PbxSettings (key, value) VALUES ('$escapedKey', '$escapedValue')\"";
            $res = Processes::mwExec($command, $out);
            if ($res === 0) {
                $this->pbxSettingsCache[$key] = (string)$value;
                $this->changedPbxSettings[] = $key;
                $message = "      |- Create PbxSettings - $key ... ";
                $this->publishMessage($message);
                SystemMessages::teletypeEchoResult($message);
                return true;
            } else {
                $message = "      |- Create PbxSettings - $key ... ";
                $this->publishMessage($message);
                SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
                SystemMessages::sysLogMsg(__METHOD__, "Insert $key failed: " . implode($out), LOG_ERR);
                return false;
            }
        }
    }

    /**
     * Updates LAN interface settings directly in SQLite database.
     *
     * @param string $column The column name to update
     * @param string $value The value to set
     * @return bool True if update was successful
     */
    protected function updateLanSettingDirect(string $column, string $value): bool
    {
        $sqlite3 = Util::which('sqlite3');
        $dbPath = self::PATH_DB;
        $escapedValue = str_replace("'", "''", $value);
        $out = [];

        // Validate column name to prevent SQL injection
        if (!in_array($column, self::VALID_LAN_COLUMNS, true)) {
            SystemMessages::sysLogMsg(__METHOD__, "Invalid LAN column: $column", LOG_WARNING);
            return false;
        }

        $command = "$sqlite3 $dbPath \"UPDATE m_LanInterfaces SET $column='$escapedValue' WHERE internet='1'\"";
        $res = Processes::mwExec($command, $out);

        $message = "      |- Update LanInterfaces.$column ... ";
        $this->publishMessage($message);

        if ($res === 0) {
            SystemMessages::teletypeEchoResult($message);
            return true;
        } else {
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
            SystemMessages::sysLogMsg(__METHOD__, "Update $column failed: " . implode($out), LOG_ERR);
            return false;
        }
    }

    /**
     * Gets a LAN interface setting directly from SQLite database.
     *
     * @param string $column The column to retrieve
     * @return string|null The value or null if not found
     */
    protected function getLanSettingDirect(string $column): ?string
    {
        // Validate column name to prevent SQL injection
        if (!in_array($column, self::VALID_LAN_COLUMNS, true)) {
            SystemMessages::sysLogMsg(__METHOD__, "Invalid LAN column: $column", LOG_WARNING);
            return null;
        }

        $sqlite3 = Util::which('sqlite3');
        $dbPath = self::PATH_DB;
        $out = [];

        $command = "$sqlite3 $dbPath \"SELECT $column FROM m_LanInterfaces WHERE internet='1' LIMIT 1\"";
        Processes::mwExec($command, $out);

        return !empty($out[0]) ? $out[0] : null;
    }

    /**
     * Resets LAN interfaces table and creates a single primary interface.
     *
     * This method clears all existing LAN interface records and creates one
     * new record with the specified interface name. Used during container
     * provisioning to ensure clean network configuration.
     *
     * Uses ORM since Redis is already running at this point.
     *
     * @param string $interfaceName Network interface name (e.g., 'eth0')
     * @return bool True on success
     */
    protected function resetLanInterface(string $interfaceName): bool
    {
        // Sanitize interface name (alphanumeric and common chars only)
        $sanitizedInterface = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $interfaceName);
        if (empty($sanitizedInterface)) {
            $sanitizedInterface = 'eth0';
        }

        $message = "      |- Reset LAN interfaces table...";
        $this->publishMessage($message);

        SystemMessages::sysLogMsg(__METHOD__, "Creating LAN interface with name='$sanitizedInterface'");

        // Delete all existing records using ORM
        $existingInterfaces = LanInterfaces::find();
        foreach ($existingInterfaces as $interface) {
            if (!$interface->delete()) {
                SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
                SystemMessages::sysLogMsg(__METHOD__, "Failed to delete LAN interface: " . implode(', ', $interface->getMessages()), LOG_ERR);
                return false;
            }
        }

        // Create new primary interface with correct defaults
        // IMPORTANT: vlanid='0' is required for Network::updateIfSettings() DHCP callback to find this record
        $lanInterface = new LanInterfaces();
        $lanInterface->id = 1;
        $lanInterface->interface = $sanitizedInterface;
        $lanInterface->internet = '1';
        $lanInterface->disabled = '0';
        $lanInterface->dhcp = '1';
        $lanInterface->ipaddr = '';
        $lanInterface->subnet = '24';
        $lanInterface->gateway = '';
        $lanInterface->hostname = '';
        $lanInterface->domain = '';
        $lanInterface->topology = LanInterfaces::TOPOLOGY_PRIVATE;
        $lanInterface->extipaddr = '';
        $lanInterface->primarydns = '';
        $lanInterface->secondarydns = '';
        $lanInterface->ipv6_mode = '0';
        $lanInterface->ipv6addr = '';
        $lanInterface->ipv6_subnet = '';
        $lanInterface->ipv6_gateway = '';
        $lanInterface->primarydns6 = '';
        $lanInterface->secondarydns6 = '';
        $lanInterface->vlanid = '0';

        if (!$lanInterface->save()) {
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_FAILED);
            SystemMessages::sysLogMsg(__METHOD__, "Failed to create LAN interface: " . implode(', ', $lanInterface->getMessages()), LOG_ERR);
            return false;
        }

        SystemMessages::teletypeEchoResult($message);
        return true;
    }

    /**
     * Loads JSON settings file into cache.
     *
     * @return array<string, mixed> Parsed JSON settings
     */
    protected function loadJsonSettings(): array
    {
        if ($this->jsonSettingsCache !== null) {
            return $this->jsonSettingsCache;
        }

        if (!file_exists(self::PATH_JSON_SETTINGS)) {
            $this->jsonSettingsCache = [];
            return $this->jsonSettingsCache;
        }

        $jsonString = file_get_contents(self::PATH_JSON_SETTINGS);
        if ($jsonString === false) {
            $this->jsonSettingsCache = [];
            return $this->jsonSettingsCache;
        }

        try {
            $this->jsonSettingsCache = json_decode($jsonString, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $this->jsonSettingsCache = [];
        }

        return $this->jsonSettingsCache;
    }

    /**
     * Updates a setting in the JSON configuration file.
     *
     * @param string $path The JSON path (e.g., 'beanstalk', 'redis', 'gnats')
     * @param string $key The setting key within the path (e.g., 'port')
     * @param mixed $newValue The new value to set
     * @return bool True if the setting was updated
     */
    protected function updateJsonSettingDirect(string $path, string $key, mixed $newValue): bool
    {
        $settings = $this->loadJsonSettings();

        if (($settings[$path][$key] ?? null) !== $newValue) {
            $settings[$path][$key] = $newValue;
            $this->jsonSettingsCache = $settings;

            $newData = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if ($newData !== false) {
                file_put_contents(self::PATH_JSON_SETTINGS, $newData);
                SystemMessages::sysLogMsg(__METHOD__, "Update $path:$key to '$newValue' in JSON settings", LOG_DEBUG);
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if cloud provisioning has already been completed.
     * Uses direct SQLite query without ORM/Redis.
     *
     * @return bool True if provisioning was already done
     */
    public static function isProvisioningCompleted(): bool
    {
        $sqlite3 = Util::which('sqlite3');
        $out = [];
        // Escape constant value for SQL safety (defense in depth)
        $key = str_replace("'", "''", PbxSettings::CLOUD_PROVISIONING);
        $command = "$sqlite3 " . self::PATH_DB . " \"SELECT value FROM m_PbxSettings WHERE key='$key'\"";
        Processes::mwExec($command, $out);

        return !empty($out[0]);
    }

    /**
     * Gets the list of changed PbxSettings keys during provisioning.
     *
     * @return array<string> List of changed keys
     */
    public function getChangedSettings(): array
    {
        return $this->changedPbxSettings;
    }

    // =========================================================================
    // Direct Config Application Methods
    // These replace applyConfig() when ORM is not available
    // =========================================================================

    /**
     * Applies a unified provisioning configuration using direct SQLite queries.
     * This method replaces applyConfig() for early boot when Redis is unavailable.
     *
     * @param ProvisioningConfig $config The configuration to apply
     * @return bool True if configuration was applied successfully
     */
    protected function applyConfigDirect(ProvisioningConfig $config): bool
    {
        if ($config->isEmpty()) {
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Apply hostname
        if ($config->hostname !== null) {
            $this->updatePbxSettingsDirect(PbxSettings::PBX_NAME, $config->hostname);
            $this->updateLanSettingDirect('hostname', $config->hostname);
        }

        // Apply external IP / topology
        if ($config->externalIp !== null) {
            $this->applyExternalIpDirect($config->externalIp);
        } elseif ($config->topology !== null) {
            $this->updateLanSettingDirect('topology', $config->topology);
        }

        // Apply external hostname
        if ($config->externalHostname !== null) {
            $this->updateLanSettingDirect('exthostname', $config->externalHostname);
        }

        // Apply SSH keys
        if ($config->sshKeys !== null) {
            $sshKeys = $config->sshKeys;
            // Parse "user:ssh-rsa..." format
            $arrData = explode(':', $sshKeys);
            if (count($arrData) === 2) {
                $sshKeys = $arrData[1];
            }
            $this->updatePbxSettingsDirect(PbxSettings::SSH_AUTHORIZED_KEYS, $sshKeys);
        }

        // Apply SSH credentials
        if ($config->sshLogin !== null && $config->instanceId !== null) {
            $ifconfigOutput = shell_exec(Util::which('ifconfig'));
            $sshPassword = md5(($ifconfigOutput ?? '') . $config->instanceId . time());
            $this->updatePbxSettingsDirect(PbxSettings::SSH_LOGIN, $config->sshLogin);
            $this->updatePbxSettingsDirect(PbxSettings::SSH_PASSWORD, $sshPassword);
            $this->updatePbxSettingsDirect(PbxSettings::SSH_DISABLE_SSH_PASSWORD, '1');
        }

        // Apply web password
        if ($config->webPassword !== null) {
            $this->updatePbxSettingsDirect(PbxSettings::WEB_ADMIN_PASSWORD, $config->webPassword);

            // Only set CloudInstanceId for real cloud providers, not Docker/NoCloud
            // Docker uses 12-factor ENV vars applied on every restart
            // NoCloud is for on-premise where users control passwords
            if ($this->shouldSetCloudInstanceId()) {
                $this->updatePbxSettingsDirect(PbxSettings::CLOUD_INSTANCE_ID, $config->webPassword);
            }

            $this->updatePbxSettingsDirect(PbxSettings::PBX_DESCRIPTION, PbxSettings::DEFAULT_CLOUD_PASSWORD_DESCRIPTION);
        } elseif ($config->instanceId !== null) {
            // Use instance ID as web password (cloud provider behavior)
            $this->updatePbxSettingsDirect(PbxSettings::WEB_ADMIN_PASSWORD, $config->instanceId);

            // Only set CloudInstanceId for real cloud providers
            if ($this->shouldSetCloudInstanceId()) {
                $this->updatePbxSettingsDirect(PbxSettings::CLOUD_INSTANCE_ID, $config->instanceId);
            }

            $this->updatePbxSettingsDirect(PbxSettings::PBX_DESCRIPTION, PbxSettings::DEFAULT_CLOUD_PASSWORD_DESCRIPTION);
        }

        // Apply additional PbxSettings
        foreach ($config->pbxSettings as $key => $value) {
            $this->updatePbxSettingsDirect($key, $value);
        }

        // Apply additional network settings
        foreach ($config->networkSettings as $key => $value) {
            $this->updateLanSettingDirect($key, (string)$value);
        }

        return true;
    }

    /**
     * Applies external IP configuration with topology detection using direct SQLite.
     *
     * @param string $extipaddr The external IP address
     */
    protected function applyExternalIpDirect(string $extipaddr): void
    {
        if (empty($extipaddr)) {
            $this->updatePbxSettingsDirect(PbxSettings::AUTO_UPDATE_EXTERNAL_IP, '1');
            return;
        }

        $currentIp = $this->getLanSettingDirect('ipaddr');

        if ($currentIp === $extipaddr) {
            // Public topology - external IP matches internal IP
            $this->updateLanSettingDirect('topology', LanInterfaces::TOPOLOGY_PUBLIC);
        } else {
            // Private topology - behind NAT
            $this->updateLanSettingDirect('extipaddr', $extipaddr);
            $this->updateLanSettingDirect('topology', LanInterfaces::TOPOLOGY_PRIVATE);
            $this->updatePbxSettingsDirect(PbxSettings::AUTO_UPDATE_EXTERNAL_IP, '1');
        }

        $message = "      |- Update LAN settings external IP: $extipaddr";
        $this->publishMessage($message);
        SystemMessages::teletypeEchoResult($message);
    }

    /**
     * Determines if CloudInstanceId should be set for this provider.
     *
     * CloudInstanceId should only be set for real cloud providers (AWS, GCP, Azure, etc.)
     * to track the initial deployment password. It should NOT be set for:
     * - Docker: Uses 12-factor ENV vars applied on every restart
     * - NoCloud: On-premise installations where users control passwords
     *
     * @return bool True if CloudInstanceId should be set
     */
    protected function shouldSetCloudInstanceId(): bool
    {
        $className = static::class;
        $providerName = basename(str_replace('\\', '/', $className));

        // Skip CloudInstanceId for Docker and NoCloud
        return !in_array($providerName, ['DockerCloud', 'NoCloud'], true);
    }

    /**
     * Marks provisioning as completed and enables security features.
     * Uses direct SQLite queries.
     *
     * @param string $cloudName The name of the cloud provider
     */
    public function markProvisioningCompleteDirect(string $cloudName): void
    {
        $this->updatePbxSettingsDirect(PbxSettings::PBX_FIREWALL_ENABLED, '1');
        $this->updatePbxSettingsDirect(PbxSettings::PBX_FAIL2BAN_ENABLED, '1');
        $this->updatePbxSettingsDirect(PbxSettings::CLOUD_PROVISIONING, '1');
        $this->updatePbxSettingsDirect(PbxSettings::VIRTUAL_HARDWARE_TYPE, $cloudName);
    }
}
