<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Tests\Core\Asterisk\Configs;

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class SIPConfTest extends AbstractUnitTest
{
    public function testNeedAsteriskRestart(): void
    {
        $conf = new SIPConf();
        $conf->needAsteriskRestart();
        $this->assertTrue(true);
    }

    /**
     * Issue #1045: first occurrence of a uniqid wins, the seenUniqids tracker
     * stores the winner row id, and the call returns false (do not skip).
     */
    public function testShouldSkipDuplicateUniqidFirstOccurrenceIsKept(): void
    {
        $conf = new SIPConf();
        $seen = [];

        $skip = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-AAAA1111', '7', &$seen, 'provider']
        );

        $this->assertFalse($skip, 'First occurrence must not be skipped');
        $this->assertSame(['SIP-TRUNK-AAAA1111' => '7'], $seen);
    }

    /**
     * Issue #1045: a second row with the same uniqid is reported as duplicate
     * and the tracker keeps pointing at the original (smaller-id) winner.
     */
    public function testShouldSkipDuplicateUniqidSecondOccurrenceIsSkipped(): void
    {
        $conf = new SIPConf();
        $seen = ['SIP-TRUNK-AAAA1111' => '7'];

        $skip = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-AAAA1111', '12', &$seen, 'provider']
        );

        $this->assertTrue($skip, 'Duplicate uniqid must be skipped');
        $this->assertSame('7', $seen['SIP-TRUNK-AAAA1111'], 'Winner (id=7) must be preserved');
    }

    /**
     * Different uniqids must coexist in the tracker — the helper only blocks
     * exact uniqid collisions.
     */
    public function testShouldSkipDuplicateUniqidUnrelatedRowsCoexist(): void
    {
        $conf = new SIPConf();
        $seen = [];

        $skipFirst  = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-AAAA1111', '7', &$seen, 'provider']
        );
        $skipSecond = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-BBBB2222', '8', &$seen, 'provider']
        );

        $this->assertFalse($skipFirst);
        $this->assertFalse($skipSecond);
        $this->assertSame(
            ['SIP-TRUNK-AAAA1111' => '7', 'SIP-TRUNK-BBBB2222' => '8'],
            $seen
        );
    }

    /**
     * Empty/null uniqid degenerates to '' — the helper still dedups it (two
     * rows with empty uniqid would emit `[]` sections and break pjsip.conf
     * the same way as a real collision).
     */
    public function testShouldSkipDuplicateUniqidEmptyUniqidIsDedupedToo(): void
    {
        $conf = new SIPConf();
        $seen = [];

        $skipFirst  = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['', '3', &$seen, 'peer']
        );
        $skipSecond = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['', '5', &$seen, 'peer']
        );

        $this->assertFalse($skipFirst);
        $this->assertTrue($skipSecond);
    }

    // -----------------------------------------------------------------------
    // isIpOrCidr — gate that decides whether a provider host can go straight
    // into identify match= or has to be deferred to the DNS resolver worker.
    // -----------------------------------------------------------------------

    public function testIsIpOrCidrAcceptsIpv4(): void
    {
        $this->assertTrue(SIPConf::isIpOrCidr('81.88.86.11'));
    }

    public function testIsIpOrCidrAcceptsIpv4Cidr(): void
    {
        $this->assertTrue(SIPConf::isIpOrCidr('81.88.86.0/24'));
    }

    public function testIsIpOrCidrAcceptsIpv6(): void
    {
        $this->assertTrue(SIPConf::isIpOrCidr('2001:db8::1'));
    }

    public function testIsIpOrCidrAcceptsIpv6Cidr(): void
    {
        $this->assertTrue(SIPConf::isIpOrCidr('2001:db8::/64'));
    }

    public function testIsIpOrCidrRejectsHostname(): void
    {
        $this->assertFalse(SIPConf::isIpOrCidr('mikoru.mangosip.ru'));
    }

    public function testIsIpOrCidrRejectsFqdnWithTrailingDot(): void
    {
        // A trailing-dot FQDN is canonical DNS form but still a hostname,
        // not a literal IP — must NOT be passed through to match= as-is.
        $this->assertFalse(SIPConf::isIpOrCidr('mikoru.mangosip.ru.'));
    }

    public function testIsIpOrCidrRejectsEmptyAndWhitespace(): void
    {
        $this->assertFalse(SIPConf::isIpOrCidr(''));
        $this->assertFalse(SIPConf::isIpOrCidr('   '));
    }

    public function testIsIpOrCidrTrimsWhitespaceFromValidIp(): void
    {
        // Copy/paste from admin UI may include leading/trailing whitespace.
        // We want the value to count as valid (otherwise we'd silently swallow
        // a perfectly good IP into the pendingResolveHostnames bucket).
        $this->assertTrue(SIPConf::isIpOrCidr('  81.88.86.11  '));
    }

    public function testIsIpOrCidrRejectsGarbage(): void
    {
        $this->assertFalse(SIPConf::isIpOrCidr('not-an-ip'));
        $this->assertFalse(SIPConf::isIpOrCidr('999.999.999.999'));
    }

    // -----------------------------------------------------------------------
    // normalizeHostnameKey — must match #1044's normalizeHost rule so the
    // worker and the SIPConf generator agree on the cache key for a given
    // hostname regardless of case or trailing FQDN dot.
    // -----------------------------------------------------------------------

    public function testNormalizeHostnameKeyLowercases(): void
    {
        $this->assertSame('novofon.com', SIPConf::normalizeHostnameKey('Novofon.COM'));
    }

    public function testNormalizeHostnameKeyStripsTrailingDot(): void
    {
        $this->assertSame('mikoru.mangosip.ru', SIPConf::normalizeHostnameKey('mikoru.mangosip.ru.'));
    }

    public function testNormalizeHostnameKeyTrimsWhitespace(): void
    {
        $this->assertSame('host.example', SIPConf::normalizeHostnameKey("  host.example\t"));
    }

    public function testNormalizeHostnameKeyHandlesEmpty(): void
    {
        $this->assertSame('', SIPConf::normalizeHostnameKey(''));
        $this->assertSame('', SIPConf::normalizeHostnameKey('   '));
    }

    // -----------------------------------------------------------------------
    // extractHostFromOutboundProxy — must reverse buildHostPort() correctly
    // for every shape outbound_proxy can take in the DB (SRV-mode hostnames,
    // host:port, IPv6 in brackets, with SIP URI parameters).
    // -----------------------------------------------------------------------

    public function testExtractHostFromOutboundProxyBareHostname(): void
    {
        $this->assertSame('proxy.example.com', SIPConf::extractHostFromOutboundProxy('proxy.example.com'));
    }

    public function testExtractHostFromOutboundProxyHostnameWithPort(): void
    {
        $this->assertSame('proxy.example.com', SIPConf::extractHostFromOutboundProxy('proxy.example.com:5060'));
    }

    public function testExtractHostFromOutboundProxyIpv4WithPort(): void
    {
        $this->assertSame('81.88.86.11', SIPConf::extractHostFromOutboundProxy('81.88.86.11:5060'));
    }

    public function testExtractHostFromOutboundProxyBracketedIpv6WithPort(): void
    {
        // RFC 3986/5118: literal IPv6 in a URI must be bracketed so the
        // trailing ":port" is unambiguous. Result is the raw IPv6 without
        // brackets (downstream isIpOrCidr expects unbracketed form).
        $this->assertSame('2001:db8::1', SIPConf::extractHostFromOutboundProxy('[2001:db8::1]:5060'));
    }

    public function testExtractHostFromOutboundProxyBracketedIpv6NoPort(): void
    {
        $this->assertSame('2001:db8::1', SIPConf::extractHostFromOutboundProxy('[2001:db8::1]'));
    }

    public function testExtractHostFromOutboundProxyStripsScheme(): void
    {
        $this->assertSame('proxy.example.com', SIPConf::extractHostFromOutboundProxy('sip:proxy.example.com:5060'));
        $this->assertSame('proxy.example.com', SIPConf::extractHostFromOutboundProxy('sips:proxy.example.com'));
    }

    public function testExtractHostFromOutboundProxyStripsUriParameters(): void
    {
        // outbound_proxy with ;transport=udp tail — the host is everything
        // up to the first ';'.
        $this->assertSame('proxy.example.com', SIPConf::extractHostFromOutboundProxy('proxy.example.com;transport=udp'));
    }

    public function testExtractHostFromOutboundProxyEmptyReturnsEmpty(): void
    {
        $this->assertSame('', SIPConf::extractHostFromOutboundProxy(''));
        $this->assertSame('', SIPConf::extractHostFromOutboundProxy('   '));
    }

    // -----------------------------------------------------------------------
    // getIncomingContextId — issue #1066 regression coverage.
    //
    // The cache-substitution path is what makes two providers whose distinct
    // hostnames resolve to the same backing IP share one incoming-context.
    // These tests stub the `redis` DI service with a tiny anonymous fake that
    // serves JSON-encoded payloads for known keys and returns false otherwise.
    //
    // Test cases (port=0 means SRV-mode marker):
    //   (a) IP literal in name             → passthrough
    //   (b) hostname + warm cache          → canonical-IP-derived name
    //   (c) hostname + cold cache          → hostname-as-string fallback
    //   (d) two different hostnames with
    //       same canonical IP              → identical context ID
    // -----------------------------------------------------------------------

    /**
     * Stub the `redis` service on the currently-active Phalcon DI with an
     * anonymous fake whose `get($key)` returns a JSON payload for known keys
     * and false otherwise. Also resets SIPConf's process-local memo so tests
     * do not leak resolved-IP state across cases.
     *
     * @param array<string,array<int,string>> $resolved keyed by normalized hostname
     */
    private function stubResolvedCache(array $resolved): void
    {
        $payloadByKey = [];
        foreach ($resolved as $hostKey => $ips) {
            $cacheKey = SIPConf::CACHE_KEY_RESOLVED_PREFIX . $hostKey;
            $payloadByKey[$cacheKey] = json_encode([
                'ips' => $ips,
                'at'  => 1700000000,
                'src' => 'SRV',
            ]);
        }

        $fake = new class($payloadByKey) {
            /** @param array<string,string> $payloads keyed by full Redis key */
            public function __construct(private array $payloads) {}
            public function get(string $key): string|false
            {
                return $this->payloads[$key] ?? false;
            }
            // No-ops to be defensive against unexpected writes from the path
            // under test (warmupDnsCache et al. should never be invoked from
            // getIncomingContextId, but we don't want a fatal if it ever is).
            public function setex(string $key, int $ttl, string $value): bool { return true; }
            public function set(string $key, mixed $value, mixed $ttl = null): bool { return true; }
        };

        $di = \Phalcon\Di\Di::getDefault();
        $di->setShared(RedisClientProvider::SERVICE_NAME, static fn() => $fake);

        // Drop the process-local memo so the new stub takes effect.
        SIPConf::resetResolvedIpsMemo();
    }

    public function testGetIncomingContextIdIpLiteralPassthrough(): void
    {
        // IP literal short-circuits the cache lookup. preg_replace strips
        // non-alphanum so "37.139.38.131" + port "5060" = "37139381315060".
        $this->stubResolvedCache([]);
        $this->assertSame(
            '37139381315060-incoming',
            SIPConf::getIncomingContextId('37.139.38.131', '5060')
        );
    }

    public function testGetIncomingContextIdHostnameWithWarmCacheUsesCanonicalIp(): void
    {
        // Cache holds 3 Novofon IPs; sort()[0] = "37.139.38.131" is canonical.
        // Port=0 → 'srv' marker; preg_replace strips dots leaving
        // "3713938131srv" + "-incoming".
        $this->stubResolvedCache([
            'sip.novofon.ru' => ['37.139.38.236', '37.139.38.131', '37.139.38.237'],
        ]);
        $this->assertSame(
            '3713938131srv-incoming',
            SIPConf::getIncomingContextId('sip.novofon.ru', '0')
        );
    }

    public function testGetIncomingContextIdHostnameWithColdCacheFallsBackToHostname(): void
    {
        // No cache entry for this host → hostname-as-string fallback (the
        // post-6e4d8bbb0c behaviour). Acceptable transient state until
        // WorkerSipDnsResolver populates the cache and triggers regeneration.
        $this->stubResolvedCache([]);
        $this->assertSame(
            'examplecomsrv-incoming',
            SIPConf::getIncomingContextId('example.com', '0')
        );
    }

    public function testGetIncomingContextIdTwoHostnamesSameCanonicalIpProduceSameContext(): void
    {
        // Issue #1066 core invariant: distinct hostnames that resolve to the
        // same canonical IP must collapse onto the same context name, so the
        // same dialplan section handles incoming calls from either provider.
        //
        // IPs MUST be publicly routable — readResolvedIps() filters via
        // IpAddressHelper::isPublicIp() as defense in depth against
        // attacker-controlled DNS returning loopback / RFC1918 addresses.
        $this->stubResolvedCache([
            'sip1.example.net' => ['52.10.0.1', '52.10.0.5'],
            'sip2.example.net' => ['52.10.0.1', '52.10.0.9'],
        ]);
        $ctx1 = SIPConf::getIncomingContextId('sip1.example.net', '0');
        $ctx2 = SIPConf::getIncomingContextId('sip2.example.net', '0');
        $this->assertSame($ctx1, $ctx2);
        // Sanity: it really is canonical-IP-based (52.10.0.1 → "521001").
        $this->assertSame('521001srv-incoming', $ctx1);
    }

    public function testGetIncomingContextIdHostnameKeyNormalizedBeforeLookup(): void
    {
        // Cache key is the normalized form (lowercase, no trailing dot).
        // A request that arrives with mixed-case or trailing-dot host must
        // still hit the cache — otherwise issue #1044's normalize-host rule
        // is silently bypassed in the context-name path.
        //
        // Uses a publicly routable IP — see the sibling test for the
        // isPublicIp() defense-in-depth rationale.
        $this->stubResolvedCache([
            'host.example.net' => ['52.86.0.7'],
        ]);
        $this->assertSame(
            '5286071000-incoming',  // FQDN normalised; canonical IP 52.86.0.7 + port 1000 stripped
            SIPConf::getIncomingContextId('Host.Example.Net.', '1000')
        );
    }
}
