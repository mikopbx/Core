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

    // -----------------------------------------------------------------------
    // getRawIncomingContextId — issue #1091 alias safety net.
    //
    // getRawIncomingContextId() is the cache-INDEPENDENT twin of
    // getIncomingContextId(): it always yields the cold, hostname-derived name
    // that a freshly-booted pjsip.conf bakes into endpoint.context. The alias
    // context in extensionGenContexts() is emitted under this name so a stranded
    // pjsip.conf still lands somewhere live. The key property is that it NEVER
    // consults the resolved-IP cache — even when the cache is warm.
    // -----------------------------------------------------------------------

    public function testGetRawIncomingContextIdIgnoresWarmCache(): void
    {
        // Warm cache present, but getRawIncomingContextId must return the
        // hostname-derived name, NOT the canonical-IP one that
        // getIncomingContextId would return for the same inputs.
        $this->stubResolvedCache([
            'sip.novofon.ru' => ['37.139.38.236', '37.139.38.131', '37.139.38.237'],
        ]);
        $this->assertSame(
            'sipnovofonrusrv-incoming',
            SIPConf::getRawIncomingContextId('sip.novofon.ru', '0')
        );
        // Sanity: the warm getIncomingContextId genuinely diverges here.
        $this->assertSame(
            '3713938131srv-incoming',
            SIPConf::getIncomingContextId('sip.novofon.ru', '0')
        );
    }

    public function testGetRawIncomingContextIdEqualsColdGetIncomingContextId(): void
    {
        // With a cold cache the two must agree — that equality is exactly the
        // condition extensionGenContexts() uses to decide NOT to emit an alias.
        $this->stubResolvedCache([]);
        $this->assertSame(
            SIPConf::getIncomingContextId('example.com', '0'),
            SIPConf::getRawIncomingContextId('example.com', '0')
        );
    }

    public function testGetRawIncomingContextIdIpLiteralPassthrough(): void
    {
        // IP-literal providers never have an alias — raw == canonical always.
        $this->stubResolvedCache([]);
        // 193.201.230.178 + port 5060, dots stripped → the exact section name
        // from issue #1091's extensions.conf.
        $this->assertSame(
            '1932012301785060-incoming',
            SIPConf::getRawIncomingContextId('193.201.230.178', '5060')
        );
    }

    // -----------------------------------------------------------------------
    // computeResolvedCanonicalSignature — issue #1091 level trigger.
    //
    // WorkerSipDnsResolver compares this signature against the applied-signature
    // marker to keep re-triggering the reload until the on-disk configs match
    // DNS, surviving a reload that bailed or lost its mutex. The signature MUST
    // change when any hostname's canonical (smallest) IP first appears or shifts,
    // and stay stable otherwise.
    // -----------------------------------------------------------------------

    /**
     * Stub the `redis` service so it serves BOTH the pending-hosts list and the
     * per-host resolved-IP payloads, as computeResolvedCanonicalSignature reads.
     *
     * @param array<int,string> $pending raw pending hostnames
     * @param array<string,array<int,string>> $resolved keyed by normalized hostname
     */
    private function stubPendingAndResolved(array $pending, array $resolved): void
    {
        $payloadByKey = [
            SIPConf::CACHE_KEY_PENDING_HOSTS => json_encode(array_values($pending)),
        ];
        foreach ($resolved as $hostKey => $ips) {
            $payloadByKey[SIPConf::CACHE_KEY_RESOLVED_PREFIX . $hostKey] = json_encode([
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
            public function setex(string $key, int $ttl, string $value): bool { return true; }
            public function set(string $key, mixed $value, mixed $ttl = null): bool { return true; }
        };

        $di = \Phalcon\Di\Di::getDefault();
        $di->setShared(RedisClientProvider::SERVICE_NAME, static fn() => $fake);
        SIPConf::resetResolvedIpsMemo();
    }

    public function testComputeResolvedCanonicalSignatureEmptyWhenNoPending(): void
    {
        $this->stubPendingAndResolved([], []);
        $this->assertSame('', SIPConf::computeResolvedCanonicalSignature());
    }

    public function testComputeResolvedCanonicalSignatureDiffersColdVsWarm(): void
    {
        // Cold: host present in pending list but unresolved → contributes ''.
        $this->stubPendingAndResolved(['vats.megapbx.ru'], []);
        $cold = SIPConf::computeResolvedCanonicalSignature();
        $this->assertNotSame('', $cold);

        // Warm: same host now resolved → canonical IP flips the signature. This
        // is precisely the transition that must NOT be lost when a reload bails.
        $this->stubPendingAndResolved(
            ['vats.megapbx.ru'],
            ['vats.megapbx.ru' => ['193.201.230.178']]
        );
        $warm = SIPConf::computeResolvedCanonicalSignature();
        $this->assertNotSame('', $warm);
        $this->assertNotSame($cold, $warm);
    }

    public function testComputeResolvedCanonicalSignatureStableWhenCanonicalUnchanged(): void
    {
        // Same canonical (smallest) IP, different non-canonical member → the
        // context name is unchanged, so the signature must be identical and the
        // worker must NOT churn a needless dialplan reload.
        $this->stubPendingAndResolved(
            ['vats.megapbx.ru'],
            ['vats.megapbx.ru' => ['193.201.230.178', '193.201.230.200']]
        );
        $a = SIPConf::computeResolvedCanonicalSignature();
        $this->stubPendingAndResolved(
            ['vats.megapbx.ru'],
            ['vats.megapbx.ru' => ['193.201.230.178', '193.201.230.250']]
        );
        $b = SIPConf::computeResolvedCanonicalSignature();
        $this->assertSame($a, $b);
    }

    // -----------------------------------------------------------------------
    // generateIncomingContextHostnameAliases — issue #1091 alias emission.
    //
    // Private instance method; exercised via reflection with a hand-built
    // data_providers array so we can assert the emitted dialplan without a DB.
    // -----------------------------------------------------------------------

    /**
     * Invoke the private alias generator with a stubbed data_providers set, the
     * list of shared canonical context ids, and a pass-wide emitted-names set
     * (by reference, as the real caller threads it).
     *
     * @param array<int,array<string,string>> $providers
     * @param array<int,string> $sharedContextIds
     * @param array<string,true> $emitted
     */
    private function invokeAliasGenerator(
        SIPConf $conf,
        array $providers,
        array $sharedContextIds,
        array &$emitted
    ): string {
        $rp = new \ReflectionProperty(SIPConf::class, 'data_providers');
        $rp->setAccessible(true);
        $rp->setValue($conf, $providers);

        $rm = new \ReflectionMethod(SIPConf::class, 'generateIncomingContextHostnameAliases');
        $rm->setAccessible(true);

        return $rm->invokeArgs($conf, [$sharedContextIds, &$emitted]);
    }

    public function testGenerateHostnameAliasEmitsGotoAndHitGuard(): void
    {
        // Warm shared group: 4 providers on vats.megapbx.ru:5060 → canonical
        // named after the resolved IP, endpoint.context may still hold the cold
        // hostname name (the exact #1091 report).
        $conf = new SIPConf();
        $providers = [
            ['context_id' => '1932012301785060-incoming', 'host' => 'vats.megapbx.ru', 'port' => '5060'],
        ];
        $emitted = ['1932012301785060-incoming' => true]; // canonical registered by the caller
        $out = $this->invokeAliasGenerator($conf, $providers, ['1932012301785060-incoming'], $emitted);

        $this->assertStringContainsString('[vatsmegapbxru5060-incoming]', $out);
        $this->assertStringContainsString(
            'exten => _.!,1,Goto(1932012301785060-incoming,${EXTEN},1)',
            $out
        );
        // House-idiom guard: h/i/t hung up, s deliberately falls through to _.!.
        $this->assertStringContainsString('exten => _[hit],1,Hangup()', $out);
        // Alias name registered in the pass-wide dedup set.
        $this->assertArrayHasKey('vatsmegapbxru5060-incoming', $emitted);
    }

    public function testGenerateHostnameAliasColdGroupEmitsNothing(): void
    {
        // Cold cache: canonical name IS the hostname-derived name → raw ==
        // canonical → no alias needed (pjsip.conf holds the same cold name).
        $conf = new SIPConf();
        $providers = [
            ['context_id' => 'vatsmegapbxru5060-incoming', 'host' => 'vats.megapbx.ru', 'port' => '5060'],
        ];
        $emitted = ['vatsmegapbxru5060-incoming' => true];
        $out = $this->invokeAliasGenerator($conf, $providers, ['vatsmegapbxru5060-incoming'], $emitted);
        $this->assertSame('', $out);
    }

    public function testGenerateHostnameAliasDedupAcrossGroups(): void
    {
        // Two hosts differing only by punctuation ("sip.a.com" vs "sip-a.com")
        // resolve to DIFFERENT IPs → different canonical groups → but sanitise
        // to the SAME alias id "sipacom5060-incoming". A single pass must emit it
        // once and skip the collision; a duplicate [section] makes Asterisk
        // res_config reject the whole extensions.conf (issue #1045 blast radius).
        // Review Warning #1 (alias-vs-alias) regression guard.
        $conf = new SIPConf();
        $providers = [
            ['context_id' => 'groupA-incoming', 'host' => 'sip.a.com', 'port' => '5060'],
            ['context_id' => 'groupB-incoming', 'host' => 'sip-a.com', 'port' => '5060'],
        ];
        $emitted = ['groupA-incoming' => true, 'groupB-incoming' => true];
        $out = $this->invokeAliasGenerator(
            $conf,
            $providers,
            ['groupA-incoming', 'groupB-incoming'],
            $emitted
        );
        // Exactly one [sipacom5060-incoming] section, not two.
        $this->assertSame(1, substr_count($out, '[sipacom5060-incoming]'));
    }

    public function testGenerateHostnameAliasYieldsToCanonicalSection(): void
    {
        // Review Warning #2 (second pass): an alias must never shadow a REAL
        // (canonical) section. A cold punctuation-twin group already emitted its
        // canonical "[sipacom5060-incoming]"; a warm group whose alias would reuse
        // that exact name must be SKIPPED, since aliases run after all canonicals
        // are registered. Otherwise a duplicate [section] rejects extensions.conf.
        $conf = new SIPConf();
        $providers = [
            ['context_id' => 'ipwarm-incoming', 'host' => 'sip.a.com', 'port' => '5060'],
        ];
        // Pre-seed the set as if a cold sibling already emitted this canonical name.
        $emitted = ['ipwarm-incoming' => true, 'sipacom5060-incoming' => true];
        $out = $this->invokeAliasGenerator($conf, $providers, ['ipwarm-incoming'], $emitted);
        $this->assertSame('', $out);
    }

    // -----------------------------------------------------------------------
    // isValidHostname — used by m_SipHosts ingest and warmup so admin-added
    // hostnames flow through the same Redis-cache pipeline as provider.host.
    // The whitelist intentionally permits SRV labels (`_sip._tcp.example.com`),
    // IDN punycode, and dashes; it intentionally rejects raw single labels
    // (almost always a typo for an IP).
    // -----------------------------------------------------------------------

    public function testIsValidHostnameAcceptsFqdn(): void
    {
        $this->assertTrue(SIPConf::isValidHostname('sip.example.com'));
    }

    public function testIsValidHostnameAcceptsTrailingDotFqdn(): void
    {
        // Canonical absolute FQDN form ends with a single dot.
        $this->assertTrue(SIPConf::isValidHostname('sip.example.com.'));
    }

    public function testIsValidHostnameAcceptsPunycodeIdn(): void
    {
        $this->assertTrue(SIPConf::isValidHostname('xn--80aaxitdbjk.xn--p1ai'));
    }

    public function testIsValidHostnameAcceptsHyphensInLabel(): void
    {
        // Hyphens are legal LDH characters as long as the label doesn't
        // start or end with them.
        $this->assertTrue(SIPConf::isValidHostname('sip-edge-01.example.com'));
    }

    public function testIsValidHostnameRejectsSingleLabel(): void
    {
        // Single labels are almost always typos for a literal IP — reject.
        $this->assertFalse(SIPConf::isValidHostname('localhost'));
        $this->assertFalse(SIPConf::isValidHostname('foo'));
        $this->assertFalse(SIPConf::isValidHostname('pbx1'));
    }

    public function testIsValidHostnameRejectsBracketedIpv6(): void
    {
        // filter_var rejects brackets so isIpOrCidr returns false for
        // '[2001:db8::1]'; isValidHostname MUST also reject it, otherwise
        // it'd route into the DNS pipeline as a bogus hostname (see
        // code-review finding #3).
        $this->assertFalse(SIPConf::isValidHostname('[2001:db8::1]'));
        $this->assertFalse(SIPConf::isValidHostname('[2001:db8::1]:5060'));
    }

    public function testIsValidHostnameRejectsHostPort(): void
    {
        // 'host:port' is admin copy-paste typo for additional hosts; the
        // colon previously broke the warmup demux (#2 + #5).
        $this->assertFalse(SIPConf::isValidHostname('sip.example.com:5060'));
        $this->assertFalse(SIPConf::isValidHostname('host.example.org:443'));
    }

    public function testIsValidHostnameRejectsSrvLabel(): void
    {
        // SRV service labels start with '_' which is NOT a valid host
        // character per RFC 1123. Accepting these caused warmup to
        // re-prefix them ('_sip._udp._sip._tcp.example.com') → NXDOMAIN
        // forever (code-review finding #4).
        $this->assertFalse(SIPConf::isValidHostname('_sip._tcp.example.com'));
        $this->assertFalse(SIPConf::isValidHostname('_sips._tcp.foo.bar'));
    }

    public function testIsValidHostnameRejectsStructuralGarbage(): void
    {
        // Strings of only delimiter chars used to pass the old permissive
        // regex (code-review finding #10).
        $this->assertFalse(SIPConf::isValidHostname('::::'));
        $this->assertFalse(SIPConf::isValidHostname('.....'));
        $this->assertFalse(SIPConf::isValidHostname(':::.'));
        $this->assertFalse(SIPConf::isValidHostname('[]:'));
    }

    public function testIsValidHostnameRejectsLabelEdgeHyphen(): void
    {
        // RFC 1123: labels must not start or end with a hyphen.
        $this->assertFalse(SIPConf::isValidHostname('-sip.example.com'));
        $this->assertFalse(SIPConf::isValidHostname('sip-.example.com'));
        $this->assertFalse(SIPConf::isValidHostname('sip.-example.com'));
        $this->assertFalse(SIPConf::isValidHostname('sip.example-.com'));
    }

    public function testIsValidHostnameRejectsControlCharacters(): void
    {
        // Newline / tab / shell-metachar injection.
        $this->assertFalse(SIPConf::isValidHostname("evil.com\n"));
        $this->assertFalse(SIPConf::isValidHostname("evil.com\tfoo"));
        $this->assertFalse(SIPConf::isValidHostname('evil.com;rm -rf /'));
    }

    public function testIsValidHostnameRejectsOverLongInput(): void
    {
        // RFC 1035 maximum hostname length is 253 octets after stripping
        // the canonical trailing dot.
        //
        // Construct 253 chars using ≤63-char labels (per-label cap is
        // also enforced by the regex): 4 × 62-char labels + 3 separators
        // = 251 chars; add ".aa" → 254 chars (rejected), or ".a" → 253
        // (accepted).
        $label62 = str_repeat('a', 62);
        $ok      = "$label62.$label62.$label62.$label62.a";       // 4*62 + 4 = 252
        $tooLong = "$label62.$label62.$label62.$label62.$label62"; // 5*62 + 4 = 314
        $this->assertTrue(SIPConf::isValidHostname($ok));
        $this->assertFalse(SIPConf::isValidHostname($tooLong));
    }

    public function testIsValidHostnameBoundaryAt253Chars(): void
    {
        // Exact RFC 1035 boundary — guards against future off-by-one when
        // the > 253 check is refactored (e.g. accidentally flipped to >= 253).
        // Code-review finding #14.
        $label63 = str_repeat('a', 63);
        $label62 = str_repeat('a', 62);
        // 63 + 1 + 63 + 1 + 63 + 1 + 61 = 253
        $exactly253 = "$label63.$label63.$label63." . str_repeat('a', 61);
        // 63 + 1 + 63 + 1 + 63 + 1 + 62 = 254
        $exactly254 = "$label63.$label63.$label63.$label62";

        $this->assertSame(253, strlen($exactly253));
        $this->assertSame(254, strlen($exactly254));
        $this->assertTrue(SIPConf::isValidHostname($exactly253));
        $this->assertFalse(SIPConf::isValidHostname($exactly254));
    }

    public function testIsValidHostnameRejectsLabelOver63Chars(): void
    {
        // RFC 1035 per-label cap is 63 octets.
        $label64 = str_repeat('a', 64);
        $this->assertFalse(SIPConf::isValidHostname("$label64.io"));
    }

    public function testIsValidHostnameRejectsEmpty(): void
    {
        $this->assertFalse(SIPConf::isValidHostname(''));
        $this->assertFalse(SIPConf::isValidHostname('   '));
        $this->assertFalse(SIPConf::isValidHostname('.'));
        $this->assertFalse(SIPConf::isValidHostname('..'));
    }

    // -----------------------------------------------------------------------
    // isAcceptableAdditionalHost — composite gate enforced by
    // SaveRecordAction::updateAdditionalHosts when ingesting m_SipHosts rows.
    // Must mirror the union: IP/CIDR OR hostname (resolved via cache).
    // -----------------------------------------------------------------------

    public function testIsAcceptableAdditionalHostAcceptsIp(): void
    {
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('203.0.113.10'));
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('203.0.113.0/24'));
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('2001:db8::/64'));
    }

    public function testIsAcceptableAdditionalHostAcceptsHostname(): void
    {
        // The regression that motivated this patch: existing admin-saved
        // hostnames in m_SipHosts must keep working after the round-trip
        // through SaveRecordAction::updateAdditionalHosts.
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('mikoru.mangosip.ru'));
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('sirena2.reconn.ru'));
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('ip.beeline.ru'));
    }

    public function testIsAcceptableAdditionalHostRejectsGarbage(): void
    {
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost(''));
        // Single label — typo more often than legitimate intent.
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('localhost'));
        // Control character / shell-metachar injection.
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost("evil.com\n"));
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('foo bar baz'));
        // Specific code-review regressions — bracketed IPv6, host:port,
        // SRV label, structural garbage.
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('[2001:db8::1]'));
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('sip.example.com:5060'));
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('_sip._tcp.example.com'));
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('::::'));
    }

    public function testIsAcceptableAdditionalHostRejectsWildcardCidr(): void
    {
        // Reviewer-agent finding R6-P1: /0 wildcard collapses identify
        // match= to "trust ALL" and silently disables the source-IP ACL.
        // Reject both IPv4 and IPv6 wildcards explicitly.
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('0.0.0.0/0'));
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost('::/0'));
        // Realistic non-zero prefixes still accepted — admins may
        // legitimately whitelist large blocks (e.g., regional ITSP /24).
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('203.0.113.0/24'));
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('2001:db8::/32'));
        // Boundary: /1 is still extremely permissive (half the address
        // space) but admin-intentional shapes should pass — the gate
        // rejects ONLY /0.
        $this->assertTrue(SIPConf::isAcceptableAdditionalHost('128.0.0.0/1'));
    }

    // -----------------------------------------------------------------------
    // stripIpv6Brackets — shared normalization helper applied by both
    // provider.host and additionalHosts ingest paths (self-review M2).
    // -----------------------------------------------------------------------

    public function testStripIpv6BracketsRemovesSurroundingBrackets(): void
    {
        $this->assertSame(
            '2001:db8::1',
            SIPConf::stripIpv6Brackets('[2001:db8::1]')
        );
    }

    public function testStripIpv6BracketsPreservesUnbrackedValue(): void
    {
        // Bare IPv6, IPv4, hostname — all flow through unchanged.
        $this->assertSame('2001:db8::1', SIPConf::stripIpv6Brackets('2001:db8::1'));
        $this->assertSame('203.0.113.1', SIPConf::stripIpv6Brackets('203.0.113.1'));
        $this->assertSame('sip.example.com', SIPConf::stripIpv6Brackets('sip.example.com'));
    }

    public function testStripIpv6BracketsLeavesUnbalancedPairUntouched(): void
    {
        // Only strip when BOTH `[` at start and `]` at end are present.
        // Half-brackets propagate to the structural gate, which then rejects.
        $this->assertSame('[2001:db8::1', SIPConf::stripIpv6Brackets('[2001:db8::1'));
        $this->assertSame('2001:db8::1]', SIPConf::stripIpv6Brackets('2001:db8::1]'));
    }

    public function testStripIpv6BracketsTrimsWhitespace(): void
    {
        // Admins copy-paste with stray whitespace from SIP URI captures.
        $this->assertSame('2001:db8::1', SIPConf::stripIpv6Brackets('  [2001:db8::1]  '));
    }

    public function testStripIpv6BracketsCompositionWithIsAcceptable(): void
    {
        // The provider.host ingest path is `strip → isAcceptableAdditionalHost`.
        // Document the composition here: bracketed IPv6 is accepted via the
        // pipeline but NOT by isAcceptableAdditionalHost alone (self-review m4).
        $bracketed = '[2001:db8::1]';
        $this->assertFalse(SIPConf::isAcceptableAdditionalHost($bracketed));
        $this->assertTrue(
            SIPConf::isAcceptableAdditionalHost(SIPConf::stripIpv6Brackets($bracketed))
        );
    }

    public function testStripIpv6BracketsEmptyBracketsCollapseToEmpty(): void
    {
        // "[]" should be normalized to "" — downstream gates then reject as
        // empty (provider.host treats "" as INBOUND-only; additionalHosts
        // skips empty rows).
        $this->assertSame('', SIPConf::stripIpv6Brackets('[]'));
    }

    // -----------------------------------------------------------------------
    // flattenBucketsToLegacyShape — IPs-first ordering invariant for the
    // legacy `getSipHosts()` API (reviewer-agent finding R5-4 / H8).
    // 3rd-party modules in /var/www/mikopbx/ depend on this contract.
    // -----------------------------------------------------------------------

    public function testFlattenBucketsLegacyShapeIpsBeforeHostnames(): void
    {
        $buckets = [
            'P1' => [
                'ips'       => ['203.0.113.10', '198.51.100.0/24'],
                'hostnames' => ['sip.example.com'],
            ],
        ];
        $flat = SIPConf::flattenBucketsToLegacyShape($buckets);
        // IPs MUST precede hostnames in the flat list (2026.x ordering
        // contract). Any module sorting / index-based access depends on this.
        $this->assertSame(
            ['203.0.113.10', '198.51.100.0/24', 'sip.example.com'],
            $flat['P1']
        );
    }

    public function testFlattenBucketsLegacyShapeMultipleProviders(): void
    {
        $buckets = [
            'P1' => ['ips' => ['10.0.0.1'],            'hostnames' => []],
            'P2' => ['ips' => [],                       'hostnames' => ['sip.b.com']],
            'P3' => ['ips' => ['2001:db8::1'],         'hostnames' => ['sip.c.com', 'sip.d.com']],
        ];
        $flat = SIPConf::flattenBucketsToLegacyShape($buckets);
        $this->assertSame(['10.0.0.1'], $flat['P1']);
        $this->assertSame(['sip.b.com'], $flat['P2']);
        $this->assertSame(['2001:db8::1', 'sip.c.com', 'sip.d.com'], $flat['P3']);
    }

    public function testFlattenBucketsLegacyShapeEmptyInput(): void
    {
        $this->assertSame([], SIPConf::flattenBucketsToLegacyShape([]));
    }

    public function testFlattenBucketsLegacyShapeMissingInnerKeysAreTolerated(): void
    {
        // Defensive: if a future refactor emits a bucket without `ips` or
        // `hostnames`, the wrapper still returns an empty list for that
        // provider rather than fatal'ing on undefined key.
        $buckets = [
            'P1' => ['ips' => ['10.0.0.1']],            // hostnames missing
            'P2' => ['hostnames' => ['sip.b.com']],     // ips missing
            'P3' => [],                                  // both missing
        ];
        $flat = SIPConf::flattenBucketsToLegacyShape($buckets);
        $this->assertSame(['10.0.0.1'], $flat['P1']);
        $this->assertSame(['sip.b.com'], $flat['P2']);
        $this->assertSame([], $flat['P3']);
    }

    public function testFlattenBucketsLegacyShapePreservesNumericIndex(): void
    {
        // Output values are always 0-indexed contiguous arrays (array_values).
        // Modules iterating with `foreach ($flat[$id] as $i => $addr)` need
        // consistent integer keys starting at 0.
        $buckets = ['P1' => ['ips' => ['a', 'b'], 'hostnames' => ['c']]];
        $flat = SIPConf::flattenBucketsToLegacyShape($buckets);
        $this->assertSame([0, 1, 2], array_keys($flat['P1']));
    }
}
