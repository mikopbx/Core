<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\LogRotate;
use PHPUnit\Framework\TestCase;

/**
 * LogRotate must give every config a state file of its own and put into a module config
 * only names logrotate reads literally (#1375).
 */
final class LogRotateTest extends TestCase
{
    public function testStatePathIsNextToTheConfig(): void
    {
        self::assertSame(
            '/var/etc/asterisk_logrotate_messages.status',
            LogRotate::getStatePath('/var/etc/asterisk_logrotate_messages.conf')
        );
        self::assertSame(
            '/var/etc/nginx_logrotate_access.log.status',
            LogRotate::getStatePath('/var/etc/nginx_logrotate_access.log.conf')
        );
    }

    public function testDifferentConfigsGetDifferentStateFiles(): void
    {
        self::assertNotSame(
            LogRotate::getStatePath('/var/etc/asterisk_logrotate_messages.conf'),
            LogRotate::getStatePath('/var/etc/asterisk_logrotate_verbose.conf')
        );
    }

    /**
     * @return array<string, array{string, bool}>
     */
    public static function pathProvider(): array
    {
        $dir = '/storage/usbdisk1/mikopbx/log/ModuleExample/';
        return [
            'plain log' => [$dir . 'module.log', true],
            'nested log with dash, at and plus' => [$dir . '2025/05/20/call-1@2+x.log', true],
            'worker out file' => [$dir . 'WorkerExample.out', true],
            'colon and equals' => [$dir . 't:10:00 calls=1.log', true],
            'space' => [$dir . 'my log.log', true],
            'cyrillic' => [$dir . 'журнал.log', true],
            'single quote, hash, percent, tilde' => [$dir . "q'1#2%3~.log", true],
            'bracket glob' => [$dir . 'debug[1].log', false],
            'closing bracket' => [$dir . 'debug]1.log', false],
            'star glob' => [$dir . '*.log', false],
            'question mark glob' => [$dir . 'a?.log', false],
            'opening brace' => [$dir . 'x{1.log', false],
            'closing brace' => [$dir . 'x}1.log', false],
            'double quote' => [$dir . 'a"b.log', false],
            'backslash glob escape' => [$dir . 'a\\b.log', false],
            'newline' => [$dir . "a\nb.log", false],
            'tab' => [$dir . "a\tb.log", false],
            'empty' => ['', false],
        ];
    }

    /**
     * @dataProvider pathProvider
     */
    public function testIsSafePath(string $path, bool $expected): void
    {
        self::assertSame($expected, LogRotate::isSafePath($path));
    }

    public function testModuleConfigIsEmptyWithoutFiles(): void
    {
        self::assertSame('', LogRotate::buildModuleConfig([]));
    }

    public function testModuleConfigQuotesEveryFileAndHasOneSection(): void
    {
        $config = LogRotate::buildModuleConfig(['/log/M/a.log', '/log/M/b.out']);

        self::assertStringStartsWith('"/log/M/a.log"' . PHP_EOL . '"/log/M/b.out"' . PHP_EOL . '{', $config);
        self::assertSame(1, substr_count($config, '{'));
        self::assertSame(1, substr_count($config, '}'));
        self::assertStringContainsString('size 10M', $config);
        self::assertStringContainsString('copytruncate', $config);
    }

    public function testModuleLogFilesOfMissingDirectoryAreEmpty(): void
    {
        self::assertSame([], LogRotate::findModuleLogFiles(sys_get_temp_dir() . '/no-such-dir-' . uniqid('', true)));
    }

    /**
     * Live logs are rotated; copies rotated by logrotate and backups rotated by their writer
     * are not: rotating a backup truncated it and left a .0 copy nobody cleaned (#1374).
     */
    public function testModuleLogFilesSkipAlreadyRotatedFiles(): void
    {
        $dir = sys_get_temp_dir() . '/logrotate-test-' . uniqid('', true);
        mkdir($dir . '/monitord', 0777, true);
        mkdir($dir . '/crmd', 0777, true);

        $files = [
            'module.log',
            'Worker.OUT',
            'monitord/crmd.out',
            'monitord/crmd-2026-11-02T21-29-02.260.out',
            'monitord/authd-2026-07-24T03-00-00.out',
            'monitord/crmd-2026-11-02T21-29-02.260.out.0',
            'crmd/crmd.log',
            'crmd/crmd-2026-11-02T21-29-02.260.LOG',
            'crmd/crmd.log.0',
            'crmd/crmd.log.3.gz',
            'crmd/access-2026-11-02.log',
            'crmd/notes.txt',
        ];
        foreach ($files as $file) {
            touch($dir . '/' . $file);
        }
        symlink($dir . '/module.log', $dir . '/link.log');

        try {
            self::assertSame(
                [
                    $dir . '/Worker.OUT',
                    $dir . '/crmd/access-2026-11-02.log',
                    $dir . '/crmd/crmd.log',
                    $dir . '/module.log',
                    $dir . '/monitord/crmd.out',
                ],
                LogRotate::findModuleLogFiles($dir)
            );
        } finally {
            unlink($dir . '/link.log');
            foreach ($files as $file) {
                unlink($dir . '/' . $file);
            }
            rmdir($dir . '/monitord');
            rmdir($dir . '/crmd');
            rmdir($dir);
        }
    }
}
