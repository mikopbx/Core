<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Storage;

use Aws\Command;
use Aws\CommandInterface;
use Aws\MockHandler;
use Aws\Result;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client as AwsS3Client;
use MikoPBX\Core\System\Storage\S3Client;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Psr\Http\Message\RequestInterface;
use ReflectionClass;

/**
 * #1319: S3Client::download() must never leave a partial object at the cache path.
 *
 * The SDK's own MockHandler stands in for the HTTP transfer; it writes into the HTTP
 * sink (where the SDK puts SaveAs) as a real transfer does before it ends or breaks.
 */
final class S3ClientDownloadTest extends AbstractUnitTest
{
    private string $sandbox;
    private string $target;

    public function setUp(): void
    {
        parent::setUp();
        $this->sandbox = sys_get_temp_dir() . '/mikopbx-s3-download-' . getmypid() . '-' . uniqid('', true);
        self::assertTrue(mkdir($this->sandbox, 0700, true));
        $this->target = $this->sandbox . '/a1/a1b2c3_out-201-102.webm';
    }

    public function tearDown(): void
    {
        foreach (glob($this->sandbox . '/{,*/}*', GLOB_BRACE) ?: [] as $path) {
            is_dir($path) ? @rmdir($path) : @unlink($path);
        }
        @rmdir($this->sandbox . '/a1');
        @rmdir($this->sandbox);
        parent::tearDown();
    }

    public function testCompleteDownloadIsMovedIntoPlace(): void
    {
        $client = $this->clientWith(function (CommandInterface $cmd): Result {
            self::assertNotSame($this->target, $cmd['@http']['sink'], 'must not write straight into the cache file');
            file_put_contents($cmd['@http']['sink'], 'full-recording');
            return new Result([]);
        });

        $this->assertTrue($client->download('rec/out-201-102.webm', $this->target));
        $this->assertSame('full-recording', file_get_contents($this->target));
        $this->assertSame([], glob($this->sandbox . '/a1/*.part'));
    }

    public function testInterruptedDownloadLeavesNoFile(): void
    {
        $client = $this->clientWith(function (CommandInterface $cmd, RequestInterface $request): S3Exception {
            file_put_contents($cmd['@http']['sink'], 'trunc');
            return new S3Exception('Connection reset', $cmd, ['request' => $request]);
        });

        $this->assertFalse($client->download('rec/out-201-102.webm', $this->target));
        $this->assertFileDoesNotExist($this->target);
        $this->assertSame([], glob($this->sandbox . '/a1/*.part'));
    }

    public function testFailedDownloadKeepsPreviousCacheFile(): void
    {
        mkdir(dirname($this->target), 0700, true);
        file_put_contents($this->target, 'old-copy');
        $client = $this->clientWith(function (CommandInterface $cmd, RequestInterface $request): S3Exception {
            file_put_contents($cmd['@http']['sink'], 'trunc');
            return new S3Exception('Timeout', $cmd, ['request' => $request]);
        });

        $this->assertFalse($client->download('rec/out-201-102.webm', $this->target));
        $this->assertSame('old-copy', file_get_contents($this->target));
    }

    /**
     * Build the wrapper around an SDK client without StorageSettings from the database.
     */
    private function clientWith(callable $transfer): S3Client
    {
        $sdk = new AwsS3Client([
            'version' => 'latest',
            'region' => 'us-east-1',
            'credentials' => ['key' => 'test', 'secret' => 'test'],
            'handler' => new MockHandler([$transfer]),
        ]);

        $reflection = new ReflectionClass(S3Client::class);
        $client = $reflection->newInstanceWithoutConstructor();
        $reflection->getProperty('client')->setValue($client, $sdk);
        $reflection->getProperty('bucket')->setValue($client, 'recordings');
        return $client;
    }
}
