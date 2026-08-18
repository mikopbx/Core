<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\AttendedTransferParticipantsResolver;
use PHPUnit\Framework\TestCase;

final class AttendedTransferParticipantsResolverTest extends TestCase
{
    public function testResolvesCallerAndAnsweredQueueAgentWhenEveryLegHasSameLinkedId(): void
    {
        $linkedId = 'mikopbx-1787063084.68';
        $rows = [
            (object)[
                'UNIQUEID' => 'mikopbx-1787063084.70_IGv1Y5',
                'linkedid' => $linkedId,
                'src_chan' => 'PJSIP/SIP-1692280724-0000001e',
                'src_num' => '74952292333',
                'src_name' => 'MIKO LCC',
                'src_call_id' => 'provider-call-id',
                'dst_chan' => 'PJSIP/204-0000001f',
                'dst_num' => '204',
                'dst_name' => 'Виктор',
                'dst_call_id' => '204-call-id',
                'did' => '74952292333',
                'answer' => '2026-08-18 17:24:47.038',
            ],
            (object)[
                'UNIQUEID' => 'mikopbx-1787063092.74',
                'linkedid' => $linkedId,
                'src_chan' => 'PJSIP/204-0000001f',
                'src_num' => '204',
                'dst_chan' => 'Queue:2001',
                'dst_num' => '2001',
                'answer' => '2026-08-18 17:24:57.745',
                'endtime' => '2026-08-18 17:24:57.745',
            ],
            (object)[
                'UNIQUEID' => 'mikopbx-1787063092.77_Oo03T6',
                'linkedid' => $linkedId,
                'src_chan' => 'PJSIP/204-0000001f',
                'src_num' => '204',
                'dst_chan' => 'PJSIP/203-00000020',
                'dst_num' => '203',
                'answer' => '',
                'endtime' => '2026-08-18 17:24:56.079',
            ],
            (object)[
                'UNIQUEID' => 'mikopbx-1787063092.75_9YG0r3',
                'linkedid' => $linkedId,
                'src_chan' => 'PJSIP/204-0000001f',
                'src_num' => '204',
                'src_name' => 'Виктор',
                'src_call_id' => '204-call-id',
                'dst_chan' => 'PJSIP/201-00000021',
                'dst_num' => '201',
                'dst_name' => 'Алексей',
                'dst_call_id' => '201-call-id',
                'did' => '74952292333',
                'answer' => '2026-08-18 17:24:57.702',
                // CEL delivery order is not guaranteed: this leg may already be closed.
                'endtime' => '2026-08-18 17:25:01.552',
            ],
        ];

        $result = AttendedTransferParticipantsResolver::resolve(
            $rows,
            ['PJSIP/204-0000001f'],
            ['PJSIP/SIP-1692280724-0000001e'],
            ['PJSIP/201-00000021']
        );

        self::assertSame(
            [
                'src_chan' => 'PJSIP/SIP-1692280724-0000001e',
                'src_num' => '74952292333',
                'src_name' => 'MIKO LCC',
                'src_call_id' => 'provider-call-id',
                'dst_chan' => 'PJSIP/201-00000021',
                'dst_num' => '201',
                'dst_name' => 'Алексей',
                'dst_call_id' => '201-call-id',
                'did' => '74952292333',
                'selected_uniqueids' => [
                    'mikopbx-1787063084.70_IGv1Y5',
                    'mikopbx-1787063092.75_9YG0r3',
                ],
            ],
            $result
        );
    }
}
