<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\Asterisk\Configs\ExtensionsOutWorkTimeConf;
use MikoPBX\Core\Asterisk\Configs\IAXConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use PHPUnit\Framework\TestCase;

/**
 * Issue #1343: the contextID a call carries must equal the restriction context key.
 */
final class OutWorkTimeProviderContextIdTest extends TestCase
{
    public function testSipInboundUsesUniqidNotHostPort(): void
    {
        $peer = [
            'uniqid' => 'SIP-TRUNK-A',
            'registration_type' => Sip::REG_TYPE_INBOUND,
            'username' => 'account-a',
            'host' => '',
            'port' => '5060',
        ];

        self::assertSame('SIP-TRUNK-A-incoming', ExtensionsOutWorkTimeConf::getProviderContextId($peer, false));
    }

    public function testSipOutboundUsesHostPort(): void
    {
        $peer = [
            'uniqid' => 'SIP-TRUNK-B',
            'registration_type' => Sip::REG_TYPE_OUTBOUND,
            'host' => '192.168.10.1',
            'port' => '5060',
        ];

        self::assertSame(
            SIPConf::getIncomingContextId('192.168.10.1', '5060'),
            ExtensionsOutWorkTimeConf::getProviderContextId($peer, false)
        );
    }

    public function testIaxInboundWithUsernameMatchesIaxConfContext(): void
    {
        $peer = [
            'uniqid' => 'IAX-TRUNK-A',
            'registration_type' => Iax::REGISTRATION_TYPE_INBOUND,
            'username' => 'iax-login',
        ];

        self::assertSame('iax-login-incoming', ExtensionsOutWorkTimeConf::getProviderContextId($peer, true));
    }

    public function testIaxInboundWithoutUsernameUsesUniqid(): void
    {
        $peer = [
            'uniqid' => 'IAX-TRUNK-A',
            'registration_type' => Iax::REGISTRATION_TYPE_INBOUND,
            'username' => '',
        ];

        self::assertSame('IAX-TRUNK-A-incoming', ExtensionsOutWorkTimeConf::getProviderContextId($peer, true));
    }

    public function testIaxContextIdFollowsIaxConfProviderId(): void
    {
        $peer = [
            'uniqid' => 'IAX-TRUNK-A',
            'registration_type' => Iax::REGISTRATION_TYPE_INBOUND,
            'username' => '0',
        ];

        self::assertSame(
            IAXConf::getProviderId($peer) . '-incoming',
            ExtensionsOutWorkTimeConf::getProviderContextId($peer, true)
        );
    }

    public function testIaxOutboundUsesUniqid(): void
    {
        $peer = [
            'uniqid' => 'IAX-TRUNK-B',
            'registration_type' => Iax::REGISTRATION_TYPE_OUTBOUND,
            'username' => 'iax-login',
        ];

        self::assertSame('IAX-TRUNK-B-incoming', ExtensionsOutWorkTimeConf::getProviderContextId($peer, true));
    }
}
