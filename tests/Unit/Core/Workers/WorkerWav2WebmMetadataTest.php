<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\Workers\WorkerWav2Webm;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class WorkerWav2WebmMetadataTest extends TestCase
{
    private function buildCommand(array $taskData): string
    {
        $reflection = new ReflectionClass(WorkerWav2Webm::class);
        $worker = $reflection->newInstanceWithoutConstructor();
        $method = $reflection->getMethod('buildFfmpegCommand');

        return $method->invoke($worker, '/usr/bin/ffmpeg', '/rec/call.wav', '/rec/call.webm', '48k', $taskData, 120);
    }

    public function testSrcOnLeftWhenMixMonitorRanOnCalledLeg(): void
    {
        // rec_src_channel='0': MixMonitor on dst_chan, src_num voice is in _out => LEFT
        $command = $this->buildCommand(['src_num' => '236', 'dst_num' => '79036008630', 'rec_src_channel' => '0']);

        self::assertStringContainsString(" -metadata CALL_LEFT_NUM='236'", $command, $command);
        self::assertStringContainsString(" -metadata CALL_RIGHT_NUM='79036008630'", $command, $command);
    }

    public function testSrcOnRightWhenMixMonitorRanOnCallerLeg(): void
    {
        // rec_src_channel='1': MixMonitor on src_chan (IVR), src_num voice is in _in => RIGHT
        $command = $this->buildCommand(['src_num' => '74951500661', 'dst_num' => '212', 'rec_src_channel' => '1']);

        self::assertStringContainsString(" -metadata CALL_LEFT_NUM='212'", $command, $command);
        self::assertStringContainsString(" -metadata CALL_RIGHT_NUM='74951500661'", $command, $command);
    }

    public function testSideTagsOmittedWhenSideUndetermined(): void
    {
        foreach ([[], ['rec_src_channel' => ''], ['rec_src_channel' => '2']] as $extra) {
            $command = $this->buildCommand(['src_num' => '236', 'dst_num' => '212'] + $extra);

            self::assertStringNotContainsString('CALL_LEFT_NUM', $command, $command);
            self::assertStringNotContainsString('CALL_RIGHT_NUM', $command, $command);
            self::assertStringContainsString(" -metadata CALL_SRC_NUM='236'", $command, $command);
        }
    }

    public function testSideTagsOmittedWhenOneNumberMissing(): void
    {
        $command = $this->buildCommand(['src_num' => '236', 'rec_src_channel' => '0']);

        self::assertStringNotContainsString('CALL_LEFT_NUM', $command, $command);
        self::assertStringNotContainsString('CALL_RIGHT_NUM', $command, $command);
    }

    public function testNumbersAreShellEscaped(): void
    {
        $command = $this->buildCommand(['src_num' => "1'; rm -rf /", 'dst_num' => '2', 'rec_src_channel' => '1']);

        self::assertStringContainsString(" -metadata CALL_RIGHT_NUM='1'\\''; rm -rf /'", $command, $command);
    }
}
