<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Configs;

use MikoPBX\Core\System\Configs\SyslogConf;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class SyslogConfTest extends TestCase
{
    public function testDropbearMonitNoiseFilterDiscardsOnlyExpectedMessages(): void
    {
        $method = new ReflectionMethod(SyslogConf::class, 'buildDropbearMonitNoiseFilter');
        $method->setAccessible(true);

        self::assertSame(
            <<<'RSYSLOG'
if $programname == "dropbear" and (
    $msg contains "Child connection from 127.0.0.1:" or
    $msg contains "Exit before auth from <127.0.0.1:" or
    $msg contains "Forced command set to '/etc/rc/hello'"
) then stop

RSYSLOG,
            $method->invoke(null)
        );
    }

    /**
     * #1209: the chain must survive its own gzip. Eleven rotations of a log whose generations are tagged by content:
     * .1 stays plain, .2–.9 are gzipped and shifted, the tenth and older are gone, legacy names are removed.
     */
    public function testRotationKeepsNineGenerationsAndDropsLegacyNames(): void
    {
        $dir = sys_get_temp_dir() . '/syslog-rotate-' . bin2hex(random_bytes(6));
        mkdir($dir);
        $log = "$dir/messages";
        $script = "$dir/rotate.sh";
        $method = new ReflectionMethod(SyslogConf::class, 'buildRotateScript');
        $method->setAccessible(true);
        file_put_contents($script, $method->invoke(null, $log, '/bin/mv', '/bin/gzip'));
        $legacyNames = ['messages.gz', 'messages.gz.gz.gz', 'messages.1.gz.gz.gz', 'messages.6.gz.gz.gz.gz'];
        foreach ([...$legacyNames, 'messages.log', 'messagesX'] as $name) {
            file_put_contents("$dir/$name", 'old');
        }
        try {
            for ($gen = 1; $gen <= 11; $gen++) {
                file_put_contents($log, "generation $gen\n");
                exec('sh ' . escapeshellarg($script), $out, $rc);
                self::assertSame(0, $rc);
            }
            self::assertFileDoesNotExist($log, 'rsyslog reopens the current file itself');
            self::assertSame("generation 11\n", file_get_contents("$log.1"));
            for ($n = 2; $n <= 9; $n++) {
                self::assertFileDoesNotExist("$log.$n");
                $content = gzdecode((string)file_get_contents("$log.$n.gz"));
                self::assertSame('generation ' . (12 - $n) . "\n", $content, "generation .$n");
            }
            self::assertFileDoesNotExist("$log.10.gz");
            foreach ($legacyNames as $legacy) {
                self::assertFileDoesNotExist("$dir/$legacy");
            }
            self::assertFileExists("$dir/messages.log", 'a file of another name is not the chain\'s business');
            self::assertFileExists("$dir/messagesX");
        } finally {
            array_map('unlink', glob("$dir/*") ?: []);
            rmdir($dir);
        }
    }
}
