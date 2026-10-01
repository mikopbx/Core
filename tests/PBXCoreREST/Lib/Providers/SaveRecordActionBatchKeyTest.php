<?php

declare(strict_types=1);

namespace MikoPBX\Tests\PBXCoreREST\Lib\Providers;

use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\PBXCoreREST\Lib\Providers\SaveRecordAction;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the batch-key build/demux helpers in SaveRecordAction.
 *
 * The `\x1f` (ASCII US) separator is load-bearing for correct attribution
 * of DNS resolveBatch results back to their parent hostname. A regression
 * here (e.g. switching to a printable delimiter, or loosening
 * isValidHostname to admit the separator) would silently mis-attribute
 * SRV / A / AAAA results across providers — producing cross-provider IP
 * trust bleed in pjsip identify match=. Reviewer-agent finding R5-5 / B1.
 */
class SaveRecordActionBatchKeyTest extends TestCase
{
    public function testSeparatorIsAsciiUnitSeparator(): void
    {
        // Pin the constant to its documented byte value. If anyone changes
        // it to a printable character that could appear in a hostname or
        // SRV target, this assertion fires before review.
        $this->assertSame("\x1f", SaveRecordAction::WARMUP_BATCH_KEY_SEPARATOR);
    }

    public function testSeparatorIsRejectedByValidHostname(): void
    {
        // Defensive cross-check: the separator must NEVER pass hostname
        // validation, otherwise a malicious hostname could collide with
        // the batch-key scheme. isValidHostname's LDH-only regex enforces
        // this implicitly — assert it explicitly.
        $this->assertFalse(SIPConf::isValidHostname("evil\x1f.example.com"));
        $this->assertFalse(SIPConf::isValidHostname("evil.example.com\x1f"));
        $this->assertFalse(SIPConf::isValidHostname("\x1f"));
    }

    public function testBuildBatchKeyRoundTripsSimpleTag(): void
    {
        $key = SaveRecordAction::buildBatchKey('sip.example.com', 'udp');
        $this->assertSame("sip.example.com\x1fudp", $key);
        $this->assertSame('sip.example.com', SaveRecordAction::demuxBatchKey($key));
    }

    public function testBuildBatchKeyRoundTripsMultipleTags(): void
    {
        // Stage-2a target+type composition: host + target + 'A'.
        $key = SaveRecordAction::buildBatchKey(
            'sip.example.com',
            'target.cdn.example.net',
            'A'
        );
        $this->assertSame(
            "sip.example.com\x1ftarget.cdn.example.net\x1fA",
            $key
        );
        // demux must still return the FIRST segment as the hostKey, not
        // the target or the type tag.
        $this->assertSame(
            'sip.example.com',
            SaveRecordAction::demuxBatchKey($key)
        );
    }

    public function testDemuxBatchKeyEmptyOnMissingSeparator(): void
    {
        // A key not built by buildBatchKey (no \x1f) is treated as malformed
        // — return '' so the calling loop's `if ($host === '') continue;`
        // safely skips it instead of mis-attributing to a non-existent host.
        $this->assertSame('', SaveRecordAction::demuxBatchKey('plain.example.com'));
        $this->assertSame('', SaveRecordAction::demuxBatchKey(''));
    }

    public function testDemuxBatchKeyEmptyHostkeyIsRepresentable(): void
    {
        // Edge: build with empty hostKey produces a leading separator.
        // demux returns '' (the empty prefix), which the caller treats
        // as malformed and skips. Symmetric and safe.
        $key = SaveRecordAction::buildBatchKey('', 'A');
        $this->assertSame("\x1fA", $key);
        $this->assertSame('', SaveRecordAction::demuxBatchKey($key));
    }

    public function testBuildBatchKeyWithNoTags(): void
    {
        // No tags → just the hostKey. demux returns '' because no
        // separator is present. Documents the call-site contract: every
        // useful call must include at least one tag.
        $this->assertSame('host.example.com', SaveRecordAction::buildBatchKey('host.example.com'));
        $this->assertSame('', SaveRecordAction::demuxBatchKey('host.example.com'));
    }

    public function testCrossProviderCollisionAvoidance(): void
    {
        // Two distinct hosts produce distinct keys for the same tag set.
        // If a future refactor uses a delimiter that can appear in a
        // legal hostname (e.g. '.'), keys would collide and one host's
        // results would be misattributed to another. This test pins the
        // anti-collision guarantee for the LDH range.
        $keyA = SaveRecordAction::buildBatchKey('sip.a.example.com', 'udp');
        $keyB = SaveRecordAction::buildBatchKey('sip.b.example.com', 'udp');
        $this->assertNotSame($keyA, $keyB);
        $this->assertSame('sip.a.example.com', SaveRecordAction::demuxBatchKey($keyA));
        $this->assertSame('sip.b.example.com', SaveRecordAction::demuxBatchKey($keyB));
    }
}
