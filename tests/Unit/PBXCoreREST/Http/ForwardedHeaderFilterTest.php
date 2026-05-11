<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Http;

use MikoPBX\PBXCoreREST\Http\ForwardedHeaderFilter;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Regression coverage for {@see ForwardedHeaderFilter} — the policy
 * gateway between Phalcon's Request and the Redis-backed worker queue.
 *
 * Behaviours under test:
 *  (1) Authorization / Cookie / Authentication-* are stripped
 *      unconditionally — they must never reach a worker action.
 *  (2) Public-safe proxy / client metadata in the allow-list passes
 *      through (X-Forwarded-For, User-Agent, …).
 *  (3) `X-Mikopbx-*` and `X-Module-*` namespace prefixes are honoured
 *      so future core / module headers carry through without re-edits.
 *  (4) Header names are lowercased so action code reads consistent keys.
 *  (5) Array-typed Phalcon values are joined per RFC 7230 §3.2.2.
 *  (6) Empty values are dropped (no key with empty string in output).
 *  (7) Per-value cap of 1024 bytes protects the queue from pathological
 *      clients (X-Forwarded-For can grow unbounded behind a long chain).
 *  (8) Headers that match neither allow nor prefix are dropped.
 *  (9) Deny-list takes precedence over allow-list / prefix (defence in
 *      depth — a misconfigured prefix entry cannot leak Authorization).
 */
class ForwardedHeaderFilterTest extends AbstractUnitTest
{
    public function testForwardsAllowListedHeaders(): void
    {
        $out = ForwardedHeaderFilter::filter([
            'X-Forwarded-For' => '203.0.113.7',
            'X-Real-IP'       => '203.0.113.7',
            'User-Agent'      => 'cs-firewall-bouncer/0.0.30',
            'Referer'         => 'https://pbx.example.com/firewall',
            'Accept-Language' => 'ru-RU,ru;q=0.9',
        ]);

        $this->assertSame('203.0.113.7', $out['x-forwarded-for']);
        $this->assertSame('203.0.113.7', $out['x-real-ip']);
        $this->assertSame('cs-firewall-bouncer/0.0.30', $out['user-agent']);
        $this->assertSame('https://pbx.example.com/firewall', $out['referer']);
        $this->assertSame('ru-RU,ru;q=0.9', $out['accept-language']);
    }

    public function testStripsAuthorizationAndCookies(): void
    {
        $out = ForwardedHeaderFilter::filter([
            'Authorization' => 'Bearer eyJhbGciOi…',
            'Cookie'        => 'refreshToken=secret123',
            'Set-Cookie'    => 'session=other',
        ]);

        $this->assertArrayNotHasKey('authorization', $out, 'Bearer token must never reach worker');
        $this->assertArrayNotHasKey('cookie', $out, 'Cookie header must never reach worker');
        $this->assertArrayNotHasKey('set-cookie', $out);
        $this->assertSame([], $out, 'No allow-listed keys → output must be empty');
    }

    public function testStripsAuthenticationFamily(): void
    {
        // RFC-defined Authentication-Info and friends should not leak
        // session state to workers even if some endpoint sets them.
        $out = ForwardedHeaderFilter::filter([
            'Authentication-Info'  => 'nextnonce="…"',
            'Authentication-Token' => 'abc',
            'Proxy-Authorization'  => 'Basic …',
        ]);

        $this->assertSame([], $out);
    }

    public function testHonoursMikopbxNamespacePrefix(): void
    {
        $out = ForwardedHeaderFilter::filter([
            'X-Mikopbx-Debug-Trace' => 'on',
            'X-Mikopbx-Async-Id'    => 'channel-1',
        ]);

        $this->assertSame('on', $out['x-mikopbx-debug-trace']);
        $this->assertSame('channel-1', $out['x-mikopbx-async-id']);
    }

    public function testHonoursModuleNamespacePrefix(): void
    {
        $out = ForwardedHeaderFilter::filter([
            'X-Module-Foo-Flag'  => '1',
            'X-Module-Bar-Token' => 'opaque-string',
        ]);

        $this->assertSame('1', $out['x-module-foo-flag']);
        $this->assertSame('opaque-string', $out['x-module-bar-token']);
    }

