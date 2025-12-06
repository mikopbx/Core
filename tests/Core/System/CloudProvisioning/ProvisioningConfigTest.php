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

namespace MikoPBX\Tests\Core\System\CloudProvisioning;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\CloudProvisioning\ProvisioningConfig;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for ProvisioningConfig DTO.
 *
 * Tests factory methods (fromEnvironment, fromYaml, fromJson, fromArray),
 * merge behavior, and utility methods.
 *
 * Note: This test uses PHPUnit\Framework\TestCase directly without MikoPBX DI
 * to allow running tests outside of Docker container environment.
 *
 * @package MikoPBX\Tests\Core\System\CloudProvisioning
 */
class ProvisioningConfigTest extends TestCase
{
    /**
     * Original environment variables for cleanup.
     * @var array<string, string|false>
     */
    private array $originalEnv = [];

    /**
     * Environment variables to set for testing.
     * @var array<string, string>
     */
    private array $testEnvVars = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->originalEnv = [];
        $this->testEnvVars = [];
    }

    protected function tearDown(): void
    {
        // Restore original environment
        foreach ($this->originalEnv as $name => $value) {
            if ($value === false) {
                putenv($name);
            } else {
                putenv("$name=$value");
            }
        }
        parent::tearDown();
    }

    /**
     * Sets environment variables for testing and stores originals for cleanup.
     *
     * @param array<string, string> $vars Variables to set
     */
    private function setTestEnvironment(array $vars): void
    {
        foreach ($vars as $name => $value) {
            $this->originalEnv[$name] = getenv($name);
            putenv("$name=$value");
        }
        $this->testEnvVars = $vars;
    }

    // ========================================
    // Tests for fromEnvironment()
    // ========================================

    public function testFromEnvironmentEmpty(): void
    {
        // Skip in Docker environment where MikoPBX ENV vars are already set
        if (file_exists('/.dockerenv')) {
            $this->markTestSkipped('Test only runs outside Docker where no MikoPBX ENV vars are set');
        }

        // Ensure no relevant env vars are set
        $this->setTestEnvironment([]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertTrue($config->isEmpty(), 'Config should be empty when no ENV vars set');
    }

    public function testFromEnvironmentHostname(): void
    {
        $this->setTestEnvironment([
            'PBX_NAME' => 'test-pbx-hostname',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame('test-pbx-hostname', $config->hostname);
        $this->assertFalse($config->isEmpty());
    }

    public function testFromEnvironmentWebPassword(): void
    {
        $this->setTestEnvironment([
            'WEB_ADMIN_PASSWORD' => 'secret123',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame('secret123', $config->webPassword);
    }

    public function testFromEnvironmentSshKeys(): void
    {
        $sshKey = 'ssh-rsa AAAA... user@host';
        $this->setTestEnvironment([
            'SSH_AUTHORIZED_KEYS' => $sshKey,
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame($sshKey, $config->sshKeys);
    }

    public function testFromEnvironmentSshLogin(): void
    {
        $this->setTestEnvironment([
            'SSH_LOGIN' => 'admin',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame('admin', $config->sshLogin);
    }

    public function testFromEnvironmentNatEnabled(): void
    {
        $this->setTestEnvironment([
            'ENABLE_USE_NAT' => '1',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame(LanInterfaces::TOPOLOGY_PRIVATE, $config->topology);
        $this->assertSame(LanInterfaces::TOPOLOGY_PRIVATE, $config->networkSettings['topology'] ?? null);
    }

    public function testFromEnvironmentExternalIp(): void
    {
        $this->setTestEnvironment([
            'EXTERNAL_SIP_IP_ADDR' => '203.0.113.50',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame('203.0.113.50', $config->externalIp);
        $this->assertSame('203.0.113.50', $config->networkSettings['extipaddr'] ?? null);
    }

    public function testFromEnvironmentExternalHostname(): void
    {
        $this->setTestEnvironment([
            'EXTERNAL_SIP_HOST_NAME' => 'sip.example.com',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame('sip.example.com', $config->externalHostname);
        $this->assertSame('sip.example.com', $config->networkSettings['exthostname'] ?? null);
    }

    public function testFromEnvironmentGenericPbxSettings(): void
    {
        $this->setTestEnvironment([
            'PBX_LANGUAGE' => 'ru-ru',
            'PBX_RECORD_CALLS' => '1',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        // Generic settings should go to pbxSettings array
        $this->assertSame('ru-ru', $config->pbxSettings[PbxSettings::PBX_LANGUAGE] ?? null);
        $this->assertSame('1', $config->pbxSettings[PbxSettings::PBX_RECORD_CALLS] ?? null);
    }

    public function testFromEnvironmentMultipleSettings(): void
    {
        $this->setTestEnvironment([
            'PBX_NAME' => 'my-pbx',
            'WEB_ADMIN_PASSWORD' => 'pass123',
            'SSH_AUTHORIZED_KEYS' => 'ssh-rsa AAAA...',
            'EXTERNAL_SIP_IP_ADDR' => '1.2.3.4',
            'ENABLE_USE_NAT' => '1',
        ]);

        $config = ProvisioningConfig::fromEnvironment();

        $this->assertSame('my-pbx', $config->hostname);
        $this->assertSame('pass123', $config->webPassword);
        $this->assertSame('ssh-rsa AAAA...', $config->sshKeys);
        $this->assertSame('1.2.3.4', $config->externalIp);
        $this->assertSame(LanInterfaces::TOPOLOGY_PRIVATE, $config->topology);
    }

    // ========================================
    // Tests for fromJson()
    // ========================================

    public function testFromJsonInvalidJson(): void
    {
        $config = ProvisioningConfig::fromJson('not valid json');

        $this->assertNull($config);
    }

    public function testFromJsonEmptyObject(): void
    {
        $config = ProvisioningConfig::fromJson('{}');

        $this->assertNotNull($config);
        $this->assertTrue($config->isEmpty());
    }

    public function testFromJsonBasicProperties(): void
    {
        $json = json_encode([
            'hostname' => 'json-pbx',
            'external_ip' => '10.0.0.1',
            'web_password' => 'jsonpass',
        ]);

        $config = ProvisioningConfig::fromJson($json);

        $this->assertNotNull($config);
        $this->assertSame('json-pbx', $config->hostname);
        $this->assertSame('10.0.0.1', $config->externalIp);
        $this->assertSame('jsonpass', $config->webPassword);
    }

    public function testFromJsonMikopbxSection(): void
    {
        $json = json_encode([
            'mikopbx' => [
                'hostname' => 'nested-pbx',
                'web_password' => 'nestedpass',
                'ssh_authorized_keys' => ['ssh-rsa KEY1', 'ssh-ed25519 KEY2'],
            ],
        ]);

        $config = ProvisioningConfig::fromJson($json);

        $this->assertNotNull($config);
        $this->assertSame('nested-pbx', $config->hostname);
        $this->assertSame('nestedpass', $config->webPassword);
        $this->assertSame("ssh-rsa KEY1\nssh-ed25519 KEY2", $config->sshKeys);
    }

    public function testFromJsonPbxSettings(): void
    {
        $json = json_encode([
            'mikopbx' => [
                'pbx_settings' => [
                    'PBXLanguage' => 'en-en',
                    'SIPPort' => 5060,
                ],
            ],
        ]);

        $config = ProvisioningConfig::fromJson($json);

        $this->assertNotNull($config);
        $this->assertSame('en-en', $config->pbxSettings['PBXLanguage'] ?? null);
        $this->assertSame(5060, $config->pbxSettings['SIPPort'] ?? null);
    }

    public function testFromJsonNetworkSettings(): void
    {
        $json = json_encode([
            'mikopbx' => [
                'network' => [
                    'topology' => 'private',
                    'extipaddr' => '192.168.1.100',
                    'exthostname' => 'pbx.local',
                ],
            ],
        ]);

        $config = ProvisioningConfig::fromJson($json);

        $this->assertNotNull($config);
        $this->assertSame('private', $config->topology);
        $this->assertSame('192.168.1.100', $config->externalIp);
        $this->assertSame('pbx.local', $config->externalHostname);
        $this->assertSame('private', $config->networkSettings['topology'] ?? null);
    }

    public function testFromJsonAlternativePropertyNames(): void
    {
        // Test alternative property name mappings
        $json = json_encode([
            'name' => 'alt-name-pbx',
            'extipaddr' => '172.16.0.1',
            'exthostname' => 'alt.host.name',
            'ssh_keys' => 'ssh-rsa ALTKEY',
            'ssh_user' => 'altuser',
            'web_admin_password' => 'altpass',
        ]);

        $config = ProvisioningConfig::fromJson($json);

        $this->assertNotNull($config);
        $this->assertSame('alt-name-pbx', $config->hostname);
        $this->assertSame('172.16.0.1', $config->externalIp);
        $this->assertSame('alt.host.name', $config->externalHostname);
        $this->assertSame('ssh-rsa ALTKEY', $config->sshKeys);
        $this->assertSame('altuser', $config->sshLogin);
        $this->assertSame('altpass', $config->webPassword);
    }

    // ========================================
    // Tests for fromYaml()
    // ========================================

    public function testFromYamlEmptyString(): void
    {
        $config = ProvisioningConfig::fromYaml('');

        $this->assertNull($config);
    }

    public function testFromYamlScript(): void
    {
        // Scripts starting with #! should be ignored
        $config = ProvisioningConfig::fromYaml('#!/bin/bash\necho hello');

        $this->assertNull($config);
    }

    public function testFromYamlBasicConfig(): void
    {
        // Skip if yaml extension not available
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('YAML extension not available');
        }

        $yaml = <<<YAML
#cloud-config
mikopbx:
  hostname: yaml-pbx
  web_password: yamlpass
YAML;

        $config = ProvisioningConfig::fromYaml($yaml);

        $this->assertNotNull($config);
        $this->assertSame('yaml-pbx', $config->hostname);
        $this->assertSame('yamlpass', $config->webPassword);
    }

    public function testFromYamlSshKeysArray(): void
    {
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('YAML extension not available');
        }

        $yaml = <<<YAML
mikopbx:
  ssh_authorized_keys:
    - ssh-rsa AAAA... user1@host
    - ssh-ed25519 BBBB... user2@host
YAML;

        $config = ProvisioningConfig::fromYaml($yaml);

        $this->assertNotNull($config);
        $this->assertStringContainsString('ssh-rsa AAAA...', $config->sshKeys);
        $this->assertStringContainsString('ssh-ed25519 BBBB...', $config->sshKeys);
    }

    public function testFromYamlFullConfig(): void
    {
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('YAML extension not available');
        }

        $yaml = <<<YAML
#cloud-config
mikopbx:
  hostname: full-pbx
  external_ip: 203.0.113.100
  external_hostname: pbx.example.com
  web_password: fullpass
  ssh_login: customuser
  instance_id: i-12345678
  topology: private
  ssh_authorized_keys:
    - ssh-rsa KEYDATA
  pbx_settings:
    PBXLanguage: de-de
    PBXRecordCalls: "1"
  network:
    extipaddr: 203.0.113.100
    topology: private
YAML;

        $config = ProvisioningConfig::fromYaml($yaml);

        $this->assertNotNull($config);
        $this->assertSame('full-pbx', $config->hostname);
        $this->assertSame('203.0.113.100', $config->externalIp);
        $this->assertSame('pbx.example.com', $config->externalHostname);
        $this->assertSame('fullpass', $config->webPassword);
        $this->assertSame('customuser', $config->sshLogin);
        $this->assertSame('i-12345678', $config->instanceId);
        $this->assertSame('private', $config->topology);
        $this->assertSame('ssh-rsa KEYDATA', $config->sshKeys);
        $this->assertSame('de-de', $config->pbxSettings['PBXLanguage'] ?? null);
    }

    // ========================================
    // Tests for fromArray()
    // ========================================

    public function testFromArrayEmpty(): void
    {
        $config = ProvisioningConfig::fromArray([]);

        $this->assertTrue($config->isEmpty());
    }

    public function testFromArrayDirectProperties(): void
    {
        $config = ProvisioningConfig::fromArray([
            'hostname' => 'array-pbx',
            'external_ip' => '10.10.10.10',
            'instance_id' => 'inst-abc123',
        ]);

        $this->assertSame('array-pbx', $config->hostname);
        $this->assertSame('10.10.10.10', $config->externalIp);
        $this->assertSame('inst-abc123', $config->instanceId);
    }

    public function testFromArrayNestedMikopbx(): void
    {
        $config = ProvisioningConfig::fromArray([
            'mikopbx' => [
                'hostname' => 'nested-array-pbx',
                'web_password' => 'nestedarraypass',
            ],
        ]);

        $this->assertSame('nested-array-pbx', $config->hostname);
        $this->assertSame('nestedarraypass', $config->webPassword);
    }

    // ========================================
    // Tests for merge()
    // ========================================

    public function testMergeOverridesNonNull(): void
    {
        $base = ProvisioningConfig::fromArray([
            'hostname' => 'base-host',
            'external_ip' => '1.1.1.1',
            'web_password' => 'basepass',
        ]);

        $override = ProvisioningConfig::fromArray([
            'hostname' => 'override-host',
            'external_ip' => '2.2.2.2',
            // web_password not set - should keep base value
        ]);

        $base->merge($override);

        $this->assertSame('override-host', $base->hostname);
        $this->assertSame('2.2.2.2', $base->externalIp);
        $this->assertSame('basepass', $base->webPassword);
    }

    public function testMergePreservesNullValues(): void
    {
        $base = ProvisioningConfig::fromArray([
            'hostname' => 'base-host',
            'ssh_keys' => 'ssh-rsa BASE',
        ]);

        $override = new ProvisioningConfig();
        $override->hostname = null; // Explicit null should not override
        $override->sshLogin = 'newuser';

        $base->merge($override);

        $this->assertSame('base-host', $base->hostname);
        $this->assertSame('ssh-rsa BASE', $base->sshKeys);
        $this->assertSame('newuser', $base->sshLogin);
    }

    public function testMergeArrays(): void
    {
        $base = ProvisioningConfig::fromArray([
            'pbx_settings' => [
                'PBXLanguage' => 'en-en',
                'SIPPort' => 5060,
            ],
        ]);

        $override = ProvisioningConfig::fromArray([
            'pbx_settings' => [
                'SIPPort' => 5061,
                'IAXPort' => 4569,
            ],
        ]);

        $base->merge($override);

        // Arrays should be merged, with override taking precedence
        $this->assertSame('en-en', $base->pbxSettings['PBXLanguage'] ?? null);
        $this->assertSame(5061, $base->pbxSettings['SIPPort'] ?? null);
        $this->assertSame(4569, $base->pbxSettings['IAXPort'] ?? null);
    }

    public function testMergeChaining(): void
    {
        $config1 = ProvisioningConfig::fromArray(['hostname' => 'host1']);
        $config2 = ProvisioningConfig::fromArray(['external_ip' => '1.1.1.1']);
        $config3 = ProvisioningConfig::fromArray(['web_password' => 'pass3']);

        $result = $config1->merge($config2)->merge($config3);

        $this->assertSame($config1, $result); // Returns self
        $this->assertSame('host1', $config1->hostname);
        $this->assertSame('1.1.1.1', $config1->externalIp);
        $this->assertSame('pass3', $config1->webPassword);
    }

    // ========================================
    // Tests for isEmpty()
    // ========================================

    public function testIsEmptyTrue(): void
    {
        $config = new ProvisioningConfig();

        $this->assertTrue($config->isEmpty());
    }

    public function testIsEmptyFalseWithHostname(): void
    {
        $config = new ProvisioningConfig();
        $config->hostname = 'test';

        $this->assertFalse($config->isEmpty());
    }

    public function testIsEmptyFalseWithPbxSettings(): void
    {
        $config = new ProvisioningConfig();
        $config->pbxSettings = ['key' => 'value'];

        $this->assertFalse($config->isEmpty());
    }

    public function testIsEmptyFalseWithNetworkSettings(): void
    {
        $config = new ProvisioningConfig();
        $config->networkSettings = ['topology' => 'private'];

        $this->assertFalse($config->isEmpty());
    }

    // ========================================
    // Tests for toDebugArray()
    // ========================================

    public function testToDebugArrayMasksSensitiveData(): void
    {
        $config = ProvisioningConfig::fromArray([
            'hostname' => 'debug-pbx',
            'web_password' => 'supersecret',
            'ssh_authorized_keys' => 'ssh-rsa AAAA...',
            'instance_id' => 'i-1234567890abcdef0',
        ]);

        $debug = $config->toDebugArray();

        $this->assertSame('debug-pbx', $debug['hostname']);
        $this->assertSame('[SET]', $debug['webPassword']);
        $this->assertSame('[SET]', $debug['sshKeys']);
        $this->assertStringContainsString('i-123456', $debug['instanceId']);
        $this->assertStringContainsString('...', $debug['instanceId']);
    }

    public function testToDebugArrayCounts(): void
    {
        $config = ProvisioningConfig::fromArray([
            'pbx_settings' => [
                'PBXLanguage' => 'en-en',
                'PBXRecordCalls' => '1',
                'SIPPort' => '5060',
            ],
            'network' => [
                'topology' => 'private',
            ],
        ]);

        $debug = $config->toDebugArray();

        $this->assertSame(3, $debug['pbxSettingsCount']);
        $this->assertSame(1, $debug['networkSettingsCount']);
    }

    // ========================================
    // Tests for resolveSettingKey (via pbx_settings)
    // ========================================

    public function testResolveSettingKeyConstantName(): void
    {
        // Using constant name format (PBX_LANGUAGE)
        $config = ProvisioningConfig::fromArray([
            'pbx_settings' => [
                'PBX_LANGUAGE' => 'ru-ru',
            ],
        ]);

        $this->assertSame('ru-ru', $config->pbxSettings['PBXLanguage'] ?? null);
    }

    public function testResolveSettingKeyDbKey(): void
    {
        // Using DB key format (PBXLanguage)
        $config = ProvisioningConfig::fromArray([
            'pbx_settings' => [
                'PBXLanguage' => 'de-de',
            ],
        ]);

        $this->assertSame('de-de', $config->pbxSettings['PBXLanguage'] ?? null);
    }

    public function testResolveSettingKeyInvalid(): void
    {
        // Invalid key should be ignored
        $config = ProvisioningConfig::fromArray([
            'pbx_settings' => [
                'INVALID_KEY_XYZ' => 'value',
                'PBXLanguage' => 'valid',
            ],
        ]);

        $this->assertArrayNotHasKey('INVALID_KEY_XYZ', $config->pbxSettings);
        $this->assertSame('valid', $config->pbxSettings['PBXLanguage'] ?? null);
    }
}
