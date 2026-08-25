<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Firewall;

use MikoPBX\PBXCoreREST\Lib\Firewall\UnbanIpAction;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use SQLite3;
use Throwable;

final class UnbanIpActionSecurityTest extends TestCase
{
    public function testInvalidIpReturnsBeforeAccessingRuntimeServices(): void
    {
        try {
            $result = UnbanIpAction::main('127.0.0.1; false');
        } catch (Throwable $exception) {
            $this->fail('Invalid IP reached runtime services: ' . $exception->getMessage());
        }

        $this->assertFalse($result->success);
        $this->assertNotEmpty($result->messages);
    }

    public function testFail2BanCommandQuotesExecutableAndIpAsSeparateArguments(): void
    {
        try {
            $method = new ReflectionMethod(UnbanIpAction::class, 'buildFail2BanUnbanCommand');
        } catch (Throwable $exception) {
            $this->fail('Safe command builder is missing: ' . $exception->getMessage());
        }

        $binary = '/tmp/fail2ban client';
        $ip = '127.0.0.1; false';

        $this->assertSame(
            escapeshellarg($binary) . ' unban ' . escapeshellarg($ip),
            $method->invoke(null, $binary, $ip)
        );
    }

    public function testDatabaseFallbackBindsJailInsteadOfExecutingSqlSyntax(): void
    {
        $database = $this->createBanDatabase();

        $result = UnbanIpAction::fail2banUnbanDb(
            '192.0.2.10',
            "sshd' OR 1=1 --",
            $database
        );

        $this->assertTrue($result->success);
        $this->assertSame(2, $database->querySingle('SELECT COUNT(*) FROM bans'));
    }

    public function testDatabaseFallbackRejectsInvalidIpBeforeQuery(): void
    {
        $database = $this->createBanDatabase();

        $result = UnbanIpAction::fail2banUnbanDb("192.0.2.10' OR 1=1 --", '', $database);

        $this->assertFalse($result->success);
        $this->assertSame(2, $database->querySingle('SELECT COUNT(*) FROM bans'));
    }

    public function testDatabaseFallbackDeletesOnlyMatchingIpAndJail(): void
    {
        $database = $this->createBanDatabase();

        $result = UnbanIpAction::fail2banUnbanDb('192.0.2.10', 'sshd', $database);

        $this->assertTrue($result->success);
        $this->assertSame(1, $database->querySingle('SELECT COUNT(*) FROM bans'));
        $this->assertSame(
            '192.0.2.11',
            $database->querySingle('SELECT ip FROM bans LIMIT 1')
        );
    }

    private function createBanDatabase(): SQLite3
    {
        $database = new SQLite3(':memory:');
        $database->exec('CREATE TABLE bans (ip TEXT NOT NULL, jail TEXT NOT NULL)');
        $statement = $database->prepare('INSERT INTO bans (ip, jail) VALUES (:ip, :jail)');

        foreach ([['192.0.2.10', 'sshd'], ['192.0.2.11', 'asterisk']] as [$ip, $jail]) {
            $statement->bindValue(':ip', $ip, SQLITE3_TEXT);
            $statement->bindValue(':jail', $jail, SQLITE3_TEXT);
            $statement->execute();
            $statement->reset();
        }

        return $database;
    }
}