    public function testDropsUnknownHeaders(): void
    {
        // Headers neither in allow-list nor in any allowed prefix
        // must be silently dropped — the policy is opt-in, not opt-out.
        $out = ForwardedHeaderFilter::filter([
            'X-Custom-Internal' => 'value',
            'DNT'               => '1',
            'Sec-Ch-Ua'         => '"Chrome";v="120"',
        ]);

        $this->assertSame([], $out);
    }

    public function testHeaderNamesAreLowercased(): void
    {
        // Phalcon may return mixed-case names depending on the SAPI;
        // actions should not have to second-guess casing.
        $out = ForwardedHeaderFilter::filter([
            'X-FORWARDED-FOR' => '1.2.3.4',
            'user-agent'      => 'curl/8.4.0',
        ]);

        $this->assertArrayHasKey('x-forwarded-for', $out);
        $this->assertArrayHasKey('user-agent', $out);
        $this->assertArrayNotHasKey('X-FORWARDED-FOR', $out);
    }

    public function testArrayValuesAreJoinedPerRfc7230(): void
    {
        // Phalcon represents repeated headers as an array. We join
        // with ", " per RFC 7230 §3.2.2 so actions see a canonical
        // single string.
        $out = ForwardedHeaderFilter::filter([
            'X-Forwarded-For' => ['203.0.113.7', '198.51.100.1', '10.0.0.1'],
        ]);

        $this->assertSame('203.0.113.7, 198.51.100.1, 10.0.0.1', $out['x-forwarded-for']);
    }

    public function testEmptyValuesAreDropped(): void
    {
        // An empty header value would force action code to write
        // `?? '' ?: null` everywhere — drop it at the gateway instead.
        $out = ForwardedHeaderFilter::filter([
            'X-Forwarded-For' => '',
            'X-Real-IP'       => '203.0.113.7',
        ]);

        $this->assertArrayNotHasKey('x-forwarded-for', $out);
        $this->assertSame('203.0.113.7', $out['x-real-ip']);
    }

    public function testValueLengthIsCapped(): void
    {
        $longChain = str_repeat('1.2.3.4, ', 200); // > 1024 chars
        $out = ForwardedHeaderFilter::filter([
            'X-Forwarded-For' => $longChain,
        ]);

        $this->assertSame(
            ForwardedHeaderFilter::MAX_VALUE_LENGTH,
            strlen($out['x-forwarded-for']),
            'Value must be truncated to MAX_VALUE_LENGTH to bound queue payload'
        );
    }

    public function testDenyListWinsOverAllowPrefixCollision(): void
    {
        // Defence in depth: even if a future maintainer accidentally
        // adds `authorization` somewhere in the allow path, the
        // deny-list strips it. We synthesise the collision by feeding
        // a header that would also match an allow-prefix if the prefix
        // were broader — and assert the deny-list still wins for the
        // canonical sensitive name.
        $out = ForwardedHeaderFilter::filter([
            'authorization' => 'Bearer xxx',
            'Authorization' => 'Bearer yyy',
        ]);

        $this->assertSame([], $out);
    }

    public function testStripsXApiKey(): void
    {
        // `X-Api-Key` is the CrowdSec / cs-firewall-bouncer convention and
        // carries the SAME secret as `Authorization: Bearer`. It must
        // therefore receive the same deny-list treatment — otherwise the
        // bouncer token would leak into the worker queue payload.
        $out = ForwardedHeaderFilter::filter([
            'X-Api-Key'  => '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            'x-api-key'  => 'lowercase-variant',
            'X-Real-IP'  => '203.0.113.7',
        ]);

        $this->assertArrayNotHasKey('x-api-key', $out, 'X-Api-Key must never reach worker');
        $this->assertSame('203.0.113.7', $out['x-real-ip'], 'Unrelated allow-listed headers still pass through');
    }
}
