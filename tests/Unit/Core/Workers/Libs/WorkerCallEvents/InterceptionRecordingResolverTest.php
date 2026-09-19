<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\InterceptionRecordingResolver;
use PHPUnit\Framework\TestCase;

final class InterceptionRecordingResolverTest extends TestCase
{
    /**
     * @param array<string,array<string,string>> $vars channel => [variable => value]
     */
    private static function getVar(array $vars): callable
    {
        return static fn(string $channel, string $variable): string => $vars[$channel][$variable] ?? '';
    }

    public function testDerivesEndpointFromLocalOtherHalfBridgePeer(): void
    {
        $channel = InterceptionRecordingResolver::resolveDestinationChannel(
            ['recordingfile' => ''],
            (object)[
                'src_chan' => 'PJSIP/SIP-PROVIDER-AAA-0000002d',
                'dst_chan' => 'Local/233@internal-originate-0000001a;1',
            ],
            self::getVar([
                'Local/233@internal-originate-0000001a;2' => ['BRIDGEPEER' => 'PJSIP/233-00000012'],
            ])
        );

        self::assertSame('PJSIP/233-00000012', $channel);
    }

    public function testFallsBackToCallerBridgePeerAfterLocalOptimization(): void
    {
        // Local pair already optimized away: ;2 has no BRIDGEPEER, caller is bridged to endpoint.
        $channel = InterceptionRecordingResolver::resolveDestinationChannel(
            ['recordingfile' => ''],
            (object)[
                'src_chan' => 'PJSIP/SIP-PROVIDER-AAA-0000002d',
                'dst_chan' => 'Local/233@internal-originate-0000001a;1',
            ],
            self::getVar([
                'PJSIP/SIP-PROVIDER-AAA-0000002d' => ['BRIDGEPEER' => 'PJSIP/233-00000012'],
            ])
        );

        self::assertSame('PJSIP/233-00000012', $channel);
    }

    public function testSkipsWhenLuaAlreadyStartedRecording(): void
    {
        $channel = InterceptionRecordingResolver::resolveDestinationChannel(
            ['recordingfile' => '/monitor/2026/09/18/16/mikopbx-1.webm'],
            (object)[
                'src_chan' => 'PJSIP/SIP-PROVIDER-AAA-0000002d',
                'dst_chan' => 'Local/233@internal-originate-0000001a;1',
            ],
            self::getVar([
                'Local/233@internal-originate-0000001a;2' => ['BRIDGEPEER' => 'PJSIP/233-00000012'],
            ])
        );

        self::assertSame('', $channel);
    }

    public function testSkipsOrdinaryEndpointAnswer(): void
    {
        $channel = InterceptionRecordingResolver::resolveDestinationChannel(
            ['recordingfile' => ''],
            (object)[
                'src_chan' => 'PJSIP/SIP-PROVIDER-AAA-0000002d',
                'dst_chan' => 'PJSIP/233-00000012',
            ],
            self::getVar([])
        );

        self::assertSame('', $channel);
    }

    public function testSkipsWhenBridgePeerIsStillLocalAndNoCallerPeer(): void
    {
        $channel = InterceptionRecordingResolver::resolveDestinationChannel(
            ['recordingfile' => ''],
            (object)[
                'src_chan' => 'PJSIP/SIP-PROVIDER-AAA-0000002d',
                'dst_chan' => 'Local/233@internal-originate-0000001a;1',
            ],
            self::getVar([
                'Local/233@internal-originate-0000001a;2' => ['BRIDGEPEER' => 'Local/999@from-queue-00000003;1'],
            ])
        );

        self::assertSame('', $channel);
    }

    public function testWhitespaceRecordingIsTreatedAsEmpty(): void
    {
        $channel = InterceptionRecordingResolver::resolveDestinationChannel(
            ['recordingfile' => '   '],
            (object)[
                'src_chan' => 'PJSIP/SIP-PROVIDER-AAA-0000002d',
                'dst_chan' => 'Local/233@internal-originate-0000001a;1',
            ],
            self::getVar([
                'Local/233@internal-originate-0000001a;2' => ['BRIDGEPEER' => 'PJSIP/233-00000012'],
            ])
        );

        self::assertSame('PJSIP/233-00000012', $channel);
    }
}
