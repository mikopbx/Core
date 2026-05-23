<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

declare(strict_types=1);

namespace MikoPBX\Tests\Core\Utilities;

use MikoPBX\Core\Utilities\DnsResolver;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Fixture-based unit tests for the DnsResolver parsers. We do NOT spawn
 * real nslookup processes here — that path is exercised by the boffart
 * end-to-end and depends on a live resolver. Instead we capture realistic
 * BusyBox and GNU nslookup stdout strings and feed them to the parser
 * methods, asserting structural correctness, deduplication, the SRV
 * targets cap, and the Server-line skip heuristic.
 */
class DnsResolverTest extends AbstractUnitTest
{
    // -----------------------------------------------------------------------
    // parseAddressOutput — A records
    // -----------------------------------------------------------------------

    public function testParseAddressOutputBusyBoxSingleIpv4(): void
    {
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

Non-authoritative answer:
Name:	sip-2.novofon.ru
Address: 37.139.38.236
TXT;
        $this->assertSame(['37.139.38.236'], DnsResolver::parseAddressOutput($stdout, isIpv6: false));
    }

    public function testParseAddressOutputBusyBoxMultipleIpv4(): void
    {
        // Real Novofon answer for `sip.novofon.ru` — multiple A records
        // returned in one Address: block. The first Address (127.0.0.1:53)
        // is the Server line and must NOT appear in the result.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

Non-authoritative answer:
Name:	sip.novofon.ru
Address: 37.139.38.131
Address: 37.139.38.236
Address: 37.139.38.237
TXT;
        $this->assertSame(
            ['37.139.38.131', '37.139.38.236', '37.139.38.237'],
            DnsResolver::parseAddressOutput($stdout, isIpv6: false)
        );
    }

    public function testParseAddressOutputServerLineIsSkipped(): void
    {
        // The Address that immediately follows a Server line is the
        // resolver itself, never the answer. Drop it.
        $stdout = <<<TXT
Server:		1.1.1.1
Address:	1.1.1.1#53

Name:	example.com
Address: 93.184.216.34
TXT;
        $this->assertSame(['93.184.216.34'], DnsResolver::parseAddressOutput($stdout, isIpv6: false));
    }

    public function testParseAddressOutputBusyBoxStripsPortSuffix(): void
    {
        // BusyBox sometimes prints "<ip>#<port>" for both the Server line
        // and answer lines. The parser must strip the port before
        // validating with IpAddressHelper.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1#53

Name:	host.example
Address: 198.51.100.7#53
TXT;
        $this->assertSame(['198.51.100.7'], DnsResolver::parseAddressOutput($stdout, isIpv6: false));
    }

    public function testParseAddressOutputDeduplicatesIdenticalIps(): void
    {
        // Pathological resolver returning the same IP twice — we keep one.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

Name:	example.com
Address: 10.0.0.1
Address: 10.0.0.1
TXT;
        $this->assertSame(['10.0.0.1'], DnsResolver::parseAddressOutput($stdout, isIpv6: false));
    }

    public function testParseAddressOutputIpv4FiltersOutIpv6(): void
    {
        // Mixed-family answer should not pollute an A-record query.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

Name:	dual.example
Address: 10.0.0.1
Address: 2001:db8::1
TXT;
        $this->assertSame(['10.0.0.1'], DnsResolver::parseAddressOutput($stdout, isIpv6: false));
    }

    public function testParseAddressOutputIpv6FiltersOutIpv4(): void
    {
        // NOTE: 2001:db8::1 is the RFC 3849 documentation prefix — used here
        // as a syntactically valid IPv6 the PARSER must accept. It is
        // explicitly rejected by IpAddressHelper::isGlobalUnicast() further
        // down the pipeline, so this address can never reach pjsip.conf.
        // The parser layer intentionally does not duplicate that filter.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

Name:	dual.example
Address: 10.0.0.1
Address: 2001:db8::1
TXT;
        $this->assertSame(['2001:db8::1'], DnsResolver::parseAddressOutput($stdout, isIpv6: true));
    }

    public function testParseAddressOutputEmptyOnNoAnswer(): void
    {
        // NXDOMAIN / no-result output — Server line only, no Name/Address pair.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

** server can't find missing.example: NXDOMAIN
TXT;
        $this->assertSame([], DnsResolver::parseAddressOutput($stdout, isIpv6: false));
    }

    public function testParseAddressOutputEmptyStringReturnsEmpty(): void
    {
        $this->assertSame([], DnsResolver::parseAddressOutput('', isIpv6: false));
        $this->assertSame([], DnsResolver::parseAddressOutput('', isIpv6: true));
    }

    public function testParseAddressOutputGarbageReturnsEmpty(): void
    {
        // Defensive: anything that does not match the Address regex is ignored.
        $stdout = "not a valid nslookup output\nrandom text\nAddress: not-an-ip\n";
        $this->assertSame([], DnsResolver::parseAddressOutput($stdout, isIpv6: false));
    }

    // -----------------------------------------------------------------------
    // parseSrvOutput — SRV records
    // -----------------------------------------------------------------------

