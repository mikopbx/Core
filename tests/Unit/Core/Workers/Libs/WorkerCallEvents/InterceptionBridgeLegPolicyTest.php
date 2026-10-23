<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\InterceptionBridgeLegPolicy;
use PHPUnit\Framework\TestCase;

final class InterceptionBridgeLegPolicyTest extends TestCase
{
    private const CALLER = 'PJSIP/SIP-PROVIDER-AAA880B194BA809EA72C0FCC4D6363AB-0000009d';

    public function testInterceptionLegEndsWhenCallerIsDialledOnwards(): void
    {
        $row = $this->interceptionRow();

        self::assertTrue(InterceptionBridgeLegPolicy::endsOnTransfereeRedial($row, self::CALLER));
    }

    public function testOtherLegsAreNotEndedByCallerRedial(): void
    {
        $operatorTransfer = $this->interceptionRow();
        $ringing = $this->interceptionRow();
        $ringing->answer = '';
        $closed = $this->interceptionRow();
        $closed->endtime = '2026-10-22 14:42:02.599';
        $regular = $this->interceptionRow();
        $regular->dst_chan = 'PJSIP/236-000000a2';

        self::assertFalse(InterceptionBridgeLegPolicy::endsOnTransfereeRedial(
            $operatorTransfer,
            'PJSIP/233-WS-000000a1'
        ));
        self::assertFalse(InterceptionBridgeLegPolicy::endsOnTransfereeRedial($ringing, self::CALLER));
        self::assertFalse(InterceptionBridgeLegPolicy::endsOnTransfereeRedial($closed, self::CALLER));
        self::assertFalse(InterceptionBridgeLegPolicy::endsOnTransfereeRedial($regular, self::CALLER));
        self::assertFalse(InterceptionBridgeLegPolicy::endsOnTransfereeRedial($operatorTransfer, ''));
    }

    private function interceptionRow(): object
    {
        return (object)[
            'src_chan' => self::CALLER,
            'dst_chan' => 'Local/233@internal-originate-00000053;1',
            'answer' => '2026-10-22 14:41:47.502',
            'endtime' => '',
            'transfer' => '0',
        ];
    }
}
