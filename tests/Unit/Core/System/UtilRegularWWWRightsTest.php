<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Util;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Util::addRegularWWWRights() must escape every path separately: a space-joined list
 * escaped as one argument made find fail and left /usr/www 0644 after boot (#1318).
 */
final class UtilRegularWWWRightsTest extends TestCase
{
    private string $tmpDir = '';

    protected function tearDown(): void
    {
        if ($this->tmpDir !== '' && is_dir($this->tmpDir)) {
            shell_exec('chmod -R u+rwx ' . escapeshellarg($this->tmpDir) . ' 2>/dev/null');
            shell_exec('rm -rf ' . escapeshellarg($this->tmpDir));
        }
    }

    private static function invokeUtil(string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionMethod(Util::class, $method);
        $reflection->setAccessible(true);
        return $reflection->invoke(null, ...$args);
    }

    private static function commands(mixed $folder, string $skip = ''): array
    {
        return self::invokeUtil('buildRegularWWWRightsCommands', $folder, $skip, 'find', 'chown', 'chmod', 'xargs');
    }

    private static function realCommands(array $folders, string $skip = ''): array
    {
        return self::invokeUtil(
            'buildRegularWWWRightsCommands',
            $folders,
            $skip,
            Util::which('find'),
            Util::which('chown'),
            Util::which('chmod'),
            Util::which('xargs')
        );
    }

    private static function executableCommand(mixed $folder): string
    {
        return self::invokeUtil('buildExecutableRightsCommand', $folder, 'find', 'chmod', 'xargs');
    }

    private static function perms(string $path): string
    {
        clearstatcache();
        return substr(sprintf('%o', fileperms($path)), -4);
    }

    public function testSeveralPathsBecomeSeparateFindArguments(): void
    {
        $commands = self::commands(['/usr/www/', '/etc/version', '/var/tmp/www_cache/volt']);

        self::assertCount(3, $commands);
        foreach ($commands as $command) {
            self::assertStringStartsWith("find '/usr/www/' '/etc/version' '/var/tmp/www_cache/volt' ", $command);
        }
    }

    public function testPathWithSpaceStaysOneArgument(): void
    {
        $commands = self::commands(['/tmp/a b', '/tmp/c']);

        self::assertStringStartsWith("find '/tmp/a b' '/tmp/c' ", $commands[0]);
    }

    public function testSinglePathString(): void
    {
        $commands = self::commands('/cf');

        self::assertStringStartsWith("find '/cf' -type d -not -perm 755 -print0 ", $commands[0]);
        self::assertStringEndsWith('chmod 755', $commands[0]);
        self::assertSame("find '/cf' -not -user www -exec chown -h www:www {} +", $commands[2]);
    }

    public function testSkipIsPrunedAndEscaped(): void
    {
        $commands = self::commands(['/cf'], '/cf/conf/license v2');

        foreach ($commands as $command) {
            self::assertStringStartsWith("find '/cf' -path '/cf/conf/license v2' -prune -o ", $command);
        }
    }

    public function testShellMetacharactersStayQuoted(): void
    {
        $commands = self::commands(['/tmp/x; touch /tmp/pwned', '/tmp/$(id)']);

        self::assertStringStartsWith("find '/tmp/x; touch /tmp/pwned' '/tmp/\$(id)' ", $commands[0]);
    }

    public function testEmptyInputProducesNoCommands(): void
    {
        self::assertSame([], self::commands([]));
        self::assertSame([], self::commands(''));
        self::assertSame([], self::commands(['', '']));
        self::assertSame([], self::commands(null));
    }

    public function testNestedArraysAndObjectsAreSkipped(): void
    {
        // Such values must not reach find as "Array" or fail on a string cast
        $commands = self::commands(['/cf/conf', ['nested'], new \stdClass()]);

        self::assertStringStartsWith("find '/cf/conf' -type d ", $commands[0]);
    }

    public function testExecutableRightsEscapeEveryPath(): void
    {
        $command = self::executableCommand(
            ['/usr/www/src/Core/Asterisk/agi-bin', '/usr/www/src/Core/Rc', '/tmp/a b']
        );

        self::assertStringStartsWith(
            "find '/usr/www/src/Core/Asterisk/agi-bin' '/usr/www/src/Core/Rc' '/tmp/a b' -type f -print0 ",
            $command
        );
        self::assertStringEndsWith('chmod 755', $command);
        self::assertSame('', self::executableCommand([]));
    }

    /**
     * Mirrors #1318: the listed roots are traversable, the directories under them were
     * shipped 0644. Every root of the list must be repaired, the skipped path must not.
     * Runs as a regular user: all directories belong to the test process.
     */
    public function testDirectoryRightsAreRepairedUnderEveryListedRoot(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/www-rights-' . bin2hex(random_bytes(4));
        $firstRoot = "$this->tmpDir/www";
        $secondRoot = "$this->tmpDir/with space";
        $sites = "$firstRoot/sites";
        $volt = "$secondRoot/volt";
        $skipped = "$firstRoot/license-v2";
        foreach ([$sites, $volt, $skipped] as $dir) {
            mkdir($dir, 0755, true);
        }
        chmod($sites, 0644);
        chmod($volt, 0644);
        chmod($skipped, 0700);

        // Run only the directory chmod: the www user may not exist on the test host
        $commands = self::realCommands([$firstRoot, $secondRoot], $skipped);
        shell_exec($commands[0]);

        self::assertSame('0755', self::perms($sites));
        self::assertSame('0755', self::perms($volt));
        self::assertSame('0700', self::perms($skipped));
    }

    /**
     * A listed root that is itself 0644 must be repaired too. GNU find (the appliance and
     * the dev container) evaluates such a start point; BSD find run as a regular user
     * reports "Permission denied" for it instead, so the case is checked on GNU find only.
     */
    public function testListedRootWithWrongModeIsRepaired(): void
    {
        $find = Util::which('find');
        if (!str_contains((string)shell_exec(escapeshellarg($find) . ' --version 2>/dev/null'), 'GNU')) {
            self::markTestSkipped('Needs GNU find, as on the appliance');
        }
        $this->tmpDir = sys_get_temp_dir() . '/www-rights-' . bin2hex(random_bytes(4));
        $first = "$this->tmpDir/sites";
        $second = "$this->tmpDir/with space";
        mkdir($first, 0755, true);
        mkdir($second, 0755, true);
        chmod($first, 0644);
        chmod($second, 0644);

        $commands = self::realCommands([$first, $second]);
        shell_exec($commands[0]);

        self::assertSame('0755', self::perms($first));
        self::assertSame('0755', self::perms($second));
    }
}
