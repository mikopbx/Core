<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\MonitorFilenameOptionsResolver;
use PHPUnit\Framework\TestCase;

final class MonitorFilenameOptionsResolverTest extends TestCase
{
    public function testFullNameRemainsAuthoritativeWhenMonoSourceDoesNotExist(): void
    {
        $result = MonitorFilenameOptionsResolver::resolve(
            '/monitor/existing-call',
            '/monitor/generated-call',
            'wav48',
            true
        );

        self::assertSame(
            [
                '/monitor/existing-call',
                'abr(/monitor/existing-call_in.wav48)t(/monitor/existing-call_out.wav48)',
                'wav48',
            ],
            $result
        );
    }

    public function testExistingStereoPairDeterminesEffectiveExtension(): void
    {
        $base = sys_get_temp_dir() . '/mikopbx-monitor-resolver-' . bin2hex(random_bytes(6));
        file_put_contents($base . '_in.wav16', 'in');
        file_put_contents($base . '_out.wav16', 'out');

        try {
            self::assertSame(
                [$base, "abr({$base}_in.wav16)t({$base}_out.wav16)", 'wav16'],
                MonitorFilenameOptionsResolver::resolve($base, '', 'wav48', false)
            );
        } finally {
            unlink($base . '_in.wav16');
            unlink($base . '_out.wav16');
        }
    }

    public function testRejectsEmptyFullAndGeneratedNames(): void
    {
        self::assertSame(
            null,
            MonitorFilenameOptionsResolver::resolve('', '', 'wav48', true)
        );
    }
}