    public function testParseSrvOutputBusyBoxRealNovofon(): void
    {
        // Real `nslookup -type=SRV _sip._udp.sip.novofon.ru` answer.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

Non-authoritative answer:
_sip._udp.sip.novofon.ru	service = 3 5 5060 sip-4.novofon.ru
_sip._udp.sip.novofon.ru	service = 2 5 5060 sip-2.novofon.ru
_sip._udp.sip.novofon.ru	service = 1 5 5060 sip-3.novofon.ru
TXT;
        $targets = DnsResolver::parseSrvOutput($stdout);
        sort($targets);
        $this->assertSame(['sip-2.novofon.ru', 'sip-3.novofon.ru', 'sip-4.novofon.ru'], $targets);
    }

    public function testParseSrvOutputGnuSrvKeyword(): void
    {
        // Some GNU-flavored nslookup builds print `srv = ...` instead of
        // `service = ...` — both must be accepted.
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

_sip._tcp.example.com	srv = 10 100 5060 sip1.example.com.
_sip._tcp.example.com	srv = 20 100 5060 sip2.example.com.
TXT;
        $targets = DnsResolver::parseSrvOutput($stdout);
        sort($targets);
        $this->assertSame(['sip1.example.com', 'sip2.example.com'], $targets);
    }

    public function testParseSrvOutputStripsTrailingFqdnDot(): void
    {
        $stdout = "_sip._udp.example.com\tservice = 0 0 5060 sip.example.com.\n";
        $this->assertSame(['sip.example.com'], DnsResolver::parseSrvOutput($stdout));
    }

    public function testParseSrvOutputLowercasesTargets(): void
    {
        // SRV target names from upstream may carry case; we canonicalise so
        // downstream normalizeHostnameKey lookups always agree.
        $stdout = "_sip._udp.example.com\tservice = 0 0 5060 SIP.Example.Com.\n";
        $this->assertSame(['sip.example.com'], DnsResolver::parseSrvOutput($stdout));
    }

    public function testParseSrvOutputDeduplicatesAcrossLines(): void
    {
        // Two priority levels pointing at the same target — keep one entry.
        $stdout = <<<TXT
_sip._udp.example.com	service = 10 100 5060 sip1.example.com.
_sip._udp.example.com	service = 20 100 5060 sip1.example.com.
TXT;
        $this->assertSame(['sip1.example.com'], DnsResolver::parseSrvOutput($stdout));
    }

    public function testParseSrvOutputCapsAtMaxTargets(): void
    {
        // Build a fake SRV answer with 25 distinct targets; verify the cap
        // (private const MAX_SRV_TARGETS_PER_QUERY = 10) takes effect.
        $lines = [];
        for ($i = 0; $i < 25; $i++) {
            $lines[] = "_sip._udp.example.com\tservice = $i 100 5060 sip$i.example.com.";
        }
        $stdout = implode("\n", $lines);
        $targets = DnsResolver::parseSrvOutput($stdout);
        $this->assertCount(10, $targets, 'MAX_SRV_TARGETS_PER_QUERY cap must hold');
    }

    public function testParseSrvOutputEmptyOnNoSrvRecords(): void
    {
        $stdout = <<<TXT
Server:		127.0.0.1
Address:	127.0.0.1:53

** server can't find _sip._udp.missing.example: NXDOMAIN
TXT;
        $this->assertSame([], DnsResolver::parseSrvOutput($stdout));
    }

    public function testParseSrvOutputEmptyStringReturnsEmpty(): void
    {
        $this->assertSame([], DnsResolver::parseSrvOutput(''));
    }

    public function testParseSrvOutputIgnoresMalformedLines(): void
    {
        // Line that LOOKS like an SRV record but is missing the three
        // numeric weight/priority/port fields must NOT be parsed as a target.
        $stdout = "_sip._udp.example.com\tservice = sip-broken.example.com.\n";
        $this->assertSame([], DnsResolver::parseSrvOutput($stdout));
    }

    // -----------------------------------------------------------------------
    // resolveBatch — zero-budget short-circuit (code-review finding #11).
    // -----------------------------------------------------------------------

    public function testResolveBatchZeroBudgetShortCircuitsBeforeSpawn(): void
    {
        // Self-review m5: callers pass 0 once their shared deadline is gone.
        // resolveBatch must NOT fork/exec any nslookup children — it should
        // return immediately with empty results per query key. We can't
        // observe the absence of fork directly, but we can observe the
        // wall-clock cost: with N=10 queries and 0 budget the call should
        // complete in well under 100ms (a real spawn+kill cycle would
        // easily push past that on macOS/Linux).
        $queries = [];
        for ($i = 0; $i < 10; $i++) {
            $queries["q$i"] = ['type' => 'A', 'name' => "host$i.test.invalid"];
        }
        $start = microtime(true);
        $results = DnsResolver::resolveBatch($queries, 0);
        $elapsed = microtime(true) - $start;

        $this->assertLessThan(
            0.1,
            $elapsed,
            'Zero-budget resolveBatch should short-circuit before any spawn'
        );
        $this->assertCount(10, $results, 'Result keyed by all input keys');
        foreach ($queries as $key => $_) {
            $this->assertSame([], $results[$key], "Empty result for $key");
        }
    }

    public function testResolveBatchEmptyQueriesReturnsEmpty(): void
    {
        // Pre-existing guard, regression-protected.
        $this->assertSame([], DnsResolver::resolveBatch([], 5));
        $this->assertSame([], DnsResolver::resolveBatch([], 0));
    }
}
