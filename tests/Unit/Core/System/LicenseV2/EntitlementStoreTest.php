<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\LicenseV2;

use MikoPBX\Core\System\LicenseV2\EntitlementStore;
use MikoPBX\Core\System\LicenseV2\EntitlementToken;
use MikoPBX\Core\System\LicenseV2\InstallationIdentity;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Throwable;

class EntitlementStoreTest extends TestCase
{
    private const int NOW = 1_800_000_000;
    private const int DAY = 86400;

    private string $dir;
    private string $serverPrivateKeyPem;
    private string $serverPublicKeyPem;
    private int $wallClock = self::NOW;

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
        $store->acceptToken($this->issueFor($store));

        $this->assertTrue($store->featureAvailable('54'));
        $this->assertFalse($store->featureAvailable('41'));
    }

    public function testTokenWithSeatsExposesLimits(): void
    {
        $store = $this->newStore();
        $payload = $store->acceptToken($this->issueFor($store, ['seats' => ['54' => 2]]));
        $this->assertSame(2, EntitlementToken::seatLimit($payload, '54'));
        $this->assertNull(EntitlementToken::seatLimit($payload, '55'));
    }

    /** @dataProvider malformedSeats */
    public function testMalformedSeatsRejectsTokenAndKeepsPreviousOne(mixed $seats): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store));
        $rejected = false;
        try {
            $store->acceptToken($this->issueFor($store, ['seats' => $seats]));
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

    public static function malformedSeats(): array
    {
        return [
            'string' => [['54' => '2']],
            'zero' => [['54' => 0]],
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
        $store->acceptToken($this->issueFor($store, signingKeyPem: $foreignPrivateKeyPem));
    }

    public function testTamperedPayloadIsRejected(): void
    {
        $store = $this->newStore();
        [$payloadPart, $signaturePart] = explode('.', $this->issueFor($store));
        $payload = json_decode(EntitlementToken::base64UrlDecode($payloadPart), true);
        $payload['features']['41'] = self::NOW + 365 * self::DAY;
        $forged = EntitlementToken::base64UrlEncode((string)json_encode($payload)) . '.' . $signaturePart;

        $this->expectExceptionMessage('signature is invalid');
        $store->acceptToken($forged);
    }

    public function testTokenOfAnotherInstallationIsRejected(): void
    {
        $store = $this->newStore();

        $this->expectExceptionMessage('another installation');
        $store->acceptToken($this->issueFor($store, overrides: ['install' => str_repeat('0', 32)]));
    }

    public function testReplayedAnswerIsRejected(): void
    {
        $store = $this->newStore();
        $oldAnswer = $this->issueFor($store);
        $store->acceptToken($oldAnswer);
        $store->buildRequest('MIKO-TEST', '2026.3.1');

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptToken($oldAnswer);
    }

    public function testAnswerWithoutPendingRequestIsRejected(): void
    {
        $store = $this->newStore();
        $answer = $this->issueFor($store);
        $store->acceptToken($answer);

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptToken($answer);
    }

    public function testOnlineRefreshKeepsExportedOfflineRequestValid(): void
    {
        $store = $this->newStore();
        $offlineAnswer = $this->issueFor($store, offline: true);
        $store->buildRequest('MIKO-TEST', '2026.3.1');

        $store->acceptToken($offlineAnswer);
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testEmptyModuleMapIsRejected(): void
    {
        $store = $this->newStore();

        $this->expectExceptionMessage('no module map');
        $store->acceptToken($this->issueFor($store, overrides: ['modules' => []]));
    }

    public function testExpiredTokenStopsLicensingButKeepsModuleMap(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store));
        $this->wallClock = self::NOW + 4 * self::DAY;

        $this->assertFalse($store->featureAvailable('54'));
        $this->assertSame(['ModuleLdapSync' => '54'], $store->lastVerifiedPayload()['modules']);
    }

    public function testGracePeriodKeepsLicenseWhileServersAreUnreachable(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));

        $this->wallClock = self::NOW + 10 * self::DAY;
        $this->assertTrue($store->featureAvailable('54'));

        $this->wallClock = self::NOW + 31 * self::DAY;
        $this->assertFalse($store->featureAvailable('54'));
    }

    public function testSignedRefusalCancelsGracePeriodUntilNextAcceptedToken(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));
        $this->wallClock = self::NOW + 10 * self::DAY;
        $this->assertTrue($store->featureAvailable('54'));

        $refusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $this->assertSame('"Unknown license key"', $store->acceptRefusal($refusal));
        $this->assertFalse($store->featureAvailable('54'));

        $store->acceptToken($this->issueFor($store, overrides: [
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
        $store->acceptToken($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));
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

    public function testReplayedRefusalIsRejected(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store, overrides: ['offlineUntil' => self::NOW + 30 * self::DAY]));
        $oldRefusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $store->buildRequest('MIKO-TEST', '2026.3.1');

        $this->expectExceptionMessage('does not answer the pending request');
        $store->acceptRefusal($oldRefusal);
    }

    public function testGracePeriodDoesNotExtendAnExpiredFeature(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store, overrides: [
            'offlineUntil' => self::NOW + 30 * self::DAY,
            'features' => ['54' => self::NOW + 5 * self::DAY],
        ]));
        $this->wallClock = self::NOW + 10 * self::DAY;

        $this->assertFalse($store->featureAvailable('54'));
    }

    public function testClockRollbackDoesNotReviveExpiredToken(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store));
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
        $store->acceptToken($this->issueFor($store));

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
            $store->acceptToken($futureToken);
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
            $store->acceptToken($expired);
            $this->fail('An expired token must be rejected');
        } catch (RuntimeException) {
        }
        $store->acceptToken($reissued);
        $this->assertTrue($store->featureAvailable('54'));
    }

    public function testTokenOfAnotherLicenseKeyLicensesNothing(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store));

        $this->assertTrue($store->featureAvailable('54', 'MIKO-TEST'));
        $this->assertFalse($store->featureAvailable('54', 'MIKO-OTHER'));
        $this->assertFalse($store->featureAvailable('54', ''));
    }

    public function testFeatureExpiresIndependentlyOfToken(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store, overrides: [
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
        $store->acceptToken($this->issueFor($store));
        $this->assertTrue($store->retryAllowed());
    }

    public function testEffectiveExpiryCoversGraceUntilRefusal(): void
    {
        $store = $this->newStore();
        $store->acceptToken($this->issueFor($store, ['exp' => self::NOW + 100, 'offlineUntil' => self::NOW + 1000]));
        $this->assertSame(self::NOW + 1000, $store->effectiveExpiry('MIKO-TEST'));
        $this->assertSame(0, $store->effectiveExpiry('MIKO-OTHER'));
        $refusal = $this->sign($store->buildRequest('MIKO-TEST', '2026.3.1'), refusal: 'Unknown license key');
        $store->acceptRefusal($refusal);
        $this->assertSame(self::NOW + 100, $store->effectiveExpiry('MIKO-TEST'));
    }

    public function testConcurrentImportOfTheSameTokenIsAcceptedOnce(): void
    {
        if (!function_exists('pcntl_fork')) {
            $this->markTestSkipped('pcntl is not available');
        }
        $store = new EntitlementStore($this->dir, new InstallationIdentity($this->dir), $this->serverPublicKeyPem);
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
                    $child = new EntitlementStore($this->dir, $identity, $this->serverPublicKeyPem);
                    $child->acceptToken($token);
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

    private function newStore(): EntitlementStore
    {
        return new EntitlementStore(
            $this->dir,
            new InstallationIdentity($this->dir),
            $this->serverPublicKeyPem,
            fn(): int => $this->wallClock
        );
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
     * @return array{0: string, 1: string} Private and public PEM.
     */
    private static function newKeyPair(): array
    {
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519]);
        openssl_pkey_export($key, $privateKeyPem);
        return [$privateKeyPem, openssl_pkey_get_details($key)['key']];
    }
}
