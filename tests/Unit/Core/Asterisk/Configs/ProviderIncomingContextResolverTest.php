<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\Asterisk\Configs\ProviderIncomingContextResolver;
use PHPUnit\Framework\TestCase;

final class ProviderIncomingContextResolverTest extends TestCase
{
    public function testInboundProviderAlwaysUsesUniqid(): void
    {
        $provider = [
            'registration_type' => Sip::REG_TYPE_INBOUND,
            'uniqid' => 'SIP-TRUNK-A',
            'username' => 'account-a',
            'context_id' => '20301135060-incoming',
        ];

        self::assertTrue(ProviderIncomingContextResolver::usesDedicatedContext($provider, 2));
        self::assertSame(
            'SIP-TRUNK-A',
            ProviderIncomingContextResolver::resolveId($provider, 2)
        );
        self::assertNotSame(
            $provider['username'],
            ProviderIncomingContextResolver::resolveId($provider, 2)
        );
    }

    public function testSingleNonInboundProviderUsesUniqid(): void
    {
        $provider = [
            'registration_type' => Sip::REG_TYPE_NONE,
            'uniqid' => 'SIP-TRUNK-A',
            'context_id' => '20301135060-incoming',
        ];

        self::assertTrue(ProviderIncomingContextResolver::usesDedicatedContext($provider, 1));
        self::assertSame(
            'SIP-TRUNK-A',
            ProviderIncomingContextResolver::resolveId($provider, 1)
        );
    }

    public function testSharedNonInboundProvidersUseHostPortContext(): void
    {
        $provider = [
            'registration_type' => Sip::REG_TYPE_NONE,
            'uniqid' => 'SIP-TRUNK-A',
            'context_id' => '20301135060-incoming',
        ];

        self::assertFalse(ProviderIncomingContextResolver::usesDedicatedContext($provider, 2));
        self::assertSame(
            '20301135060',
            ProviderIncomingContextResolver::resolveId($provider, 2)
        );
    }

    public function testSharedGroupExcludesInboundProviders(): void
    {
        $providers = [
            [
                'registration_type' => Sip::REG_TYPE_INBOUND,
                'uniqid' => 'SIP-INBOUND',
                'username' => 'registered-account',
                'context_id' => '20301135060-incoming',
            ],
            [
                'registration_type' => Sip::REG_TYPE_NONE,
                'uniqid' => 'SIP-IP-A',
                'username' => 'ip-account-a',
                'context_id' => '20301135060-incoming',
            ],
            [
                'registration_type' => Sip::REG_TYPE_NONE,
                'uniqid' => 'SIP-IP-B',
                'username' => 'ip-account-b',
                'context_id' => '20301135060-incoming',
            ],
        ];

        self::assertSame(
            [
                'SIP-IP-A' => 'ip-account-a',
                'SIP-IP-B' => 'ip-account-b',
            ],
            ProviderIncomingContextResolver::sharedGroupMembers(
                $providers,
                '20301135060-incoming'
            )
        );
    }
}
