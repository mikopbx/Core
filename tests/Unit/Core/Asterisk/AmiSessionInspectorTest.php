<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk;

use MikoPBX\Core\Asterisk\AmiSessionInspector;
use MikoPBX\Core\Asterisk\AmiSessionSnapshot;
use PHPUnit\Framework\TestCase;

final class AmiSessionInspectorTest extends TestCase
{
    private string $procRoot;

    public function setUp(): void
    {
        parent::setUp();
        $this->procRoot = sys_get_temp_dir() . '/mikopbx-proc-' . getmypid() . '-' . uniqid('', true);
        $fixtureRoot = __DIR__ . '/Fixtures/AmiProcfs';
        $this->makeDirectory('/net');
        copy($fixtureRoot . '/tcp', $this->procRoot . '/net/tcp');
        copy($fixtureRoot . '/tcp6', $this->procRoot . '/net/tcp6');

        $this->makeProcess(
            1200,
            'sip-collector',
            [],
            "/storage/sip-collector\0-asterisk-bin\0/usr/sbin/asterisk"
        );
        $this->makeProcess(23932, 'asterisk', [14 => 1111, 39 => 3333, 40 => 5555]);
        $this->makeProcess(759, 'WorkerModelsEvents', [7 => 2222]);
        $this->makeProcess(30319, 'PBXCoreREST', [9 => 2222]);
        $this->makeProcess(16584, 'amid', [4 => 4444]);
    }

    public function tearDown(): void
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->procRoot, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $entry) {
            if ($entry->isDir() && !$entry->isLink()) {
                @rmdir($entry->getPathname());
            } else {
                @unlink($entry->getPathname());
            }
        }
        @rmdir($this->procRoot);
        parent::tearDown();
    }

    public function testFindsAsteriskAndAttributesIpv4AndIpv6Sessions(): void
    {
        $inspector = new AmiSessionInspector($this->procRoot);
        $managerOutput = (string)file_get_contents(__DIR__ . '/Fixtures/AmiProcfs/manager-show-connected.txt');

        self::assertSame(23932, $inspector->findAsteriskPid());
        self::assertTrue($inspector->hasQueuedAmiSockets(23932, 5038));
        $snapshots = $inspector->inspect(23932, 5038, $managerOutput);

        self::assertCount(3, $snapshots);
        self::assertContainsOnlyInstancesOf(AmiSessionSnapshot::class, $snapshots);

        $ipv4 = $this->snapshotByFd($snapshots, 14);
        self::assertSame('phpagi', $ipv4->username);
        self::assertSame('1787129757', $ipv4->sessionStart);
        self::assertSame('127.0.0.1', $ipv4->clientAddress);
        self::assertSame(55302, $ipv4->clientPort);
        self::assertSame(1111, $ipv4->serverInode);
        self::assertSame(2222, $ipv4->clientInode);
        self::assertSame(108673, $ipv4->sendQueueBytes);
        self::assertSame(98712, $ipv4->clientReceiveQueueBytes);
        self::assertSame('ESTABLISHED', $ipv4->serverState);
        self::assertSame([759, 30319], $ipv4->ownerPids);
        self::assertTrue($ipv4->isLocalhost());
        self::assertTrue($ipv4->hasStrongStaleDescriptorEvidence());

        $ipv6 = $this->snapshotByFd($snapshots, 39);
        self::assertSame('::1', $ipv6->clientAddress);
        self::assertSame(60000, $ipv6->clientPort);
        self::assertSame('CLOSE_WAIT', $ipv6->clientState);
        self::assertSame([16584], $ipv6->ownerPids);
        self::assertTrue($ipv6->isLocalhost());
        self::assertTrue($ipv6->hasStrongStaleDescriptorEvidence());
    }

    public function testExternalAndOwnerlessSessionIsNeverMistakenForLocalhost(): void
    {
        $inspector = new AmiSessionInspector($this->procRoot);
        $managerOutput = (string)file_get_contents(__DIR__ . '/Fixtures/AmiProcfs/manager-show-connected.txt');

        $external = $this->snapshotByFd($inspector->inspect(23932, 5038, $managerOutput), 40);

        self::assertSame('192.0.2.10:40000', $external->endpoint());
        self::assertSame([], $external->ownerPids);
        self::assertTrue($external->hasStrongStaleDescriptorEvidence());
        self::assertFalse($external->isLocalhost());
        self::assertStringContainsString('40|5555|192.0.2.10:40000|external-client|1787238000', $external->identity());
    }

    /**
     * @param list<AmiSessionSnapshot> $snapshots
     */
    private function snapshotByFd(array $snapshots, int $fd): AmiSessionSnapshot
    {
        foreach ($snapshots as $snapshot) {
            if ($snapshot->fd === $fd) {
                return $snapshot;
            }
        }
        self::fail("Snapshot for fd $fd not found");
    }

    /** @param array<int, int> $socketFds */
    private function makeProcess(int $pid, string $comm, array $socketFds, ?string $cmdline = null): void
    {
        $this->makeDirectory("/$pid/fd");
        file_put_contents($this->procRoot . "/$pid/comm", $comm . "\n");
        file_put_contents($this->procRoot . "/$pid/cmdline", ($cmdline ?? "/usr/sbin/$comm") . "\0");
        foreach ($socketFds as $fd => $inode) {
            symlink("socket:[$inode]", $this->procRoot . "/$pid/fd/$fd");
        }
    }

    private function makeDirectory(string $suffix): void
    {
        self::assertTrue(is_dir($this->procRoot . $suffix) || mkdir($this->procRoot . $suffix, 0700, true));
    }
}
