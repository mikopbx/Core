<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\System;

use MikoPBX\PBXCoreREST\Lib\System\RestoreDefaultSettingsAction;
use PHPUnit\Framework\TestCase;
use MikoPBX\Core\System\Directories;
use MikoPBX\Common\Providers\LoggerProvider;
use Phalcon\Logger\Adapter\Noop;
use Phalcon\Logger\Logger;
use Phalcon\Config\Config;
use Phalcon\Di\Di;
use Phalcon\Di\FactoryDefault;
use ReflectionMethod;

/**
 * #1126: the reset must not unlink log files that daemons keep open (rsyslogd, nginx, asterisk, php-fpm):
 * they are truncated in place so later records stay visible; rotated generations are deleted.
 */
final class RestoreDefaultSettingsLogsTest extends TestCase
{
    /** @dataProvider linkedPaths */
    public function testCleanupDoesNotFollowSymlinks(string $linkPath, bool $directory, bool $rootUsable): void
    {
        $base = sys_get_temp_dir() . '/reset-links-' . bin2hex(random_bytes(6));
        $media = "$base/media";
        mkdir("$media/mikopbx/log/system", 0777, true);
        mkdir("$base/outside/log/system", 0777, true);
        mkdir("$base/outside/system");
        file_put_contents("$base/outside/messages", 'outside');
        file_put_contents("$base/outside/messages.1", 'archive');
        foreach (['debug.log', 'system/messages', 'log/system/messages'] as $name) {
            file_put_contents("$base/outside/$name", 'untouched');
        }
        $link = $linkPath === '' ? $media : "$media/$linkPath";
        if (is_dir($link)) {
            self::removeFixture($link);
        }
        symlink($directory ? "$base/outside" : "$base/outside/messages", $link);
        $own = "$media/mikopbx/log/asterisk/messages";
        if ($rootUsable) {
            mkdir(dirname($own));
            file_put_contents($own, 'old');
        }
        $di = new FactoryDefault();
        $di->setShared('config', new Config(['core' => ['mediaMountPoint' => $media, 'debugMode' => true]]));
        $di->setShared(LoggerProvider::SERVICE_NAME, new Logger('test', ['main' => new Noop()]));
        Di::setDefault($di);
        Directories::reset();
        $method = new ReflectionMethod(RestoreDefaultSettingsAction::class, 'cleaningSystemLogs');
        $method->setAccessible(true);
        ob_start();
        try {
            $method->invoke(null);
            self::assertSame('outside', file_get_contents("$base/outside/messages"));
            self::assertSame('archive', file_get_contents("$base/outside/messages.1"));
            self::assertTrue(is_link($link));
            if ($rootUsable) {
                self::assertSame('', file_get_contents($own), 'the cleanup ran for logs inside the root');
            }
            foreach (['debug.log', 'system/messages', 'log/system/messages'] as $name) {
                self::assertSame('untouched', file_get_contents("$base/outside/$name"));
            }
        } finally {
            ob_end_clean();
            Directories::reset();
            Di::reset();
            self::removeFixture($base);
        }
    }

    public static function linkedPaths(): array
    {
        return [
            'configured media root' => ['', true, false],
            'nested file' => ['mikopbx/log/system/external', false, true],
            'nested directory' => ['mikopbx/log/system/external', true, true],
            'input directory' => ['mikopbx/log/system', true, true],
            'log root' => ['mikopbx/log', true, false],
            'log root parent' => ['mikopbx', true, false],
            'root debug log' => ['mikopbx/log/debug.log', false, true],
            'rotated link' => ['mikopbx/log/system/messages.1', false, true],
        ];
    }

    public function testRecursiveCleanupSkipsCyclesAndBrokenLinks(): void
    {
        $base = sys_get_temp_dir() . '/reset-cycle-' . bin2hex(random_bytes(6));
        mkdir($base);
        symlink($base, "$base/cycle");
        symlink("$base/missing", "$base/broken");
        file_put_contents("$base/messages", 'old');
        $method = new ReflectionMethod(RestoreDefaultSettingsAction::class, 'purgeLogFiles');
        $method->setAccessible(true);
        try {
            $method->invoke(null, $base);
            self::assertSame('', file_get_contents("$base/messages"));
            self::assertTrue(is_link("$base/cycle"));
            self::assertTrue(is_link("$base/broken"));
        } finally {
            self::removeFixture($base);
        }
    }

    private static function removeFixture(string $path): void
    {
        if (is_link($path) || !is_dir($path)) {
            unlink($path);
            return;
        }
        foreach (glob($path . '/*') ?: [] as $child) {
            self::removeFixture($child);
        }
        rmdir($path);
    }

    public function testLiveLogsAreTruncatedInPlaceAndRotatedGenerationsDeleted(): void
    {
        $dir = sys_get_temp_dir() . '/reset-logs-' . bin2hex(random_bytes(6));
        mkdir("$dir/system", 0777, true);
        mkdir("$dir/nginx/sub", 0777, true);
        $live = [
            "$dir/system/messages", "$dir/system/monit", "$dir/nginx/access.log", "$dir/nginx/error.log",
            "$dir/nginx/sub/deep.log",
        ];
        $rotated = [
            "$dir/system/messages.1", "$dir/system/messages.2.gz", "$dir/system/crond.gz",
            "$dir/nginx/access.log.0", "$dir/nginx/access.log.3.gz",
        ];
        foreach ([...$live, ...$rotated] as $file) {
            file_put_contents($file, "old content\n");
        }
        $messages = "$dir/system/messages";
        $daemon = fopen($messages, 'a');
        self::assertIsResource($daemon);
        $inode = fileinode($messages);

        $method = new ReflectionMethod(RestoreDefaultSettingsAction::class, 'purgeLogFiles');
        $method->setAccessible(true);
        try {
            foreach (["$dir/system", "$dir/nginx"] as $logDir) {
                $method->invoke(null, $logDir);
            }
            clearstatcache();
            foreach ($live as $file) {
                self::assertFileExists($file);
                self::assertSame(0, filesize($file), basename($file));
            }
            foreach ($rotated as $file) {
                self::assertFileDoesNotExist($file);
            }
            self::assertSame($inode, fileinode($messages), 'the daemon still writes into the same inode');
            fwrite($daemon, "after reset\n");
            fflush($daemon);
            self::assertSame("after reset\n", file_get_contents($messages), 'a record written after the reset is visible');
        } finally {
            fclose($daemon);
            self::removeFixture($dir);
        }
    }
}
