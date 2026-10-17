<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\CloudProvisioning;

use GuzzleHttp\Client;
use GuzzleHttp\Promise\FulfilledPromise;
use GuzzleHttp\Psr7\Response;
use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\Core\System\CloudProvisioning\AlibabaCloud;
use MikoPBX\Core\System\CloudProvisioning\ProvisioningConfig;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Phalcon\Di\Di;
use Phalcon\Logger\Adapter\Stream;
use Phalcon\Logger\Logger;
use Psr\Http\Message\RequestInterface;
use ReflectionProperty;

/**
 * Issue #990: the Alibaba metadata hostname is the instance id in an iZ<id>Z wrapper,
 * and the instance id is the initial web password. The hostname is shown on the
 * login page. provision() must not hand such a hostname to the ProvisioningConfig.
 */
final class AlibabaCloudTest extends AbstractUnitTest
{
    private const string INSTANCE_ID = 'i-8ps5b2pvynwvr61wyhds';

    private const string DERIVED_HOSTNAME = 'iZ8ps5b2pvynwvr61wyhdsZ';

    /**
     * Runs provision() against an in-memory metadata service and returns the config
     * it hands to applyConfigDirect().
     */
    private function provisionedConfig(string $hostname, ?string $userData = null): ProvisioningConfig
    {
        $metadata = [
            'instance-id' => self::INSTANCE_ID,
            'hostname' => $hostname,
            'private-ipv4' => '172.16.0.10',
            'eipv4' => '47.1.2.3',
            'public-keys/0/openssh-key' => 'ssh-ed25519 AAAA test',
        ];
        $handler = static function (RequestInterface $request) use ($metadata): FulfilledPromise {
            $item = ltrim(str_replace('/latest/meta-data/', '', $request->getUri()->getPath()), '/');
            return new FulfilledPromise(new Response(200, [], $metadata[$item] ?? ''));
        };

        $provider = $this->getMockBuilder(AlibabaCloud::class)
            ->onlyMethods(['applyConfigDirect', 'fetchUserData'])
            ->getMock();
        $client = new ReflectionProperty(AlibabaCloud::class, 'client');
        $client->setValue($provider, new Client(['handler' => $handler]));
        $provider->method('fetchUserData')->willReturn($userData);

        $captured = null;
        $provider->expects(self::once())
            ->method('applyConfigDirect')
            ->willReturnCallback(static function (ProvisioningConfig $config) use (&$captured): bool {
                $captured = $config;
                return true;
            });

        self::assertTrue($provider->provision());
        self::assertInstanceOf(ProvisioningConfig::class, $captured);

        return $captured;
    }

    /** @dataProvider derivedHostnames */
    public function testInstanceIdDerivedHostnameIsNotProvisioned(string $hostname): void
    {
        $config = $this->provisionedConfig($hostname);

        self::assertNull($config->hostname, 'iZ<id>Z on the login page would reveal the web password');
        self::assertSame(self::INSTANCE_ID, $config->webPassword);
        self::assertSame(self::INSTANCE_ID, $config->instanceId);
        self::assertSame('47.1.2.3', $config->externalIp);
    }

    public static function derivedHostnames(): array
    {
        return [
            'original' => [self::DERIVED_HOSTNAME],
            'lowercase' => [strtolower(self::DERIVED_HOSTNAME)],
            'uppercase' => [strtoupper(self::DERIVED_HOSTNAME)],
            'mixed case' => ['iZ8Ps5B2pvynwvr61wyhdsZ'],
            'wrapped FQDN' => [strtoupper(self::DERIVED_HOSTNAME) . '.example.invalid'],
            'instance-id FQDN' => [strtoupper(self::INSTANCE_ID) . '.example.invalid'],
        ];
    }

    public function testSuccessLogDoesNotExposeInitialPassword(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'alibaba-log-');
        $adapter = new Stream($file);
        $logger = new Logger('alibaba-test', ['file' => $adapter]);
        $di = Di::getDefault();
        $original = $di->getShared(LoggerProvider::SERVICE_NAME);
        $di->remove(LoggerProvider::SERVICE_NAME);
        $di->setShared(LoggerProvider::SERVICE_NAME, $logger);
        try {
            $this->provisionedConfig(self::DERIVED_HOSTNAME);
            $log = file_get_contents($file);
            self::assertStringContainsString('Provisioned Alibaba Cloud instance', $log);
            self::assertStringNotContainsString(self::INSTANCE_ID, $log);
            self::assertStringNotContainsString(substr(self::INSTANCE_ID, 2), $log);
        } finally {
            $di->remove(LoggerProvider::SERVICE_NAME);
            $di->setShared(LoggerProvider::SERVICE_NAME, $original);
            $adapter->close();
            unlink($file);
        }
    }

    public function testUserAssignedHostnameIsKept(): void
    {
        $config = $this->provisionedConfig('office-pbx');

        self::assertSame('office-pbx', $config->hostname);
        self::assertSame(self::INSTANCE_ID, $config->webPassword);
    }

    public function testEmptyHostnameIsNotProvisioned(): void
    {
        self::assertNull($this->provisionedConfig('')->hostname);
    }

    public function testUserDataHostnameOverridesDerivedHostname(): void
    {
        $userData = json_encode(['mikopbx' => ['hostname' => 'pbx-from-user-data']]);

        $config = $this->provisionedConfig(self::DERIVED_HOSTNAME, $userData);

        self::assertSame('pbx-from-user-data', $config->hostname);
        self::assertSame(self::INSTANCE_ID, $config->webPassword);
    }
}
