<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\LicenseV2;

use MikoPBX\Core\System\LicenseV2\EntitlementStore;
use MikoPBX\Core\System\LicenseV2\EntitlementToken;
use MikoPBX\Core\System\LicenseV2\HostFacts;
use MikoPBX\Core\System\LicenseV2\InstallationIdentity;
use MikoPBX\Core\System\LicenseV2\TokenRejectedException;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Throwable;

class EntitlementStoreTest extends TestCase
{
    private const int NOW = 1_800_000_000;
    private const int DAY = 86400;
    private const string KID = 'testkid1';

    private string $dir;
    private string $serverPrivateKeyPem;
    private string $serverPublicKeyPem;
    private int $wallClock = self::NOW;

    /** @var array<string, string> What HostFacts reads on the test "machine"; a test may swap the board. */
    private array $hardware = [
        'product_uuid' => '4c4c4544-0032-4a10-8047-b2c04f4a4d32', 'board_serial' => 'PF2ABCDE',
        'disk_serial' => 'S3Z9NB0K123456', 'mac' => '52:54:00:12:34:56',
    ];
    private string $environment = 'vm';

    private function host(): HostFacts
    {
        return new HostFacts(fn(): array => ['environment' => $this->environment, 'sources' => $this->hardware]);
    }

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/license-v2-test-' . bin2hex(random_bytes(6));
        mkdir($this->dir, 0700, true);
        [$this->serverPrivateKeyPem, $this->serverPublicKeyPem] = self::newKeyPair();
        $this->wallClock = self::NOW;
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob("$this->dir/*") ?: []);
        rmdir($this->dir);
    }

    public function testValidTokenLicensesOnlyListedFeatures(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));

        $this->assertTrue($store->featureAvailable('54'));
        $this->assertFalse($store->featureAvailable('41'));
    }

    public function testTokenWithSeatsExposesLimits(): void
    {
        $store = $this->newStore();
        $payload = $store->acceptAnswer($this->issueFor($store, ['seats' => ['54' => 2]]));
        $this->assertSame(2, EntitlementToken::seatLimit($payload, '54'));
        $this->assertNull(EntitlementToken::seatLimit($payload, '55'));
    }

    /** @dataProvider malformedSeats */
    public function testMalformedSeatsRejectsTokenAndKeepsPreviousOne(mixed $seats): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $rejected = false;
        try {
            $store->acceptAnswer($this->issueFor($store, ['seats' => $seats]));
        } catch (RuntimeException $e) {
            // Not caught inside the try above: PHPUnit's AssertionFailedError (what $this->fail()
            // throws) extends RuntimeException, so a fail() call inside the try would be
            // silently swallowed by this very catch instead of failing the test.
            $rejected = true;
            $this->assertStringContainsString('seats', $e->getMessage());
        }
        $this->assertTrue($rejected, 'malformed seats accepted');
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testZeroSeatShareIsALimitNotAnAbsence(): void
    {
        $store = $this->newStore();
        $payload = $store->acceptAnswer($this->issueFor($store, ['seats' => ['54' => 0]]));
        $this->assertSame(0, EntitlementToken::seatLimit($payload, '54'));
    }

    public function testPollDefaultsAndDropIsOptional(): void
    {
        $store = $this->newStore();
        $plain = $store->acceptAnswer($this->issueFor($store));
        $this->assertSame(EntitlementToken::POLL_DEFAULT, EntitlementToken::poll($plain));
        $this->assertSame([], EntitlementToken::dropRefs($plain));

        $commanded = $store->acceptAnswer($this->issueFor($store, ['poll' => 900, 'drop' => ['0123456789abcdef']]));
        $this->assertSame(900, EntitlementToken::poll($commanded));
        $this->assertSame(['0123456789abcdef'], EntitlementToken::dropRefs($commanded));
    }

    /** @dataProvider malformedCommands */
    public function testMalformedPollOrDropRejectsTokenAndKeepsPreviousOne(array $overrides, string $field): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $rejected = false;
        try {
            $store->acceptAnswer($this->issueFor($store, $overrides));
        } catch (RuntimeException $e) {
            // See testMalformedSeatsRejectsTokenAndKeepsPreviousOne: no fail() inside this try.
            $rejected = true;
            $this->assertStringContainsString($field, $e->getMessage());
        }
        $this->assertTrue($rejected, "malformed $field accepted");
        $this->assertTrue($store->featureAvailable('54'));
    }

    public static function malformedCommands(): array
    {
        return [
            'poll too short' => [['poll' => 299], 'poll'],
            'poll too long' => [['poll' => 901], 'poll'],
            'poll as string' => [['poll' => '600'], 'poll'],
            'drop is a map' => [['drop' => ['a' => '0123456789abcdef']], 'drop'],
            'drop ref too short' => [['drop' => ['0123']], 'drop'],
            'drop ref upper case' => [['drop' => ['0123456789ABCDEF']], 'drop'],
            'drop ref not a string' => [['drop' => [123]], 'drop'],
            'drop is a scalar' => [['drop' => '0123456789abcdef'], 'drop'],
        ];
    }

    public static function malformedSeats(): array
    {
        return [
            'string' => [['54' => '2']],
            'negative' => [['54' => -1]],
            'float' => [['54' => 1.5]],
            'null' => [['54' => null]],
            'unknown feature' => [['99' => 2]],
            'not a map' => [[2]],
            'scalar' => ['2'],
        ];
    }

    public function testPrivateKeyIsCreatedOwnerOnlyAndReused(): void
    {
        $first = new InstallationIdentity($this->dir);
        $second = new InstallationIdentity($this->dir);

        $this->assertSame($first->getInstallId(), $second->getInstallId());
        $this->assertSame(0600, fileperms("$this->dir/installation-private.pem") & 0777);
    }

    public function testTokenSignedByAnotherKeyIsRejected(): void
    {
        $store = $this->newStore();
        [$foreignPrivateKeyPem] = self::newKeyPair();

        $this->expectExceptionMessage('signature is invalid');
        $store->acceptAnswer($this->issueFor($store, signingKeyPem: $foreignPrivateKeyPem));
    }

    public function testTamperedPayloadIsRejected(): void
    {
        $store = $this->newStore();
        [$payloadPart, $signaturePart] = explode('.', $this->issueFor($store));
        $payload = json_decode(EntitlementToken::base64UrlDecode($payloadPart), true);
        $payload['features']['41'] = self::NOW + 365 * self::DAY;
        $forged = EntitlementToken::base64UrlEncode((string)json_encode($payload)) . '.' . $signaturePart;

        $this->expectExceptionMessage('signature is invalid');
        $store->acceptAnswer($forged);
    }

    public function testTokenOfAnotherInstallationIsRejected(): void
    {
        $store = $this->newStore();

        $this->expectExceptionMessage('another installation');
        $store->acceptAnswer($this->issueFor($store, overrides: ['install' => str_repeat('0', 32)]));
    }

    public function testReplayedAnswerIsRejected(): void
    {
        $store = $this->newStore();
        $oldAnswer = $this->issueFor($store);
        $store->acceptAnswer($oldAnswer);
        $store->buildRequest('MIKO-TEST', '2026.3.1');

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptAnswer($oldAnswer);
    }

    public function testAnswerWithoutPendingRequestIsRejected(): void
    {
        $store = $this->newStore();
        $answer = $this->issueFor($store);
        $store->acceptAnswer($answer);

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptAnswer($answer);
    }

    public function testOnlineRefreshKeepsExportedOfflineRequestValid(): void
    {
        $store = $this->newStore();
        $offlineAnswer = $this->issueFor($store, offline: true);
        $store->buildRequest('MIKO-TEST', '2026.3.1');

        $store->acceptAnswer($offlineAnswer);
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testRepeatedExportKeepsThePendingRequestFileValid(): void
    {
        $store = $this->newStore();
        $carried = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $store->buildRequest('MIKO-TEST', '2026.3.1', true);

        $store->acceptAnswer($this->sign($carried));
        $this->assertTrue($store->featureAvailable('54'));
        $this->assertNotSame(
            self::nonceOf($carried),
            self::nonceOf($store->buildRequest('MIKO-TEST', '2026.3.1', true)),
            'an answered request file is spent, the next export must be a new request'
        );
    }

    public function testExportForAnotherKeyStartsANewRequestFile(): void
    {
        $store = $this->newStore();
        $carried = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $store->buildRequest('MIKO-OTHER', '2026.3.1', true);

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptAnswer($this->sign($carried));
    }

    /**
     * The cabinet answers a known nonce with its saved document: an answer refused for good must not be
     * brought back by every next export of the same request.
     *
     * @dataProvider refusedAnswers
     */
    public function testRefusedAnswerDecidesWhetherTheNextExportIsANewRequest(
        array $overrides,
        bool $replaceBoard,
        bool $newRequest
    ): void {
        $store = $this->newStore();
        $carried = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $hashes = json_decode(EntitlementToken::base64UrlDecode($carried['request']), true)['fingerprint'];
        if ($replaceBoard) {
            $this->hardware['board_serial'] = 'NEWBOARD01';
            $this->hardware['disk_serial'] = 'NEWDISK001';
            $store = $this->newStore();
        }
        try {
            $store->acceptAnswer($this->sign($carried, $overrides + ['fingerprint' => ['k' => 3, 'h' => $hashes]]));
            $this->fail('an unusable answer was accepted');
        } catch (TokenRejectedException) {
        }

        $next = self::nonceOf($store->buildRequest('MIKO-TEST', '2026.3.1', true));
        $this->assertSame($newRequest, $next !== self::nonceOf($carried));
    }

    public static function refusedAnswers(): array
    {
        return [
            'other hardware' => [[], true, true],
            'expired' => [['iat' => self::NOW - 10 * self::DAY, 'exp' => self::NOW - self::DAY], false, true],
            'dated in the future' => [
                ['iat' => self::NOW + 365 * self::DAY, 'exp' => self::NOW + 368 * self::DAY],
                false,
                false,
            ],
        ];
    }

    public function testRefusedAnswerToAnotherRequestKeepsThePendingFile(): void
    {
        $store = $this->newStore();
        $spent = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $store->acceptAnswer($this->sign($spent));
        $pending = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $expired = $this->sign($spent, ['iat' => self::NOW - 10 * self::DAY, 'exp' => self::NOW - self::DAY]);
        try {
            $store->acceptAnswer($expired);
            $this->fail('an answer to a spent request was accepted');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString('does not answer the pending request', $e->getMessage());
        }

        $next = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $this->assertSame(self::nonceOf($pending), self::nonceOf($next));
    }

    public function testEmptyModuleMapIsRejected(): void
    {
        $store = $this->newStore();

        $this->expectExceptionMessage('no module map');
        $store->acceptAnswer($this->issueFor($store, overrides: ['modules' => []]));
    }

    public function testExpiredTokenStopsLicensingButKeepsModuleMap(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $this->wallClock = self::NOW + 4 * self::DAY;

        $this->assertFalse($store->featureAvailable('54'));
        $this->assertSame(['ModuleLdapSync' => '54'], $store->lastVerifiedPayload()['modules']);
    }

    public function testGracePeriodKeepsLicenseWhileServersAreUnreachable(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));

        $this->wallClock = self::NOW + 10 * self::DAY;
        $this->assertTrue($store->featureAvailable('54'));

        $this->wallClock = self::NOW + 31 * self::DAY;
        $this->assertFalse($store->featureAvailable('54'));
    }

    public function testSignedRefusalCancelsGracePeriodUntilNextAcceptedToken(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));
        $this->wallClock = self::NOW + 10 * self::DAY;
        $this->assertTrue($store->featureAvailable('54'));

        $refusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $this->assertSame('Unknown license key', $store->acceptRefusal($refusal));
        $this->assertFalse($store->featureAvailable('54'));

        $store->acceptAnswer($this->issueFor($store, overrides: [
            'iat' => $this->wallClock,
            'exp' => $this->wallClock + 3 * self::DAY,
            'offlineUntil' => $this->wallClock + 30 * self::DAY,
        ]));
        // Past exp, inside the grace period: licensed only if the accepted token has cleared the refusal.
        $this->wallClock += 10 * self::DAY;
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testRefusalSignedByAnotherKeyKeepsGracePeriod(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));
        $this->wallClock = self::NOW + 10 * self::DAY;
        [$foreignPrivateKeyPem] = self::newKeyPair();
        $forged = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), [], $foreignPrivateKeyPem, 'Go away');

        try {
            $store->acceptRefusal($forged);
            $this->fail('A refusal signed by a foreign key must be rejected');
        } catch (RuntimeException) {
        }
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testRefusalPausesRetriesForOnePollInsteadOfHammeringTheServer(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $refusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $store->acceptRefusal($refusal);

        $this->assertFalse($store->retryAllowed(), 'a refused PBX must not retry immediately');

        $this->wallClock += EntitlementToken::POLL_DEFAULT;
        $this->assertTrue($store->retryAllowed());
    }

    public function testReplayedRefusalIsRejected(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));
        $oldRefusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $store->buildRequest('MIKO-TEST', '2026.3.1');

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptRefusal($oldRefusal);
    }

    public function testGracePeriodDoesNotExtendAnExpiredFeature(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, overrides: [
            'offlineUntil' => self::NOW + 30 * self::DAY,
            'features' => ['54' => self::NOW + 5 * self::DAY],
        ]));
        $this->wallClock = self::NOW + 10 * self::DAY;

        $this->assertFalse($store->featureAvailable('54'));
    }

    public function testClockRollbackDoesNotReviveExpiredToken(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $this->wallClock = self::NOW + 4 * self::DAY;
        $this->assertFalse($store->featureAvailable('54'));

        $this->wallClock = self::NOW + 60;
        // A fresh store instance models a reboot with the rolled back clock.
        $this->assertFalse($this->newStore()->featureAvailable('54'));
    }

    public function testServerTimestampPullsSlightlyLaggingClockForward(): void
    {
        $store = $this->newStore();
        $this->wallClock = self::NOW - 120;
        $store->acceptAnswer($this->issueFor($store));

        $this->assertSame(self::NOW, $store->now());
    }

    public function testFutureDatedTokenIsRejectedAndDoesNotMoveTheClock(): void
    {
        $store = $this->newStore();
        $futureToken = $this->issueFor($store, overrides: [
            'iat' => self::NOW + 365 * self::DAY,
            'exp' => self::NOW + 368 * self::DAY,
        ]);

        try {
            $store->acceptAnswer($futureToken);
            $this->fail('A token dated a year ahead must be rejected');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('clock is wrong', $e->getMessage());
        }
        $this->assertSame(self::NOW, $store->now());
        $this->assertNull($store->lastVerifiedPayload());
    }

    public function testRejectedTokenLeavesTheRequestPending(): void
    {
        $store = $this->newStore();
        $signed = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $expired = $this->sign($signed, ['iat' => self::NOW - 10 * self::DAY, 'exp' => self::NOW - self::DAY]);
        $reissued = $this->sign($signed);

        try {
            $store->acceptAnswer($expired);
            $this->fail('An expired token must be rejected');
        } catch (RuntimeException) {
        }
        $store->acceptAnswer($reissued);
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testTokenOfAnotherLicenseKeyLicensesNothing(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));

        $this->assertTrue($store->featureAvailable('54', 'MIKO-TEST'));
        $this->assertFalse($store->featureAvailable('54', 'MIKO-OTHER'));
        $this->assertFalse($store->featureAvailable('54', ''));
    }

    public function testFeatureExpiresIndependentlyOfToken(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, overrides: [
            'exp' => self::NOW + 90 * self::DAY,
            'features' => ['54' => self::NOW + self::DAY],
        ]));
        $this->wallClock = self::NOW + 2 * self::DAY;

        $this->assertFalse($store->featureAvailable('54'));
    }

    public function testRequestIsSignedByInstallationKey(): void
    {
        $store = $this->newStore();
        $identity = new InstallationIdentity($this->dir);
        $signed = $store->buildRequest('MIKO-TEST', '2026.3.1');
        $request = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);

        $this->assertSame($identity->getInstallId(), $request['install']);
        $this->assertSame(1, openssl_verify(
            $signed['request'],
            EntitlementToken::base64UrlDecode($signed['sig']),
            $request['pubkey'],
            0
        ));
    }

    public function testBackoffDoublesWithJitterAndResetsOnSuccess(): void
    {
        $store = $this->newStore();
        $this->assertTrue($store->retryAllowed());
        $first = $store->noteFailure();
        $this->assertGreaterThanOrEqual(225, $first);   // 300 - 25 %
        $this->assertLessThanOrEqual(375, $first);      // 300 + 25 %
        $this->assertFalse($store->retryAllowed());
        $this->wallClock += 400;
        $this->assertTrue($store->retryAllowed());
        $second = $store->noteFailure();
        $this->assertGreaterThanOrEqual(450, $second);
        $this->assertLessThanOrEqual(750, $second);
        for ($i = 0; $i < 10; $i++) {
            $delay = $store->noteFailure();
        }
        $this->assertLessThanOrEqual(EntitlementStore::BACKOFF_MAX * 1.25, $delay);
        $store->acceptAnswer($this->issueFor($store));
        $this->assertTrue($store->retryAllowed());
    }

    public function testEffectiveExpiryCoversGraceAndEndsAtRefusal(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, ['exp' => self::NOW + 100, 'offlineUntil' => self::NOW + 1000]));
        $this->assertSame(self::NOW + 1000, $store->effectiveExpiry('MIKO-TEST'));
        $this->assertSame(0, $store->effectiveExpiry('MIKO-OTHER'));
        $refusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $store->acceptRefusal($refusal);
        // Revoked at once: neither the grace period nor the rest of exp is left.
        $this->assertSame(0, $store->effectiveExpiry('MIKO-TEST'));
    }

    public function testSignedRefusalRevokesTheTokenAtOnce(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $this->assertTrue($store->featureAvailable('54'));

        $store->acceptRefusal($this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'License key is revoked'));

        // Well before exp: a signed "no" takes the license away now, not when the token runs out.
        $this->assertFalse($store->featureAvailable('54'));
        $this->assertSame(0, $store->effectiveExpiry());

        $store->acceptAnswer($this->issueFor($store));
        $this->assertTrue($store->featureAvailable('54'));
    }

    /**
     * Sequential stand-in for the race the lock closes: a refusal answering a request that a newer
     * accepted token has already superseded must not revoke that token.
     */
    public function testStaleRefusalCanNotRevokeANewerToken(): void
    {
        $store = $this->newStore();
        $staleRefusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $store->acceptAnswer($this->issueFor($store));
        $rejected = false;
        try {
            $store->acceptRefusal($staleRefusal);
        } catch (RuntimeException) {
            $rejected = true;
        }
        $this->assertTrue($rejected, 'stale refusal accepted');
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testSecondRoundIsSkippedWhileOneRuns(): void
    {
        $store = $this->newStore();
        // flock() on a second descriptor conflicts even within one process, so this is the two-worker case.
        $inner = $store->exclusiveRound(fn(): mixed => $store->exclusiveRound(fn(): string => 'second'));
        $this->assertNull($inner);
        $this->assertSame('free again', $store->exclusiveRound(fn(): string => 'free again'));
    }

    public function testReportTravelsInsideTheSignedRequest(): void
    {
        $store = $this->newStore();
        $report = [
            'usage' => ['54' => ['used' => 1, 'peak' => 2, 'denied' => 3]],
            'holders' => [['ref' => '0123456789abcdef', 'features' => ['54'], 'since' => self::NOW]],
            'metrics' => ['PBXname' => 'MikoPBX@test'],
        ];
        $signed = $store->buildRequest('MIKO-TEST', '2026.3.1', false, $report);
        $request = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);

        $this->assertSame($report['usage'], $request['usage']);
        $this->assertSame($report['holders'], $request['holders']);
        $this->assertSame($report['metrics'], $request['metrics']);
        $publicKey = (new InstallationIdentity($this->dir))->getPublicKeyPem();
        $this->assertSame(1, openssl_verify($signed['request'], EntitlementToken::base64UrlDecode($signed['sig']), $publicKey, 0));

        // A snapshot that was read and is empty says "nothing held"; a missing one says "unknown" — the
        // server must keep what it knew. So an empty usage travels as {} and empty holders as [].
        $empty = $store->buildRequest('MIKO-TEST', '2026.3.1', false, ['usage' => [], 'holders' => []]);
        $emptyJson = EntitlementToken::base64UrlDecode($empty['request']);
        $this->assertStringContainsString('"usage":{}', $emptyJson);
        $this->assertStringContainsString('"holders":[]', $emptyJson);
        $unknown = $store->buildRequest('MIKO-TEST', '2026.3.1');
        $this->assertArrayNotHasKey('usage', json_decode(EntitlementToken::base64UrlDecode($unknown['request']), true));

        // A feature id that looks like a list index must still travel as an object key.
        $zero = $store->buildRequest('MIKO-TEST', '2026.3.1', false, ['usage' => ['0' => ['used' => 1, 'peak' => 1, 'denied' => 0]]]);
        $this->assertStringContainsString('"usage":{"0":', EntitlementToken::base64UrlDecode($zero['request']));
    }

    public function testMetricsAreDueDailyAndOnlyAnAcceptedAnswerSettlesThem(): void
    {
        $store = $this->newStore();
        $this->assertTrue($store->metricsDue());
        $unanswered = $store->buildRequest('MIKO-TEST', '2026.3.1', false, ['metrics' => ['PBXname' => 'x']]);
        $this->assertTrue($store->metricsDue(), 'a request alone settles nothing');

        $store->acceptAnswer($this->sign($unanswered));
        $this->assertFalse($store->metricsDue());

        $store->acceptAnswer($this->issueFor($store));
        $this->wallClock += self::DAY - 1;
        $this->assertFalse($store->metricsDue(), 'an answer to a request without metrics moves nothing');
        $this->wallClock += 1;
        $this->assertTrue($store->metricsDue());
    }

    public function testConcurrentImportOfTheSameTokenIsAcceptedOnce(): void
    {
        if (!function_exists('pcntl_fork')) {
            $this->markTestSkipped('pcntl is not available');
        }
        $store = new EntitlementStore($this->dir, new InstallationIdentity($this->dir), [self::KID => $this->serverPublicKeyPem]);
        // This store runs on the real wall clock (forked children need a real process, not the
        // fake $wallClock closure), so the token must be dated around the real "now" rather than
        // the fixed self::NOW used everywhere else in this file.
        $token = $this->issueFor($store, ['iat' => time(), 'exp' => time() + 3 * self::DAY], null, true);
        // Both children race for the same nonce instead of serializing one after the other:
        // without this barrier, fork() + a few lines of setup usually spaces them out enough
        // that a lock-less implementation would pass too.
        $go = microtime(true) + 0.05;
        $results = [];
        for ($i = 0; $i < 2; $i++) {
            $pid = pcntl_fork();
            if ($pid === 0) {
                time_sleep_until($go);
                try {
                    $identity = new InstallationIdentity($this->dir);
                    $child = new EntitlementStore($this->dir, $identity, [self::KID => $this->serverPublicKeyPem]);
                    $child->acceptAnswer($token);
                    exit(0);
                } catch (RuntimeException $e) {
                    // The expected loser: the other child spent the nonce first. Any other
                    // RuntimeException (e.g. a lock/write failure) is a real bug, not a race loss.
                    exit(str_contains($e->getMessage(), 'does not answer') ? 1 : 2);
                } catch (Throwable) {
                    // Never let an unexpected error fall through to the child running the
                    // parent's tearDown() against a torn-down or partly-shared fixture.
                    exit(3);
                }
            }
            $results[$pid] = null;
        }
        foreach (array_keys($results) as $pid) {
            pcntl_waitpid($pid, $status);
            $results[$pid] = pcntl_wexitstatus($status);
        }
        sort($results);
        $this->assertSame([0, 1], array_values($results));
    }

    public function testDocumentOfUnknownOrMissingKidIsRejected(): void
    {
        $store = $this->newStore();
        foreach (['otherkid', null] as $kid) {
            try {
                $store->acceptAnswer($this->issueFor($store, ['kid' => $kid]));
                $this->fail('a document without a trusted kid was accepted');
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('unknown key', $e->getMessage());
            }
        }
        $this->assertNull($store->lastVerifiedPayload());
    }

    public function testRotatedKeyIsTrustedByItsOwnKidOnly(): void
    {
        [$newPrivateKeyPem, $newPublicKeyPem] = self::newKeyPair();
        $store = $this->newStore(['testkid2' => $newPublicKeyPem]);
        try {
            // Signed by the new key but naming the old kid: checked against the old key.
            $store->acceptAnswer($this->issueFor($store, ['kid' => self::KID], $newPrivateKeyPem));
            $this->fail('a document verified with the key of another kid');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('signature is invalid', $e->getMessage());
        }
        $store->acceptAnswer($this->issueFor($store, ['kid' => 'testkid2'], $newPrivateKeyPem));
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testRefusalOfUnknownKidRevokesNothing(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $refusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), ['kid' => 'otherkid'], null, 'Go away');
        try {
            $store->acceptRefusal($refusal);
            $this->fail('a refusal without a trusted kid was accepted');
        } catch (RuntimeException) {
        }
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testDocumentWithoutModuleMapLeavesTheDecisionToModuleJson(): void
    {
        $store = $this->newStore();
        $token = $this->issueFor($store);
        // Drop the modules key from the default payload: sign() fills defaults with +, so rebuild the payload.
        $store->acceptAnswer($this->withoutField($token, 'modules'));
        $payload = $store->lastVerifiedPayload();
        $this->assertArrayNotHasKey('modules', $payload);
        $this->assertNull(EntitlementToken::moduleFeature($payload, 'ModuleLdapSync'));
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testModuleFeatureReadsTheSignedMap(): void
    {
        $payload = ['modules' => ['ModuleLdapSync' => '54', 'ModuleFree' => 0]];
        $this->assertSame('54', EntitlementToken::moduleFeature($payload, 'ModuleLdapSync'));
        $this->assertSame('', EntitlementToken::moduleFeature($payload, 'ModuleFree'));
        $this->assertSame('', EntitlementToken::moduleFeature($payload, 'ModuleUnknown'), 'absent from a signed map = free');
    }

    public function testEmptyFeaturesLicenseNothingButAreAccepted(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, ['features' => []]));
        $this->assertNotNull($store->lastVerifiedPayload());
        $this->assertFalse($store->featureAvailable('54'));
    }

    /**
     * @dataProvider malformedFingerprints
     */
    public function testMalformedFingerprintRejectsTheDocument(mixed $fingerprint): void
    {
        $store = $this->newStore();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('malformed fingerprint');
        $store->acceptAnswer($this->issueFor($store, ['fingerprint' => $fingerprint]));
    }

    public static function malformedFingerprints(): array
    {
        $h = ['0123456789abcdef', '1123456789abcdef', '2123456789abcdef'];
        return [
            'not an object' => ['abc'],
            'k missing' => [['h' => $h]],
            'k zero' => [['k' => 0, 'h' => $h]],
            'k too big' => [['k' => 5, 'h' => $h]],
            'h not a list' => [['k' => 3, 'h' => ['a' => '0123456789abcdef']]],
            'h too long' => [['k' => 3, 'h' => array_merge($h, $h)]],
            'bad hash' => [['k' => 3, 'h' => ['0123456789ABCDEF', '1', '2']]],
        ];
    }

    public function testFeaturesThatAreNotAMapRejectTheDocument(): void
    {
        $store = $this->newStore();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('malformed feature map');
        $store->acceptAnswer($this->issueFor($store, ['features' => 'all']));
    }

    public function testFileDocumentBoundToThisHardwareIsAccepted(): void
    {
        $store = $this->newStore();
        $signed = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $hashes = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true)['fingerprint'];
        $store->acceptAnswer($this->sign($signed, ['fingerprint' => ['k' => 3, 'h' => $hashes]]));
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testFileDocumentOfOtherHardwareIsRejected(): void
    {
        $store = $this->newStore();
        $signed = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $hashes = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true)['fingerprint'];
        // Board and disk replaced after the request: two of four still match, k = 3 needs three.
        $this->hardware['board_serial'] = 'NEWBOARD01';
        $this->hardware['disk_serial'] = 'NEWDISK001';
        $replaced = $this->newStore();
        try {
            $replaced->acceptAnswer($this->sign($signed, ['fingerprint' => ['k' => 3, 'h' => $hashes]]));
            $this->fail('a document of other hardware was accepted');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('other hardware', $e->getMessage());
        }
        $this->assertNull($replaced->lastVerifiedPayload());
        // The rejected document did not spend the nonce: a document for this hardware still answers it.
        $replaced->acceptAnswer($this->sign($signed));
        $this->assertTrue($replaced->featureAvailable('54'));
    }

    public function testStaleDocumentOfOtherHardwareDoesNotAnswerThePendingRequest(): void
    {
        $store = $this->newStore();
        $signed = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $store->acceptAnswer($this->sign($signed));
        $foreign = ['k' => 3, 'h' => ['0123456789abcdef', '1123456789abcdef', '2123456789abcdef']];

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptAnswer($this->sign($signed, ['fingerprint' => $foreign]));
    }

    public function testBoundFileDocumentLicensesOnlyWhileTheHardwareMatches(): void
    {
        $store = $this->newStore();
        $this->acceptBoundFileDocument($store);
        $this->assertTrue($store->recheckHardware());
        $this->assertTrue($store->featureAvailable('54'));

        // The disk was cloned to other hardware after the import: two of four sources changed, k = 3.
        $original = $this->hardware;
        $this->hardware['board_serial'] = 'NEWBOARD01';
        $this->hardware['disk_serial'] = 'NEWDISK001';
        $moved = $this->newStore();
        $this->assertFalse($moved->recheckHardware());
        $this->assertFalse($moved->featureAvailable('54'));
        $this->assertSame(0, $moved->effectiveExpiry());

        $this->hardware = $original;
        $back = $this->newStore();
        $this->assertTrue($back->recheckHardware());
        $this->assertTrue($back->featureAvailable('54'));
        $this->assertGreaterThan(self::NOW, $back->effectiveExpiry());
    }

    public function testNewDocumentIsNotBlockedByTheHardwareFlagOfAnOlderOne(): void
    {
        $store = $this->newStore();
        $bound = $this->acceptBoundFileDocument($store);
        $this->hardware['board_serial'] = 'NEWBOARD01';
        $this->hardware['disk_serial'] = 'NEWDISK001';
        $moved = $this->newStore();
        $this->assertFalse($moved->recheckHardware());

        // An online document carries no fingerprint: licensed at once, no recheck needed.
        $moved->acceptAnswer($this->issueFor($moved));
        $this->assertTrue($moved->featureAvailable('54'));
        $this->assertGreaterThan(self::NOW, $moved->effectiveExpiry());

        // Even a flag left behind for the older document blocks nothing but that document.
        $state = json_decode((string)file_get_contents("$this->dir/state.json"), true);
        file_put_contents("$this->dir/state.json", json_encode(['foreignHardware' => $bound['nonce']] + $state));
        $this->assertTrue($moved->featureAvailable('54'));
    }

    public function testFileDocumentWithoutFingerprintIsNotChecked(): void
    {
        // A container or a VM without DMI sends fewer than three hashes: the server leaves the field out.
        $this->hardware = [];
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store, [], null, true));
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testSignedRefusalOfAFileRequestRevokesTheDocument(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $refusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1', true), [], null, 'Offline mode is not allowed');
        $this->assertTrue(EntitlementToken::isRefusal($refusal));
        $this->assertSame('Offline mode is not allowed', $store->acceptRefusal($refusal));
        $this->assertFalse($store->featureAvailable('54'));
        $this->assertFalse(EntitlementToken::isRefusal($this->issueFor($store)));
    }

    public function testRefusalAnsweringNoPendingNonceIsARejectedTokenNotAServerError(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        // A refusal answering a request no longer pending (already answered, or never sent): the REST
        // route must turn this into a 400 ("your document"), not a 500 ("our failure").
        $stale = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $store->acceptAnswer($this->issueFor($store));

        try {
            $store->acceptRefusal($stale);
            $this->fail('a refusal answering no pending nonce was accepted');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString('does not answer the pending request', $e->getMessage());
        }
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testOfflineSlotRefusalRevokesButLeavesTheOnlineBackoffAlone(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $offlineRequest = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $refusal = $this->sign($offlineRequest, [], null, 'Offline mode is not allowed');

        $this->assertSame('Offline mode is not allowed', $store->acceptRefusal($refusal));
        $this->assertFalse($store->featureAvailable('54'));
        $this->assertTrue($store->retryAllowed(), 'an offline-slot refusal must not arm the online backoff');
    }

    /**
     * Mirrors SignedRequest::parse of the server (plan 1): a request it would refuse costs the PBX an
     * unsigned 403 on every round.
     */
    public function testRequestMatchesTheServerContract(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        foreach ([false, true] as $offline) {
            $signed = $store->buildRequest('MIKO-TEST', '2026.3.1', $offline, ['usage' => [], 'usageGen' => '0123456789abcdef', 'holders' => []]);
            $r = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);
            $this->assertSame(2, $r['v']);
            $this->assertSame($offline ? 'offline' : 'online', $r['purpose']);
            $this->assertMatchesRegularExpression('/^[0-9a-f]{32}$/', $r['nonce']);
            $this->assertMatchesRegularExpression('/^[0-9a-f]{32}$/', $r['held']);
            $this->assertIsInt($r['ts']);
            $this->assertSame(['id' => 'mikopbx', 'version' => '2026.3.1'], $r['app']);
            $this->assertSame('vm', $r['environment']);
            $this->assertCount(4, $r['fingerprint']);
            $this->assertSame('0123456789abcdef', $r['usageGen']);
            $this->assertArrayNotHasKey('pbx', $r);
            $this->assertArrayNotHasKey('holdersComplete', $r, 'a complete snapshot says nothing');
            if ($offline) {
                $this->assertArrayNotHasKey('seq', $r);
            } else {
                $this->assertIsInt($r['seq']);
                $this->assertGreaterThanOrEqual(1, $r['seq']);
            }
        }
    }

    public function testHeldIsTheNonceOfTheStoredDocument(): void
    {
        $store = $this->newStore();
        $first = json_decode(EntitlementToken::base64UrlDecode($store->buildRequest('MIKO-TEST', '2026.3.1')['request']), true);
        $this->assertArrayNotHasKey('held', $first, 'nothing held before the first document');
        $store->acceptAnswer($this->issueFor($store));
        $heldNonce = $store->lastVerifiedPayload()['nonce'];
        $next = json_decode(EntitlementToken::base64UrlDecode($store->buildRequest('MIKO-TEST', '2026.3.1')['request']), true);
        $this->assertSame($heldNonce, $next['held']);
    }

    public function testNothingIsHeldAfterASignedRefusal(): void
    {
        $store = $this->newStore();
        $store->acceptAnswer($this->issueFor($store));
        $store->acceptRefusal($this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'License key is revoked'));
        $next = json_decode(EntitlementToken::base64UrlDecode($store->buildRequest('MIKO-TEST', '2026.3.1')['request']), true);
        $this->assertArrayNotHasKey('held', $next, 'the refused document is not held any more');
    }

    public function testSeqGrowsByOneWithEveryOnlineRequestOnly(): void
    {
        $store = $this->newStore();
        $seq = static fn(array $signed): ?int => json_decode(EntitlementToken::base64UrlDecode($signed['request']), true)['seq'] ?? null;
        $this->assertSame(1, $seq($store->buildRequest('MIKO-TEST', '2026.3.1')));
        $this->assertNull($seq($store->buildRequest('MIKO-TEST', '2026.3.1', true)));
        $this->assertSame(2, $seq($store->buildRequest('MIKO-TEST', '2026.3.1')));
        $this->assertSame(3, $seq($this->newStore()->buildRequest('MIKO-TEST', '2026.3.1')), 'kept across processes');
    }

    public function testSeqRecoversAfterTheStateIsLost(): void
    {
        $store = $this->newStore();
        $store->buildRequest('MIKO-TEST', '2026.3.1');
        file_put_contents("$this->dir/state.json", 'not json');
        $seq = static fn(array $signed): int => json_decode(EntitlementToken::base64UrlDecode($signed['request']), true)['seq'];
        $this->assertSame(1, $seq($store->buildRequest('MIKO-TEST', '2026.3.1')), 'the server answers this with 409 replay');
        $store->reanchorSeq();
        $this->assertGreaterThan(self::NOW, $seq($store->buildRequest('MIKO-TEST', '2026.3.1')));
    }

    public function testEmptyVersionStillSendsAVersion(): void
    {
        $r = json_decode(EntitlementToken::base64UrlDecode($this->newStore()->buildRequest('MIKO-TEST', '')['request']), true);
        $this->assertSame('unknown', $r['app']['version']);
    }

    public function testHoldersAreCutToTheBodyBudget(): void
    {
        $holder = static fn(int $i): array => ['ref' => sprintf('%016x', $i), 'features' => ['54'], 'since' => self::NOW,
            'hostname' => str_repeat('h', 900)];
        $report = [
            'usage' => [], 'usageGen' => '0123456789abcdef',
            'holders' => array_map($holder, range(1, 1000)),
            'metrics' => ['blob' => str_repeat('m', 900_000)],
        ];
        $signed = $this->newStore()->buildRequest('MIKO-TEST', '2026.3.1', false, $report);
        $r = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);

        $this->assertLessThanOrEqual(EntitlementStore::BODY_BUDGET, strlen((string)json_encode($signed)));
        $this->assertFalse($r['holdersComplete']);
        $this->assertNotEmpty($r['holders']);
        $this->assertLessThan(1000, count($r['holders']));
        $this->assertSame($report['holders'][0], $r['holders'][0], 'cut from the tail');
        $this->assertSame($report['metrics'], $r['metrics']);
    }

    /**
     * @param array<string, string> $extraKeys More trusted server keys by kid (key rotation).
     */
    private function newStore(array $extraKeys = []): EntitlementStore
    {
        return new EntitlementStore(
            $this->dir,
            new InstallationIdentity($this->dir),
            [self::KID => $this->serverPublicKeyPem] + $extraKeys,
            fn(): int => $this->wallClock,
            $this->host()
        );
    }

    /**
     * Plays the licensing cabinet: a file document bound to the hardware the request was built on.
     *
     * @return array<string, mixed> The accepted payload.
     */
    private function acceptBoundFileDocument(EntitlementStore $store): array
    {
        $signed = $store->buildRequest('MIKO-TEST', '2026.3.1', true);
        $hashes = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true)['fingerprint'];
        return $store->acceptAnswer($this->sign($signed, ['fingerprint' => ['k' => 3, 'h' => $hashes]]));
    }

    /**
     * Plays the licensing server: answers the pending request of the store.
     *
     * @param array<string, mixed> $overrides
     */
    private function issueFor(
        EntitlementStore $store,
        array $overrides = [],
        ?string $signingKeyPem = null,
        bool $offline = false
    ): string {
        return $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1', $offline), $overrides, $signingKeyPem);
    }

    /** @param array{request: string, sig: string} $signed */
    private static function nonceOf(array $signed): string
    {
        return json_decode(EntitlementToken::base64UrlDecode($signed['request']), true)['nonce'];
    }

    /**
     * @param array{request: string, sig: string} $signed
     * @param array<string, mixed> $overrides
     */
    private function sign(
        array $signed,
        array $overrides = [],
        ?string $signingKeyPem = null,
        ?string $refusal = null
    ): string {
        $request = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);
        if ($refusal !== null) {
            $overrides += ['refused' => true, 'error' => $refusal];
        }
        $payloadPart = EntitlementToken::base64UrlEncode((string)json_encode($overrides + [
            'v' => EntitlementToken::VERSION,
            'kid' => self::KID,
            'install' => $request['install'],
            'key' => $request['key'],
            'nonce' => $request['nonce'],
            'iat' => self::NOW,
            'exp' => self::NOW + 3 * self::DAY,
            'features' => ['54' => self::NOW + 365 * self::DAY],
            'modules' => ['ModuleLdapSync' => '54'],
        ]));
        openssl_sign($payloadPart, $signature, $signingKeyPem ?? $this->serverPrivateKeyPem, 0);
        return $payloadPart . '.' . EntitlementToken::base64UrlEncode($signature);
    }

    /**
     * Re-signs a token without one payload field: sign() fills defaults with +, so a field can not be
     * removed through its overrides.
     */
    private function withoutField(string $token, string $field): string
    {
        $payload = json_decode(EntitlementToken::base64UrlDecode(explode('.', $token)[0]), true);
        unset($payload[$field]);
        $payloadPart = EntitlementToken::base64UrlEncode((string)json_encode($payload));
        openssl_sign($payloadPart, $signature, $this->serverPrivateKeyPem, 0);
        return $payloadPart . '.' . EntitlementToken::base64UrlEncode($signature);
    }

    /**
     * @return array{0: string, 1: string} Private and public PEM.
     */
    private static function newKeyPair(): array
    {
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519]);
        openssl_pkey_export($key, $privateKeyPem);
        return [$privateKeyPem, openssl_pkey_get_details($key)['key']];
    }
}
