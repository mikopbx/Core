<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\LicenseV2;

use MikoPBX\Core\System\LicenseV2\EntitlementStore;
use MikoPBX\Core\System\LicenseV2\EntitlementToken;
use MikoPBX\Core\System\LicenseV2\InstallationIdentity;
use MikoPBX\Core\System\LicenseV2\LicenseV2;
use MikoPBX\Core\System\LicenseV2\SeatLedger;
use PHPUnit\Framework\TestCase;

class LicenseV2SeatsTest extends TestCase
{
    private const int NOW = 1_800_000_000;

    private string $dir;
    private int $wallClock = self::NOW;
    private string $serverPrivateKeyPem;
    private string $serverPublicKeyPem;
    private string $licenseKey = 'MIKO-TEST';
    private ?\Closure $metrics = null;
    private array $logged = [];

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/license-v2-seats-' . bin2hex(random_bytes(6));
        mkdir("$this->dir/cf", 0700, true);
        mkdir("$this->dir/tmp", 0700, true);
        $private = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519]);
        // A typed property can not be passed by reference while it is uninitialized (PHP 8.4).
        openssl_pkey_export($private, $privateKeyPem);
        $this->serverPrivateKeyPem = $privateKeyPem;
        $this->serverPublicKeyPem = openssl_pkey_get_details($private)['key'];
    }

    protected function tearDown(): void
    {
        foreach (['cf', 'tmp'] as $sub) {
            array_map('unlink', glob("$this->dir/$sub/*") ?: []);
            rmdir("$this->dir/$sub");
        }
        rmdir($this->dir);
    }

    public function testThirdDeviceIsRefusedWith1051AndSeatFreesAfterTtl(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $a = $license->sessionStart(['username' => 'a'], 60)['session_id'];
        $b = $license->sessionStart(['username' => 'b'], 60)['session_id'];
        $c = $license->sessionStart(['username' => 'c'], 300)['session_id'];
        $this->assertTrue($license->captureFeature('54', $a)['success']);
        $this->assertTrue($license->captureFeature('54', $b)['success']);
        $refused = $license->captureFeature('54', $c);
        $this->assertFalse($refused['success']);
        $this->assertSame(1051, $refused['extcode']);
        $this->wallClock += 65;
        $this->assertSame(1021, $license->captureFeature('54', $a)['extcode']);
        $this->assertTrue($license->captureFeature('54', $c)['success']);
        $this->assertSame(['54' => ['used' => 1, 'limit' => 2]], $license->usageGet()['usage']);
    }

    public function testCaptureWithoutSessionIsTheInstallationCheck(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 1]);
        $this->assertTrue($license->captureFeature('54')['success']);
        $this->assertTrue($license->captureFeature('54')['success'], 'no seat is taken');
        $this->assertSame([], $license->usageGet()['usage']);
        $s = $license->sessionStart([], 60)['session_id'];
        $this->assertSame(2011, $license->captureFeature('99', $s)['extcode']);
    }

    public function testFeatureWithoutSeatsIsGrantedWithoutCounting(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], []);
        $s = $license->sessionStart([], 60)['session_id'];
        $this->assertTrue($license->captureFeature('54', $s)['success']);
        $this->assertSame([], $license->usageGet()['usage']);
    }

    /**
     * Only sessionKeepalive() re-checks the rights, so only it may renew the lease. A client
     * polling captureFeature on a feature without a seat limit must not keep the session — and
     * with it every seat it holds — alive without ever passing that check.
     */
    public function testCaptureOfAFeatureWithoutSeatsDoesNotRenewTheLease(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400, '55' => self::NOW + 86400], ['54' => 1]);
        $s = $license->sessionStart([], 60)['session_id'];
        $this->assertTrue($license->captureFeature('54', $s)['success']);
        $this->wallClock += 50;
        $granted = $license->captureFeature('55', $s);
        $this->assertTrue($granted['success'], 'a feature without a seat limit is still granted');
        $this->assertSame(10, $granted['validttl'], 'validttl is what is left of the lease, not a full ttl');
        $this->wallClock += 15;
        $this->assertSame(1021, $license->sessionKeepalive($s)['extcode'] ?? null, 'the lease was renewed');
    }

    /**
     * The excess must not outlive one TTL: every session over the new limit gives the feature
     * back in the same keepalive round, not one holder per round.
     */
    public function testCutLimitShedsTheWholeExcessInOneKeepaliveRound(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 3]);
        $sessions = [];
        foreach (['a', 'b', 'c'] as $name) {
            $sessions[$name] = $license->sessionStart(['username' => $name], 60)['session_id'];
            $license->captureFeature('54', $sessions[$name]);
            $this->wallClock += 1;
        }
        $this->issue($license, ['54' => self::NOW + 86400], ['54' => 1]);

        $this->assertSame([], $license->sessionKeepalive($sessions['a'])['dropped_features'], 'the oldest keeps it');
        $this->assertSame(['54'], $license->sessionKeepalive($sessions['b'])['dropped_features']);
        $this->assertSame(['54'], $license->sessionKeepalive($sessions['c'])['dropped_features']);
        $this->assertSame(['54' => ['used' => 1, 'limit' => 1]], $license->usageGet()['usage']);
    }

    public function testValidTtlIsCappedByFeatureAndTokenLifetime(): void
    {
        $license = $this->licensed(
            ['54' => self::NOW + 100],
            ['54' => 1],
            exp: self::NOW + 50,
            offlineUntil: self::NOW + 50
        );
        $s = $license->sessionStart([], 300)['session_id'];
        $this->assertSame(50, $license->captureFeature('54', $s)['validttl']);
    }

    public function testKeepaliveDropsFeatureAfterKeyChangeOrLimitCut(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $a = $license->sessionStart([], 60)['session_id'];
        $b = $license->sessionStart([], 60)['session_id'];
        $license->captureFeature('54', $a);
        $this->wallClock += 1;
        $license->captureFeature('54', $b);
        // limit cut to 1: the latest holder loses the feature on keepalive
        $this->issue($license, ['54' => self::NOW + 86400], ['54' => 1]);
        $this->assertSame([], $license->sessionKeepalive($a)['dropped_features']);
        $this->assertSame(['54'], $license->sessionKeepalive($b)['dropped_features']);
        // key change: everything is dropped
        $this->licenseKey = 'MIKO-OTHER';
        $this->assertSame(['54'], $license->sessionKeepalive($a)['dropped_features']);
        $this->assertSame([], $license->usageGet()['usage']);
    }

    public function testReleaseAndEnd(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 1]);
        $a = $license->sessionStart([], 60)['session_id'];
        $license->captureFeature('54', $a);
        $this->assertTrue($license->releaseFeature('54', $a)['success']);
        $this->assertSame([], $license->usageGet()['usage']);
        $this->assertTrue($license->sessionEnd($a)['success']);
        $this->assertSame(1021, $license->sessionKeepalive($a)['extcode']);
    }

    /**
     * The right, the seat limit and the ttl of one call must come from one token: a token replaced
     * by the refresh worker between two reads would otherwise pair an old limit with a new right.
     */
    public function testOneTokenIsReadPerCall(): void
    {
        $store = new class (
            "$this->dir/cf",
            new InstallationIdentity("$this->dir/cf"),
            $this->serverPublicKeyPem,
            fn(): int => $this->wallClock
        ) extends EntitlementStore {
            public int $reads = 0;

            public function lastVerifiedPayload(): ?array
            {
                $this->reads++;
                return parent::lastVerifiedPayload();
            }
        };
        $ledger = new SeatLedger("$this->dir/tmp", fn(): int => $this->wallClock);
        $license = new LicenseV2(
            $store,
            $ledger,
            fn(): string => $this->licenseKey,
            fn(): array => $this->metrics === null ? ['PBXname' => 'MikoPBX@test'] : ($this->metrics)(),
            fn(): string => '2026.3.1',
            function (string $message): void {
                $this->logged[] = $message;
            }
        );
        $features = ['54' => self::NOW + 86400, '55' => self::NOW + 86400];
        $this->issue($license, $features, ['54' => 1, '55' => 1]);
        $s = $license->sessionStart([], 60)['session_id'];
        $license->captureFeature('55', $s);

        $store->reads = 0;
        $this->assertTrue($license->captureFeature('54', $s)['success']);
        $this->assertSame(1, $store->reads, 'capture judges right, limit and ttl on one token');

        $store->reads = 0;
        $this->assertSame([], $license->sessionKeepalive($s)['dropped_features']);
        $this->assertSame(1, $store->reads, 'keepalive of two held features still reads one token');
    }

    public function testOfflineRequestCarriesUsageHoldersAndDailyMetrics(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $a = $license->sessionStart(['username' => 'a'], 300)['session_id'];
        $license->captureFeature('54', $a);

        $first = $this->answerOffline($license);
        $this->assertSame(['54' => ['used' => 1, 'peak' => 1, 'denied' => 0]], $first['request']['usage']);
        $this->assertSame(
            [['ref' => SeatLedger::ref($a), 'features' => ['54'], 'since' => self::NOW, 'username' => 'a']],
            $first['request']['holders']
        );
        $this->assertSame(['PBXname' => 'MikoPBX@test'], $first['request']['metrics']);

        $license->importOfflineToken($first['token']);
        $this->assertArrayNotHasKey('metrics', $this->answerOffline($license)['request']);
        $this->wallClock += 86400;
        $this->assertArrayHasKey('metrics', $this->answerOffline($license)['request']);
    }

    public function testAcceptedAnswerDropsHoldersAndSettlesTheReport(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $a = $license->sessionStart(['username' => 'a'], 300)['session_id'];
        $b = $license->sessionStart(['username' => 'b'], 300)['session_id'];
        $c = $license->sessionStart(['username' => 'c'], 300)['session_id'];
        $license->captureFeature('54', $a);
        $license->captureFeature('54', $b);
        $this->assertSame(1051, $license->captureFeature('54', $c)['extcode']);

        $answer = $this->answerOffline($license, ['drop' => [SeatLedger::ref($a)]]);
        $this->assertSame(1, $answer['request']['usage']['54']['denied']);
        $license->importOfflineToken($answer['token']);

        $this->assertSame(1021, $license->sessionKeepalive($a)['extcode']);
        $this->assertTrue($license->sessionKeepalive($b)['success']);
        $this->assertSame(
            ['54' => ['used' => 1, 'peak' => 1, 'denied' => 0]],
            $this->answerOffline($license)['request']['usage']
        );
    }

    public function testUnansweredRequestKeepsTheReport(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 1]);
        $a = $license->sessionStart([], 300)['session_id'];
        $b = $license->sessionStart([], 300)['session_id'];
        $license->captureFeature('54', $a);
        $license->captureFeature('54', $b);

        $this->answerOffline($license);
        $this->assertSame(
            ['54' => ['used' => 1, 'peak' => 1, 'denied' => 1]],
            $this->answerOffline($license)['request']['usage']
        );
    }

    public function testRefreshIsDueOncePollHasPassedSinceIssue(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $payload = $license->store()->lastVerifiedPayload();
        $this->wallClock += EntitlementToken::POLL_DEFAULT - 1;
        $this->assertFalse($license->refreshDue($payload));
        $this->wallClock += 1;
        $this->assertTrue($license->refreshDue($payload));
        $this->assertTrue($license->refreshDue(null));

        $license->importOfflineToken($this->answerOffline($license, ['poll' => 300])['token']);
        $fast = $license->store()->lastVerifiedPayload();
        $this->wallClock += 299;
        $this->assertFalse($license->refreshDue($fast));
        $this->wallClock += 1;
        $this->assertTrue($license->refreshDue($fast));
    }

    public function testZeroSeatShareRefusesEveryCapture(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 0]);
        $s = $license->sessionStart([], 300)['session_id'];
        $this->assertSame(1051, $license->captureFeature('54', $s)['extcode']);
    }

    public function testBrokenLedgerOrMetricsDoNotBlockTheRequest(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $this->metrics = static fn(): array => throw new \RuntimeException('dmesg is gone');
        file_put_contents("$this->dir/tmp/seats.json", 'not json');

        $answer = $this->answerOffline($license);

        $this->assertArrayNotHasKey('usage', $answer['request']);
        $this->assertArrayNotHasKey('holders', $answer['request']);
        $this->assertArrayNotHasKey('metrics', $answer['request']);
        $this->assertStringContainsString('Seat report left out', implode("\n", $this->logged));
        $this->assertStringContainsString('Metrics left out', implode("\n", $this->logged));
        $license->importOfflineToken($answer['token']);
        $this->assertTrue($license->store()->metricsDue(), 'metrics that never left are still due');
    }

    public function testLegacyMetricsCallSendsNothing(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        // Without the compiled extension __call() would throw: the explicit method is what answers here.
        $license->sendLicenseMetrics($this->licenseKey, ['PBXname' => 'MikoPBX@test']);
        $this->assertSame([], $this->logged);
    }

    /**
     * Plays the licensing cabinet for the closed contour: signs an answer to the exported request.
     *
     * @param array<string, mixed> $extra Answer fields (poll, drop, seats...) over the defaults.
     * @return array{request: array<string, mixed>, token: string}
     */
    private function answerOffline(LicenseV2 $license, array $extra = []): array
    {
        $signed = json_decode($license->exportOfflineRequest(), true);
        $request = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);
        $payload = EntitlementToken::base64UrlEncode((string)json_encode($extra + [
            'v' => EntitlementToken::VERSION,
            'install' => $request['install'],
            'key' => $this->licenseKey,
            'nonce' => $request['nonce'],
            'iat' => $this->wallClock,
            'exp' => $this->wallClock + 180 * 86400,
            'offlineUntil' => $this->wallClock + 180 * 86400,
            'features' => ['54' => $this->wallClock + 365 * 86400],
            'modules' => ['ModuleTest' => 54],
            'seats' => ['54' => 2],
        ]));
        openssl_sign($payload, $signature, $this->serverPrivateKeyPem, 0);
        return ['request' => $request, 'token' => $payload . '.' . EntitlementToken::base64UrlEncode($signature)];
    }

    /**
     * @param array<string, int> $features
     * @param array<string, int> $seats
     */
    private function licensed(array $features, array $seats, ?int $exp = null, ?int $offlineUntil = null): LicenseV2
    {
        $store = new EntitlementStore(
            "$this->dir/cf",
            new InstallationIdentity("$this->dir/cf"),
            $this->serverPublicKeyPem,
            fn(): int => $this->wallClock
        );
        $ledger = new SeatLedger("$this->dir/tmp", fn(): int => $this->wallClock);
        $license = new LicenseV2(
            $store,
            $ledger,
            fn(): string => $this->licenseKey,
            fn(): array => $this->metrics === null ? ['PBXname' => 'MikoPBX@test'] : ($this->metrics)(),
            fn(): string => '2026.3.1',
            function (string $message): void {
                $this->logged[] = $message;
            }
        );
        $this->issue($license, $features, $seats, $exp, $offlineUntil);
        return $license;
    }

    /**
     * @param array<string, int> $features
     * @param array<string, int> $seats
     */
    private function issue(
        LicenseV2 $license,
        array $features,
        array $seats,
        ?int $exp = null,
        ?int $offlineUntil = null
    ): void {
        $store = $license->store();
        $request = $store->buildRequest($this->licenseKey, '2026.3.1');
        $requestPayload = json_decode(EntitlementToken::base64UrlDecode($request['request']), true);
        $fields = [
            'v' => EntitlementToken::VERSION,
            'install' => $requestPayload['install'],
            'key' => $this->licenseKey,
            'nonce' => $requestPayload['nonce'],
            'iat' => $this->wallClock,
            'exp' => $exp ?? $this->wallClock + 7 * 86400,
            'offlineUntil' => $offlineUntil ?? $this->wallClock + 30 * 86400,
            'features' => $features,
            'modules' => ['ModuleTest' => 54],
        ];
        if ($seats !== []) {
            $fields['seats'] = $seats;
        }
        $payload = EntitlementToken::base64UrlEncode((string)json_encode($fields));
        openssl_sign($payload, $signature, $this->serverPrivateKeyPem, 0);
        $store->acceptToken($payload . '.' . EntitlementToken::base64UrlEncode($signature));
    }
}
