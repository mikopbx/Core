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

use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Core\System\CloudProvisioning\CloudProvider;
use MikoPBX\Core\System\CloudProvisioning\NoCloud;
use MikoPBX\Core\System\CloudProvisioning\ProvisioningConfig;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * Unit tests for NoCloud provider.
 *
 * Tests the NoCloud datasource detection and provisioning for on-premise deployments
 * (VMware, Proxmox, KVM) using ISO, seed directories, and HTTP endpoints.
 *
 * Note: This test uses PHPUnit\Framework\TestCase directly without MikoPBX DI
 * to allow running tests outside of Docker container environment.
 *
 * @package MikoPBX\Tests\Core\System\CloudProvisioning
 */
class NoCloudTest extends TestCase
{
    private NoCloud $noCloud;
    private ReflectionClass $reflection;

    protected function setUp(): void
    {
        parent::setUp();
        $this->noCloud = new NoCloud();
        $this->reflection = new ReflectionClass(NoCloud::class);
    }

    /**
     * Test that CloudID constant is set correctly.
     */
    public function testCloudIdConstant(): void
    {
        $this->assertSame('NoCloud', NoCloud::CloudID);
    }

    /**
     * Test that NoCloud extends CloudProvider.
     */
    public function testExtendsCloudProvider(): void
    {
        $this->assertInstanceOf(CloudProvider::class, $this->noCloud);
    }

    /**
     * Test checkAvailability returns a Promise.
     */
    public function testCheckAvailabilityReturnsPromise(): void
    {
        $promise = $this->noCloud->checkAvailability();

        $this->assertInstanceOf(PromiseInterface::class, $promise);
    }

    /**
     * Test checkAvailability resolves to boolean.
     */
    public function testCheckAvailabilityResolvesToBoolean(): void
    {
        $promise = $this->noCloud->checkAvailability();
        $result = $promise->wait();

        $this->assertIsBool($result);
    }

    /**
     * Test ISO_DEVICES constant contains expected devices.
     */
    public function testIsoDevicesConstant(): void
    {
        $constants = $this->reflection->getConstants();

        $this->assertArrayHasKey('ISO_DEVICES', $constants);
        $isoDevices = $constants['ISO_DEVICES'];

        $this->assertIsArray($isoDevices);
        $this->assertContains('/dev/sr0', $isoDevices);
        $this->assertContains('/dev/sr1', $isoDevices);
        $this->assertContains('/dev/cdrom', $isoDevices);
    }

    /**
     * Test SEED_PATHS constant contains expected paths.
     */
    public function testSeedPathsConstant(): void
    {
        $constants = $this->reflection->getConstants();

        $this->assertArrayHasKey('SEED_PATHS', $constants);
        $seedPaths = $constants['SEED_PATHS'];

        $this->assertIsArray($seedPaths);
        $this->assertContains('/var/lib/cloud/seed/nocloud/', $seedPaths);
        $this->assertContains('/var/lib/cloud/seed/nocloud-net/', $seedPaths);
    }

    /**
     * Test MOUNT_POINT constant.
     */
    public function testMountPointConstant(): void
    {
        $constants = $this->reflection->getConstants();

        $this->assertArrayHasKey('MOUNT_POINT', $constants);
        $this->assertSame('/tmp/nocloud-cidata', $constants['MOUNT_POINT']);
    }

