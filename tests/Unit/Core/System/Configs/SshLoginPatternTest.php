<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Configs;

use MikoPBX\Core\System\Configs\SSHConf;
use PHPUnit\Framework\TestCase;

/**
 * Regression coverage for {@see SSHConf::SSH_LOGIN_PATTERN} (GHSA-33rq-g2cr-74ww).
 *
 * The SSH login reaches root shell commands, a sed edit of /etc/passwd and
 * adduser/addgroup. A value matching this pattern is a plain Unix username with
 * no shell, sed or path metacharacters, which is what keeps those sinks safe.
 * This is the single source used by both the REST schema (GeneralSettings
 * DataStructure) and the SSHConf sink guard.
 */
class SshLoginPatternTest extends TestCase
{
    private function matchesLogin(string $value): bool
    {
        // Mirror the security sink (SSHConf::sanitizeSshLogin): D makes $ reject a
        // trailing newline, which plain PCRE $ would otherwise allow.
        return preg_match('/' . SSHConf::SSH_LOGIN_PATTERN . '/D', $value) === 1;
    }

    /**
     * @dataProvider maliciousLogins
     */
    public function testMaliciousLoginsAreRejected(string $value): void
    {
        $this->assertFalse($this->matchesLogin($value), "Must reject injection payload: {$value}");
    }

    public static function maliciousLogins(): array
    {
        return [
            'command separator' => ['root;id'],
            'command substitution' => ['a$(id)'],
            'backtick' => ['a`id`'],
            'logical and' => ['u&&reboot'],
            'pipe' => ['a|sh'],
            'single quote break' => ["x'y"],
            'newline' => ["x\ntouch /tmp/pwn"],
            'trailing newline' => ["admin\n"],
            'space' => ['root x'],
            'slash (path/sed)' => ['../../etc/x'],
            'sed ampersand' => ['a&b'],
            'dot' => ['a.b'],
            'leading hyphen' => ['-rf'],
            'empty' => [''],
            'too long' => [str_repeat('a', 51)],
        ];
    }

    /**
     * @dataProvider legitLogins
     */
    public function testLegitLoginsAreAccepted(string $value): void
    {
        $this->assertTrue($this->matchesLogin($value), "Must accept valid Unix login: {$value}");
    }

    public static function legitLogins(): array
    {
        return [
            'root' => ['root'],
            'word' => ['sshadmin'],
            'underscore' => ['ssh_user'],
            'leading underscore' => ['_svc'],
            'hyphen inside' => ['admin-1'],
            'digits inside' => ['user42'],
            // Historically-valid logins that must survive an upgrade (no lockout).
            'uppercase' => ['MikoAdmin'],
            'leading digit' => ['1user'],
            'over 32 under 50' => [str_repeat('a', 40)],
            'max length' => [str_repeat('a', 50)],
        ];
    }
}
