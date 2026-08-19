<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Calls;

use MikoPBX\Tests\Calls\Scripts\Interception\ActiveProviderInterception;
use PHPUnit\Framework\TestCase;
use RuntimeException;

require_once __DIR__ . '/../../Calls/Scripts/Interception/ActiveProviderInterception.php';

final class ActiveProviderInterceptionTest extends TestCase
{
    private const string PROVIDER_ID = 'SIP-PROVIDER-AAA880B194BA809EA72C0FCC4D6363AB';

    public function testSelectsTheOnlyExactProviderChannel(): void
    {
        $channels = [
            'mikopbx-100.1' => [
                'PJSIP/201-00000001',
                'PJSIP/' . self::PROVIDER_ID . '-00000002',
            ],
            'mikopbx-101.1' => [
                'PJSIP/' . self::PROVIDER_ID . '-backup-00000003',
            ],
        ];

        self::assertSame(
            [
                'channel' => 'PJSIP/' . self::PROVIDER_ID . '-00000002',
                'linkedid' => 'mikopbx-100.1',
            ],
            ActiveProviderInterception::selectChannel($channels, self::PROVIDER_ID)
        );
    }

    public function testRejectsMissingProviderChannel(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No active channel found');

        ActiveProviderInterception::selectChannel(
            ['mikopbx-100.1' => ['PJSIP/201-00000001']],
            self::PROVIDER_ID
        );
    }

    public function testRejectsAmbiguousProviderChannels(): void
    {
        $first = 'PJSIP/' . self::PROVIDER_ID . '-00000002';
        $second = 'PJSIP/' . self::PROVIDER_ID . '-00000003';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage($first);
        $this->expectExceptionMessage($second);

        ActiveProviderInterception::selectChannel(
            [
                'mikopbx-100.1' => [$first],
                'mikopbx-101.1' => [$second],
            ],
            self::PROVIDER_ID
        );
    }

    public function testSelectsExplicitChannelWhenSeveralCallsAreActive(): void
    {
        $first = 'PJSIP/' . self::PROVIDER_ID . '-00000002';
        $second = 'PJSIP/' . self::PROVIDER_ID . '-00000003';

        self::assertSame(
            ['channel' => $second, 'linkedid' => 'mikopbx-101.1'],
            ActiveProviderInterception::selectChannel(
                [
                    'mikopbx-100.1' => [$first],
                    'mikopbx-101.1' => [$second],
                ],
                self::PROVIDER_ID,
                $second
            )
        );
    }

    public function testBuildsOriginateRequestForInterceptionDialplan(): void
    {
        self::assertSame(
            [
                'channel' => 'Local/206@internal-originate',
                'exten' => '79255197469',
                'context' => 'interception-bridge',
                'priority' => 1,
                'callerId' => '206',
                'variables' => 'pt1c_cid=79255197469,ALLOW_MULTY_ANSWER=1,'
                    . '_INTECEPTION_CNANNEL=PJSIP/' . self::PROVIDER_ID . '-00000002,'
                    . '_OLD_LINKEDID=mikopbx-100.1',
            ],
            ActiveProviderInterception::buildOriginateRequest(
                [
                    'channel' => 'PJSIP/' . self::PROVIDER_ID . '-00000002',
                    'linkedid' => 'mikopbx-100.1',
                ],
                '206',
                '79255197469'
            )
        );
    }

    public function testRejectsUnsafeOriginateValues(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Invalid internal extension');

        ActiveProviderInterception::buildOriginateRequest(
            [
                'channel' => 'PJSIP/' . self::PROVIDER_ID . '-00000002',
                'linkedid' => 'mikopbx-100.1',
            ],
            '206,OTHER=value',
            '79255197469'
        );
    }
}
