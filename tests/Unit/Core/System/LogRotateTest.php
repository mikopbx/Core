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
}
