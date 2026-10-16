<?php

namespace MikoPBX\Tests\Core\System\CloudProvisioning;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\Psr7\Response;
use MikoPBX\Core\System\CloudProvisioning\CloudRuCloud;
use MikoPBX\Core\System\CloudProvisioning\ProvisioningConfig;
use PHPUnit\Framework\TestCase;

class CloudRuCloudTest extends TestCase
{
    public function testRecognizesCloudRuVendorDataEvenWhenAgentFieldsAreEmpty(): void
    {
        $body = json_encode(['vmmmetadata' => [
            'token' => '',
            'projectId' => '',
            'instanceId' => '',
            'monaasUrl' => '',
            'logaasUrl' => '',
            'collectDefaultLogs' => false,
        ]]);

        self::assertTrue($this->detect(new Response(200, [], $body)));
    }

    /** @dataProvider nonCloudRuResponses */
    public function testRejectsGenericAndOtherCloudMetadata(int $status, string $body): void
    {
        self::assertFalse($this->detect(new Response($status, [], $body)));
    }

    public static function nonCloudRuResponses(): array
    {
        return [
            'generic OpenStack' => [200, '{"uuid":"example","project_id":"example"}'],
            'Selectel metadata' => [200, '{"meta":{"x_sel_region":"ru-1"}}'],
            'VK metadata' => [200, '{"meta":{"vkcloud_project_id":"example"}}'],
            'partial vendor data' => [200, '{"vmmmetadata":{"token":"","projectId":""}}'],
            'invalid JSON' => [200, 'invalid'],
            'missing endpoint' => [404, ''],
        ];
    }

    public function testProvisionsFromOpenStackMetadataWithoutReplacingSshSettings(): void
    {
        $provider = new class extends CloudRuCloud {
            public ?ProvisioningConfig $captured = null;

            protected function applyConfigDirect(ProvisioningConfig $config): bool
            {
                $this->captured = $config;
                return true;
            }
        };

        $vendorData = json_encode(['vmmmetadata' => [
            'token' => '',
            'projectId' => '',
            'instanceId' => '',
            'monaasUrl' => '',
            'logaasUrl' => '',
            'collectDefaultLogs' => false,
        ]]);
        $metadata = json_encode([
            'uuid' => '4c4cfe90-2e77-4b33-a891-1ff55589facc',
            'name' => 'Vm 1bb373c4-b402-4346-b5d7-a38dde4c113b',
            'hostname' => 'vm-1bb373c4-b402-4346-b5d7-a38dde4c113b',
        ]);
        $responses = new MockHandler([
            new Response(200, [], $vendorData),
            new Response(200, [], $metadata),
            new Response(200, [], '87.242.119.156'),
            new Response(404),
        ]);
        (new \ReflectionProperty(CloudRuCloud::class, 'client'))
            ->setValue($provider, new Client(['handler' => $responses]));

        self::assertTrue($provider->provision());
        self::assertSame('mikopbx-4c4cfe90', $provider->captured->hostname);
        self::assertSame('87.242.119.156', $provider->captured->externalIp);
        self::assertSame('1bb373c4-b402-4346-b5d7-a38dde4c113b', $provider->captured->instanceId);
        self::assertSame('1bb373c4-b402-4346-b5d7-a38dde4c113b', $provider->captured->webPassword);
        self::assertNull($provider->captured->sshKeys);
        self::assertNull($provider->captured->sshLogin);
    }

    private function detect(Response $response): bool
    {
        if (!class_exists(CloudRuCloud::class)) {
            self::fail('CloudRuCloud provider is missing');
        }

        $provider = new CloudRuCloud();
        $client = new Client(['handler' => new MockHandler([$response])]);
        (new \ReflectionProperty(CloudRuCloud::class, 'client'))->setValue($provider, $client);

        return $provider->checkAvailability()->wait();
    }
}
