<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\SysLogs;

use MikoPBX\Core\System\Directories;
use MikoPBX\PBXCoreREST\Lib\SysLogs\DownloadLogsArchiveAction;
use Phalcon\Config\Config;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use PHPUnit\Framework\TestCase;
use ZipArchive;

final class DownloadLogsArchiveActionTest extends TestCase
{
    private string $testDir;
    private string $tempDir;
    private ?DiInterface $previousDi;

    protected function setUp(): void
    {
        $this->testDir = sys_get_temp_dir() . '/syslog-archive-test-' . bin2hex(random_bytes(6));
        $this->tempDir = $this->testDir . '/archives';
        mkdir($this->tempDir, 0755, true);
        $this->previousDi = Di::getDefault();
        $di = new Di();
        $di->setShared('config', new Config([
            'core' => ['tempDir' => $this->tempDir],
            'www' => ['downloadCacheDir' => $this->testDir . '/cache'],
        ]));
        Di::setDefault($di);
        Directories::reset();
    }

    protected function tearDown(): void
    {
        foreach (glob($this->testDir . '/cache/*/*') ?: [] as $file) {
            unlink($file);
        }
        foreach (glob($this->testDir . '/cache/*') ?: [] as $dir) {
            rmdir($dir);
        }
        if (is_dir($this->testDir . '/cache')) {
            rmdir($this->testDir . '/cache');
        }
        foreach (glob($this->tempDir . '/*') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->tempDir);
        foreach (glob($this->testDir . '/*') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->testDir);
        Directories::reset();
        if ($this->previousDi === null) {
            Di::reset();
        } else {
            Di::setDefault($this->previousDi);
        }
    }

    public function testRejectsProgressFileOutsideArchiveDirectory(): void
    {
        $filename = $this->testDir . '/log-sys-123.zip';
        file_put_contents($filename . '.progress', 'private-marker');

        $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

        self::assertFalse($result->success);
        self::assertSame(400, $result->httpCode);
        self::assertSame([], $result->data);
    }

    public function testRejectsTraversalEvenWhenItResolvesInsideArchiveDirectory(): void
    {
        file_put_contents($this->tempDir . '/log-sys-123.zip.progress', '45');
        $filename = $this->tempDir . '/../archives/log-sys-123.zip';

        $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

        self::assertFalse($result->success);
        self::assertSame(400, $result->httpCode);
    }

    public function testRejectsUnrelatedFileInTemporaryDirectory(): void
    {
        $filename = $this->tempDir . '/settings.json';
        file_put_contents($filename . '.progress', 'private-marker');

        $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

        self::assertFalse($result->success);
        self::assertSame(400, $result->httpCode);
    }

    public function testRejectsProgressSymlinkOutsideArchiveDirectory(): void
    {
        $outside = $this->testDir . '/private.progress';
        file_put_contents($outside, 'private-marker');
        $filename = $this->tempDir . '/log-sys-123.zip';
        symlink($outside, $filename . '.progress');

        $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

        self::assertFalse($result->success);
        self::assertSame(400, $result->httpCode);
        self::assertSame([], $result->data);
    }

    public function testRejectsArchiveSymlinkOutsideArchiveDirectory(): void
    {
        $outside = $this->testDir . '/private.txt';
        file_put_contents($outside, 'private-marker');
        $filename = $this->tempDir . '/log-sys-123.zip';
        symlink($outside, $filename);
        file_put_contents($filename . '.progress', '45');

        $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

        self::assertFalse($result->success);
        self::assertSame(400, $result->httpCode);
    }

    public function testPreparingArchiveDoesNotRequireZipToExist(): void
    {
        foreach (['sys', 'tcpdump'] as $prefix) {
            $filename = $this->tempDir . '/log-' . $prefix . '-123.zip';
            file_put_contents($filename . '.progress', '45');

            $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

            self::assertTrue($result->success);
            self::assertSame(['status' => 'PREPARING', 'progress' => '45'], $result->data);
            self::assertFileDoesNotExist($filename);
        }
    }

    public function testMissingProgressRemainsArchiveNotFound(): void
    {
        $result = DownloadLogsArchiveAction::main(['filename' => $this->tempDir . '/log-sys-123.zip']);

        self::assertFalse($result->success);
        self::assertSame(['rest_err_syslog_archive_not_found'], $result->messages);
    }

    public function testCompletedProgressCannotPublishMissingArchive(): void
    {
        $filename = $this->tempDir . '/log-sys-123.zip';
        file_put_contents($filename . '.progress', '100');

        $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

        self::assertFalse($result->success);
        self::assertSame([], $result->data);
    }

    public function testReadyArchivePublishesLinkToItsContents(): void
    {
        $filename = $this->tempDir . '/log-sys-123.zip';
        $zip = new ZipArchive();
        self::assertTrue($zip->open($filename, ZipArchive::CREATE) === true);
        $zip->addFromString('marker.txt', 'benign-marker');
        $zip->close();
        file_put_contents($filename . '.progress', '100');

        $result = DownloadLogsArchiveAction::main(['filename' => $filename]);

        self::assertTrue($result->success);
        self::assertSame('READY', $result->data['status']);
        self::assertStringStartsWith('/pbxcore/files/cache/', $result->data['filename']);
        $link = $this->testDir . '/cache/' . substr($result->data['filename'], strlen('/pbxcore/files/cache/'));
        self::assertTrue(is_link($link));
        self::assertSame(realpath($filename), readlink($link));
        self::assertSame(file_get_contents($filename), file_get_contents($link));
    }
}