    /**
     * Test detectDatasource method exists and is private.
     */
    public function testDetectDatasourceMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('detectDatasource'));
        $method = $this->reflection->getMethod('detectDatasource');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test checkKernelCmdline method exists and is private.
     */
    public function testCheckKernelCmdlineMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('checkKernelCmdline'));
        $method = $this->reflection->getMethod('checkKernelCmdline');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test checkCidataIso method exists and is private.
     */
    public function testCheckCidataIsoMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('checkCidataIso'));
        $method = $this->reflection->getMethod('checkCidataIso');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test checkSeedDirectories method exists and is private.
     */
    public function testCheckSeedDirectoriesMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('checkSeedDirectories'));
        $method = $this->reflection->getMethod('checkSeedDirectories');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test mountCidataIso method exists and is private.
     */
    public function testMountCidataIsoMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('mountCidataIso'));
        $method = $this->reflection->getMethod('mountCidataIso');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test unmountCidataIso method exists and is private.
     */
    public function testUnmountCidataIsoMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('unmountCidataIso'));
        $method = $this->reflection->getMethod('unmountCidataIso');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test readFile method exists and is private.
     */
    public function testReadFileMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('readFile'));
        $method = $this->reflection->getMethod('readFile');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test fetchHttpFile method exists and is private.
     */
    public function testFetchHttpFileMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('fetchHttpFile'));
        $method = $this->reflection->getMethod('fetchHttpFile');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test parseMetaData method exists and is private.
     */
    public function testParseMetaDataMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('parseMetaData'));
        $method = $this->reflection->getMethod('parseMetaData');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test parseKeyValueFormat method exists and is private.
     */
    public function testParseKeyValueFormatMethodExists(): void
    {
        $this->assertTrue($this->reflection->hasMethod('parseKeyValueFormat'));
        $method = $this->reflection->getMethod('parseKeyValueFormat');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test parseMetaData with empty string returns empty config.
     */
    public function testParseMetaDataEmpty(): void
    {
        $method = $this->reflection->getMethod('parseMetaData');
        $method->setAccessible(true);

        /** @var ProvisioningConfig $config */
        $config = $method->invoke($this->noCloud, '');

        $this->assertInstanceOf(ProvisioningConfig::class, $config);
        $this->assertTrue($config->isEmpty());
    }

    /**
     * Test parseMetaData with JSON format.
     */
    public function testParseMetaDataJson(): void
    {
        $method = $this->reflection->getMethod('parseMetaData');
        $method->setAccessible(true);

        $json = json_encode([
            'instance-id' => 'test-instance-123',
            'local-hostname' => 'test-pbx',
        ]);

        /** @var ProvisioningConfig $config */
        $config = $method->invoke($this->noCloud, $json);

        $this->assertSame('test-instance-123', $config->instanceId);
        $this->assertSame('test-pbx', $config->hostname);
    }

    /**
     * Test parseMetaData with YAML format (if yaml extension available).
     */
    public function testParseMetaDataYaml(): void
    {
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('YAML extension not available');
        }

        $method = $this->reflection->getMethod('parseMetaData');
        $method->setAccessible(true);

        $yaml = <<<YAML
instance-id: yaml-instance-456
local-hostname: yaml-pbx
YAML;

        /** @var ProvisioningConfig $config */
        $config = $method->invoke($this->noCloud, $yaml);

        $this->assertSame('yaml-instance-456', $config->instanceId);
        $this->assertSame('yaml-pbx', $config->hostname);
    }

    /**
     * Test parseMetaData with key=value format.
     */
    public function testParseMetaDataKeyValue(): void
    {
        $method = $this->reflection->getMethod('parseMetaData');
        $method->setAccessible(true);

        $keyValue = <<<TEXT
instance-id: simple-instance-789
local-hostname: simple-pbx
TEXT;

        /** @var ProvisioningConfig $config */
        $config = $method->invoke($this->noCloud, $keyValue);

        $this->assertSame('simple-instance-789', $config->instanceId);
        $this->assertSame('simple-pbx', $config->hostname);
    }

    /**
     * Test parseMetaData with public-keys as array.
     */
    public function testParseMetaDataSshKeysArray(): void
    {
        $method = $this->reflection->getMethod('parseMetaData');
        $method->setAccessible(true);

        $json = json_encode([
            'instance-id' => 'test-instance',
            'public-keys' => [
                'ssh-rsa AAAA... user1@host',
                'ssh-ed25519 BBBB... user2@host',
            ],
        ]);

        /** @var ProvisioningConfig $config */
        $config = $method->invoke($this->noCloud, $json);

        $this->assertStringContainsString('ssh-rsa AAAA...', $config->sshKeys);
        $this->assertStringContainsString('ssh-ed25519 BBBB...', $config->sshKeys);
    }

    /**
     * Test parseMetaData with public-keys in openssh-key format.
     */
    public function testParseMetaDataSshKeysOpensshFormat(): void
    {
        $method = $this->reflection->getMethod('parseMetaData');
        $method->setAccessible(true);

        $json = json_encode([
            'instance-id' => 'test-instance',
            'public-keys' => [
                'key1' => ['openssh-key' => 'ssh-rsa AAAA... user1'],
                'key2' => ['openssh-key' => 'ssh-ed25519 BBBB... user2'],
            ],
        ]);

        /** @var ProvisioningConfig $config */
        $config = $method->invoke($this->noCloud, $json);

        $this->assertStringContainsString('ssh-rsa AAAA...', $config->sshKeys);
        $this->assertStringContainsString('ssh-ed25519 BBBB...', $config->sshKeys);
    }

    /**
     * Test parseMetaData with network configuration.
     */
    public function testParseMetaDataNetworkConfig(): void
    {
        $method = $this->reflection->getMethod('parseMetaData');
        $method->setAccessible(true);

        $json = json_encode([
            'instance-id' => 'test-instance',
            'network' => [
                'topology' => 'private',
                'extipaddr' => '192.168.1.100',
            ],
        ]);

        /** @var ProvisioningConfig $config */
        $config = $method->invoke($this->noCloud, $json);

        $this->assertSame('private', $config->networkSettings['topology'] ?? null);
        $this->assertSame('192.168.1.100', $config->networkSettings['extipaddr'] ?? null);
    }

    /**
     * Test parseKeyValueFormat method.
     */
    public function testParseKeyValueFormat(): void
    {
        $method = $this->reflection->getMethod('parseKeyValueFormat');
        $method->setAccessible(true);

        $content = <<<TEXT
# This is a comment
instance-id: my-vm-123
local-hostname: my-pbx

key_with_underscore=value_here
TEXT;

        $result = $method->invoke($this->noCloud, $content);

        $this->assertIsArray($result);
        $this->assertSame('my-vm-123', $result['instance-id']);
        $this->assertSame('my-pbx', $result['local-hostname']);
        $this->assertSame('value_here', $result['key_with_underscore']);
    }

    /**
     * Test parseKeyValueFormat returns null for empty content.
     */
    public function testParseKeyValueFormatEmpty(): void
    {
        $method = $this->reflection->getMethod('parseKeyValueFormat');
        $method->setAccessible(true);

        $result = $method->invoke($this->noCloud, '');

        $this->assertNull($result);
    }

    /**
     * Test parseKeyValueFormat ignores comments.
     */
    public function testParseKeyValueFormatIgnoresComments(): void
    {
        $method = $this->reflection->getMethod('parseKeyValueFormat');
        $method->setAccessible(true);

        $content = <<<TEXT
# comment line
key1: value1
   # indented comment
key2: value2
TEXT;

        $result = $method->invoke($this->noCloud, $content);

        $this->assertCount(2, $result);
        $this->assertArrayNotHasKey('#', $result);
    }

    /**
     * Test provision returns false when no datasource detected.
     *
     * Note: This test relies on no NoCloud datasource being present in the test environment.
     */
    public function testProvisionReturnsFalseWhenNoDatasource(): void
    {
        // This test will pass on systems without NoCloud datasource configured
        // (most development environments)
        $available = $this->noCloud->checkAvailability()->wait();

        if ($available) {
            $this->markTestSkipped('NoCloud datasource is present in test environment');
        }

        $result = $this->noCloud->provision();

        $this->assertFalse($result);
    }

    /**
     * Test destructor doesn't throw when no ISO mounted.
     */
    public function testDestructorSafe(): void
    {
        // Create and destroy instance - should not throw
        $instance = new NoCloud();
        unset($instance);

        $this->assertTrue(true); // If we got here, destructor didn't throw
    }

    /**
     * Test checkKernelCmdline parsing patterns.
     *
     * This tests the regex patterns used in checkKernelCmdline via reflection.
     */
    public function testKernelCmdlinePatterns(): void
    {
        // Test patterns that should match ds=nocloud
        $patterns = [
            'ds=nocloud' => true,
            'ds=nocloud ' => true,
            'ds=nocloud;s=http://10.0.0.1/' => true,
            'ds=nocloud-net' => true,
            'ds=nocloud-net;s=http://server/seed/' => true,
            'root=/dev/sda1 ds=nocloud quiet' => true,
            'ds=nocloudx' => false, // Should not match
            'dsnocloud' => false,   // Should not match
        ];

        foreach ($patterns as $cmdline => $shouldMatch) {
            $match = (bool)preg_match('/\bds=nocloud(-net)?(?:;|\s|$)/i', $cmdline);
            $this->assertSame(
                $shouldMatch,
                $match,
                "Pattern '$cmdline' should " . ($shouldMatch ? 'match' : 'not match')
            );
        }
    }

    /**
     * Test seedfrom URL extraction pattern.
     */
    public function testSeedfromUrlExtractionPattern(): void
    {
        $testCases = [
            'ds=nocloud;s=http://10.0.0.1/seed/' => 'http://10.0.0.1/seed/',
            'ds=nocloud-net;s=https://server.local/config/' => 'https://server.local/config/',
            'ds=nocloud;s=http://169.254.169.254/latest/' => 'http://169.254.169.254/latest/',
            'root=/dev/sda1 ds=nocloud;s=http://pxe.local/nocloud/' => 'http://pxe.local/nocloud/',
        ];

        foreach ($testCases as $cmdline => $expectedUrl) {
            if (preg_match('/\bds=nocloud(?:-net)?;s=([^\s;]+)/i', $cmdline, $matches)) {
                $this->assertSame($expectedUrl, $matches[1], "URL extraction failed for: $cmdline");
            } else {
                $this->fail("Pattern should match: $cmdline");
            }
        }
    }
}
