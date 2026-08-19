<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\InterceptionCallIdResolver;
use PHPUnit\Framework\TestCase;

final class InterceptionCallIdResolverTest extends TestCase
{
    public function testMapsAnsweredEndpointCallIdToDestinationAndRestoresProviderCallId(): void
    {
        $result = InterceptionCallIdResolver::resolve(
            [
                'linkedid' => 'mikopbx-1787130596.13',
                'src_chan' => 'PJSIP/SIP-PROVIDER-00000006',
                'dst_chan' => 'PJSIP/206-00000008',
                // The legacy interception event reads the current PJSIP channel
                // into src_call_id even though that channel is the destination.
                'src_call_id' => '4392c7e3-5d63-49ac-b73f-044b26ae0d96',
            ],
            [
                (object)[
                    'linkedid' => 'mikopbx-1787130596.13',
                    'src_chan' => 'PJSIP/OTHER-PROVIDER-00000005',
                    'src_call_id' => 'wrong-provider-call-id',
                ],
                (object)[
                    'linkedid' => 'mikopbx-1787130596.12',
                    'src_chan' => 'PJSIP/SIP-PROVIDER-00000006',
                    'src_call_id' => 'wrong-linkedid-call-id',
                ],
                (object)[
                    'linkedid' => 'mikopbx-1787130596.13',
                    'src_chan' => 'PJSIP/SIP-PROVIDER-00000006',
                    'src_call_id' => '-PmwpW7cts4EdIL72ajxkA..',
                ],
            ]
        );

        self::assertSame('-PmwpW7cts4EdIL72ajxkA..', $result['src_call_id']);
        self::assertSame('4392c7e3-5d63-49ac-b73f-044b26ae0d96', $result['dst_call_id']);
    }
}
