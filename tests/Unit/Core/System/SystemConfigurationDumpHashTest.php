<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\SystemConfiguration;
use PDO;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Issue #1390 (B-043): when sqlite3 failed, both md5 pipelines hashed empty input and
 * isDefaultConf() reported a default configuration, so the boot restored a backup over
 * the live database.
 */
final class SystemConfigurationDumpHashTest extends TestCase
{
    private string $sandboxDir = '';

    protected function setUp(): void
    {
        $this->sandboxDir = sys_get_temp_dir() . '/mikopbx-dump-hash-' . getmypid();
        mkdir($this->sandboxDir);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->sandboxDir . '/*') ?: []);
        rmdir($this->sandboxDir);
    }

    public function testFailingSqliteGivesNoHash(): void
    {
        $missingBinary = $this->sandboxDir . '/no-such-sqlite3';

        self::assertNull($this->dumpHash($missingBinary, $this->createDatabase('a.db', 'one')));
    }

    public function testDumpHashDistinguishesDatabaseContent(): void
    {
        $sqlite3 = $this->requireSqlite3();

        $first = $this->dumpHash($sqlite3, $this->createDatabase('a.db', 'one'));
        $same = $this->dumpHash($sqlite3, $this->createDatabase('b.db', 'one'));
        $other = $this->dumpHash($sqlite3, $this->createDatabase('c.db', 'two'));

        self::assertNotNull($first);
        self::assertSame($first, $same);
        self::assertNotSame($first, $other);
    }

    private function requireSqlite3(): string
    {
        $sqlite3 = trim((string)shell_exec('command -v sqlite3'));
        if ($sqlite3 === '') {
            self::markTestSkipped('sqlite3 binary is not installed');
        }
        return $sqlite3;
    }

    private function createDatabase(string $name, string $value): string
    {
        $path = $this->sandboxDir . '/' . $name;
        $db = new PDO('sqlite:' . $path);
        $db->exec('CREATE TABLE settings (value TEXT)');
        $db->prepare('INSERT INTO settings (value) VALUES (?)')->execute([$value]);
        return $path;
    }

    private function dumpHash(string $sqlite3, string $dbFile): ?string
    {
        $method = new ReflectionMethod(SystemConfiguration::class, 'getDatabaseDumpHash');
        $method->setAccessible(true);

        return $method->invoke(null, $sqlite3, $dbFile);
    }
}
