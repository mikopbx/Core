<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\LicenseV2;

use MikoPBX\Core\System\LicenseV2\EntitlementStore;
use MikoPBX\Core\System\LicenseV2\EntitlementToken;
use MikoPBX\Core\System\LicenseV2\HostFacts;
use MikoPBX\Core\System\LicenseV2\InstallationIdentity;
use MikoPBX\Core\System\LicenseV2\LicenseV2;
use MikoPBX\Core\System\LicenseV2\SeatLedger;
use MikoPBX\Core\System\LicenseV2\TokenRejectedException;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\RequestInterface;

class LicenseV2SeatsTest extends TestCase
{
    private const int NOW = 1_800_000_000;
    private const string KID = 'testkid1';

    private string $dir;
    private int $wallClock = self::NOW;
    private string $serverPrivateKeyPem;
    private string $serverPublicKeyPem;
    private string $licenseKey = 'MIKO-TEST';
    private ?\Closure $metrics = null;
    private array $logged = [];
    /** @var array<int, callable> What the licensing server answers, one entry per request. */
    private array $serverAnswers = [];
    /** @var array<int, string> What PbxSettings::LICENSE_V2_SERVER_URL would list. */
    private array $serverUrls = ['https://issuer.test'];

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
            [self::KID => $this->serverPublicKeyPem],
            fn(): int => $this->wallClock,
            new HostFacts(fn(): array => ['environment' => 'vm', 'sources' => []])
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
        $this->assertMatchesRegularExpression('/^[0-9a-f]{16}$/', $first['request']['usageGen']);

        $license->importOfflineToken($first['token']);
        $this->assertArrayNotHasKey('metrics', $this->answerOffline($license)['request']);
        $this->wallClock += 86400;
        $this->assertArrayHasKey('metrics', $this->answerOffline($license)['request']);
    }

    public function testAcceptedAnswerDropsHoldersAndResetsThePeak(): void
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
            ['54' => ['used' => 1, 'peak' => 1, 'denied' => 1]],
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
        $this->assertArrayNotHasKey('usageGen', $answer['request']);
        $this->assertArrayNotHasKey('holders', $answer['request']);
        $this->assertArrayNotHasKey('metrics', $answer['request']);
        $this->assertStringContainsString('Seat report left out', implode("\n", $this->logged));
        $this->assertStringContainsString('Metrics left out', implode("\n", $this->logged));
        $license->importOfflineToken($answer['token']);
        $this->assertTrue($license->store()->metricsDue(), 'metrics that never left are still due');
    }

    public function testNoRoundWithoutALicenseKey(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $this->licenseKey = '';
        // Returns before the server list is read from PbxSettings: no settings are needed here.
        $this->assertFalse($license->refresh(true));
    }

    public function testNoRequestFileWithoutALicenseKey(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $this->licenseKey = '';
        $this->expectException(TokenRejectedException::class);
        $this->expectExceptionMessage('Set the license key');
        $license->exportOfflineRequest();
    }

    public function testReplayReanchorsTheSeqAndAsksTheSameServerOnceMore(): void
    {
        $sent = [];
        $this->serverAnswers = [
            function (RequestInterface $request) use (&$sent): Response {
                return $this->replay($request, $sent);
            },
            function (RequestInterface $request) use (&$sent): Response {
                $sent[] = $fields = self::requestFields($request);
                return new Response(200, [], (string)json_encode(['token' => $this->signed([
                    'v' => EntitlementToken::VERSION, 'kid' => self::KID, 'install' => $fields['install'],
                    'key' => $this->licenseKey, 'nonce' => $fields['nonce'], 'iat' => $this->wallClock,
                    'exp' => $this->wallClock + 7 * 86400, 'features' => ['54' => $this->wallClock + 86400],
                ])]));
            },
        ];
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);

        $this->assertTrue($license->refresh(true), 'a single server must not leave the PBX in the backoff');
        $this->assertCount(2, $sent);
        $this->assertGreaterThan(self::NOW, $sent[1]['seq'], 'the retry goes above the re-anchored seq');
        $this->assertStringContainsString('failed: HTTP 409', implode("\n", $this->logged));
        $this->assertTrue($license->store()->retryAllowed());
    }

    public function testReplayIsRetriedOnlyOnce(): void
    {
        $sent = [];
        $this->serverAnswers = array_fill(0, 3, function (RequestInterface $request) use (&$sent): Response {
            return $this->replay($request, $sent);
        });
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);

        $this->assertFalse($license->refresh(true));
        $this->assertCount(2, $sent);
        $this->assertFalse($license->store()->retryAllowed(), 'the round failed: backoff');
    }

    /**
     * #1191: the boot round may run before the network is up; its failure must not delay the worker's round.
     */
    public function testBootRoundFailureDoesNotArmTheBackoff(): void
    {
        $this->serverAnswers = [static fn(): Response => new Response(503)];
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);

        $this->assertFalse($license->refresh(true, false));
        $this->assertTrue($license->store()->retryAllowed(), 'the worker asks again without waiting out a backoff');
        $this->assertStringContainsString('the worker asks again', implode("\n", $this->logged));
    }

    /**
     * The signed request carries the license key, the holders and the metrics: it goes to an https
     * server only. A redirect is any proxy's trick to move it elsewhere, so it is a failed server, not a hop.
     */
    public function testOnlyHttpsServersAreAskedAndRedirectsAreNotFollowed(): void
    {
        $sent = [];
        $this->serverUrls = ['http://issuer.test', 'https://issuer.test'];
        $this->serverAnswers = [
            function (RequestInterface $request) use (&$sent): Response {
                $sent[] = (string)$request->getUri();
                return new Response(302, ['Location' => 'https://elsewhere.test/entitlement']);
            },
        ];
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);

        $this->assertFalse($license->refresh(true));
        $this->assertSame(['https://issuer.test/entitlement'], $sent, 'http:// is never asked, 302 is not followed');
        $log = implode("\n", $this->logged);
        $this->assertStringContainsString('http://issuer.test is skipped', $log);
        $this->assertStringContainsString('failed: HTTP 302', $log);
    }

    public function testLegacyMetricsCallSendsNothing(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        // Without the compiled extension __call() would throw: the explicit method is what answers here.
        $license->sendLicenseMetrics($this->licenseKey, ['PBXname' => 'MikoPBX@test']);
        $this->assertSame([], $this->logged);
    }

    public function testImportedRefusalRevokesAndSaysWhy(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $signed = json_decode($license->exportOfflineRequest(), true);
        $request = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);
        $payload = EntitlementToken::base64UrlEncode((string)json_encode([
            'v' => EntitlementToken::VERSION, 'kid' => self::KID, 'install' => $request['install'],
            'nonce' => $request['nonce'], 'refused' => true, 'error' => 'Installation was forgotten', 'code' => 1063,
        ]));
        openssl_sign($payload, $signature, $this->serverPrivateKeyPem, 0);
        try {
            $license->importOfflineToken($payload . '.' . EntitlementToken::base64UrlEncode($signature));
            $this->fail('a refusal was imported as a document');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString('Installation was forgotten', $e->getMessage());
        }
        $this->assertFalse($license->featureAvailable('54')['success']);
    }

    public function testReimportingTheSameRefusalIsARejectedTokenNotAServerError(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $signed = json_decode($license->exportOfflineRequest(), true);
        $request = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);
        $payload = EntitlementToken::base64UrlEncode((string)json_encode([
            'v' => EntitlementToken::VERSION, 'kid' => self::KID, 'install' => $request['install'],
            'nonce' => $request['nonce'], 'refused' => true, 'error' => 'Installation was forgotten', 'code' => 1063,
        ]));
        openssl_sign($payload, $signature, $this->serverPrivateKeyPem, 0);
        $refusalFile = $payload . '.' . EntitlementToken::base64UrlEncode($signature);

        try {
            $license->importOfflineToken($refusalFile);
            $this->fail('a refusal was imported as a document');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString('Installation was forgotten', $e->getMessage());
        }
        $this->assertFalse($license->featureAvailable('54')['success']);

        // The same file, imported again (e.g. a double click, or a REST retry): the nonce is spent, so
        // this must land as a 400 (TokenRejectedException), not an uncaught RuntimeException (500).
        try {
            $license->importOfflineToken($refusalFile);
            $this->fail('a re-imported refusal was accepted');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString('does not answer the pending request', $e->getMessage());
        }
        $this->assertFalse($license->featureAvailable('54')['success']);
    }

    public function testCabinetAnswerFileWithADocumentIsImported(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $answer = $this->answerOffline($license, ['poll' => 300]);
        // Saved by a Windows editor: a BOM in front, CRLF at the end.
        $license->importOfflineToken(
            "\xEF\xBB\xBF" . json_encode(['token' => $answer['token']], JSON_UNESCAPED_SLASHES) . "\r\n"
        );

        $payload = $license->store()->lastVerifiedPayload();
        $this->assertSame($answer['request']['nonce'], $payload['nonce']);
        $this->assertSame(300, $payload['poll']);
    }

    public function testFileCanNotAnswerTheOnlineRequest(): void
    {
        $sent = [];
        $this->serverAnswers = [
            function (RequestInterface $request) use (&$sent): Response {
                $sent[] = self::requestFields($request);
                return new Response(503);
            },
        ];
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $this->assertFalse($license->refresh(true));
        // A withheld online answer, imported later as a file: the online request is judged by the wall
        // clock, so taking it from a file would let a rolled back clock accept an expired answer.
        $onlineAnswer = $this->signed([
            'v' => EntitlementToken::VERSION, 'kid' => self::KID, 'install' => $sent[0]['install'],
            'key' => $this->licenseKey, 'nonce' => $sent[0]['nonce'], 'iat' => $this->wallClock,
            'exp' => $this->wallClock + 7 * 86400, 'features' => ['54' => $this->wallClock + 86400],
        ]);

        $this->expectException(TokenRejectedException::class);
        $this->expectExceptionMessage('does not answer the pending request');
        $license->importOfflineToken($onlineAnswer);
    }

    public function testCabinetAnswerFileWithARefusalRevokesAndSaysWhy(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $signed = json_decode($license->exportOfflineRequest(), true);
        $request = json_decode(EntitlementToken::base64UrlDecode($signed['request']), true);
        $payload = EntitlementToken::base64UrlEncode((string)json_encode([
            'v' => EntitlementToken::VERSION, 'kid' => self::KID, 'install' => $request['install'],
            'nonce' => $request['nonce'], 'refused' => true, 'error' => 'Installation was forgotten', 'code' => 1063,
        ]));
        openssl_sign($payload, $signature, $this->serverPrivateKeyPem, 0);
        $refusalFile = (string)json_encode([
            'error' => 'Installation was forgotten',
            'refusal' => $payload . '.' . EntitlementToken::base64UrlEncode($signature),
        ], JSON_UNESCAPED_SLASHES);

        try {
            $license->importOfflineToken($refusalFile);
            $this->fail('a refusal file was imported as a document');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString(
                'Refused by the licensing server: Installation was forgotten',
                $e->getMessage()
            );
        }
        $this->assertFalse($license->featureAvailable('54')['success']);
    }

    /**
     * @dataProvider notALicenseFile
     */
    public function testAnythingElseIsRejectedAndChangesNothing(string $file): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $license->exportOfflineRequest();

        try {
            $license->importOfflineToken($file);
            $this->fail('a file without a token was imported');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString('Not a license file', $e->getMessage());
        }
        $this->assertTrue($license->featureAvailable('54')['success']);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function notALicenseFile(): array
    {
        return [
            'the request file uploaded by mistake' => ['{"request":"eyJ2IjoyfQ","sig":"AAAA"}'],
            'a server error without a refusal' => ['{"error":"Server is busy","code":"busy"}'],
            'a token that is not a string' => ['{"token":123}'],
            'a broken answer file' => ['{"token":"eyJ2Ijoy'],
            'a JSON string' => ['"eyJ2Ijoy.AAAA"'],
            'an empty JSON array' => ['[]'],
        ];
    }

    public function testInputOverTheSizeLimitIsRejectedBeforeAnyDecoding(): void
    {
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);
        $answer = $this->answerOffline($license, ['poll' => 300]);
        $file = (string)json_encode(['token' => $answer['token']], JSON_UNESCAPED_SLASHES);

        try {
            // Trailing spaces keep the answer valid: without the limit it would be imported.
            $license->importOfflineToken(str_pad($file, LicenseV2::IMPORT_MAX_BYTES + 1));
            $this->fail('a file over the size limit was imported');
        } catch (TokenRejectedException $e) {
            $this->assertStringContainsString('Not a license file: larger than', $e->getMessage());
        }
        $this->assertArrayNotHasKey('poll', $license->store()->lastVerifiedPayload());

        $license->importOfflineToken(str_pad($file, LicenseV2::IMPORT_MAX_BYTES));
        $this->assertSame(300, $license->store()->lastVerifiedPayload()['poll']);
    }

    /**
     * The online answer gets the same cap as the imported file: a hostile or broken server must not
     * make the worker decode an answer of any size. Over the cap it is a failed server, not a refusal.
     */
    public function testOnlineAnswerOverTheSizeLimitIsAFailedServer(): void
    {
        $answer = function (RequestInterface $request, int $length): Response {
            $fields = self::requestFields($request);
            $token = $this->signed([
                'v' => EntitlementToken::VERSION, 'kid' => self::KID, 'install' => $fields['install'],
                'key' => $this->licenseKey, 'nonce' => $fields['nonce'], 'iat' => $this->wallClock,
                'exp' => $this->wallClock + 7 * 86400, 'features' => ['54' => $this->wallClock + 86400],
                'poll' => 300,
            ]);
            // Trailing spaces keep the answer valid JSON: without the cap it would be accepted.
            return new Response(200, [], str_pad((string)json_encode(['token' => $token]), $length));
        };
        $this->serverAnswers = [
            fn(RequestInterface $request): Response => $answer($request, LicenseV2::IMPORT_MAX_BYTES + 1),
            fn(RequestInterface $request): Response => $answer($request, LicenseV2::IMPORT_MAX_BYTES),
        ];
        $license = $this->licensed(['54' => self::NOW + 86400], ['54' => 2]);

        $this->assertFalse($license->refresh(true));
        $this->assertStringContainsString('larger than ' . LicenseV2::IMPORT_MAX_BYTES, implode("\n", $this->logged));
        $this->assertArrayNotHasKey('poll', $license->store()->lastVerifiedPayload());
        $this->assertTrue($license->refresh(true), 'an answer within the cap is accepted');
        $this->assertSame(300, $license->store()->lastVerifiedPayload()['poll']);
    }

    /**
     * @param array<int, array<string, mixed>> $sent
     */
    private function replay(RequestInterface $request, array &$sent): Response
    {
        $sent[] = self::requestFields($request);
        return new Response(409, [], '{"code":"replay"}');
    }

    /**
     * @return array<string, mixed> What the PBX signed.
     */
    private static function requestFields(RequestInterface $request): array
    {
        $body = json_decode((string)$request->getBody(), true);
        return json_decode(EntitlementToken::base64UrlDecode($body['request']), true);
    }

    /**
     * @param array<string, mixed> $fields
     */
    private function signed(array $fields): string
    {
        $payload = EntitlementToken::base64UrlEncode((string)json_encode($fields));
        openssl_sign($payload, $signature, $this->serverPrivateKeyPem, 0);
        return $payload . '.' . EntitlementToken::base64UrlEncode($signature);
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
            'kid' => self::KID,
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
            [self::KID => $this->serverPublicKeyPem],
            fn(): int => $this->wallClock,
            new HostFacts(fn(): array => ['environment' => 'vm', 'sources' => []])
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
            },
            new Client(['handler' => HandlerStack::create(new MockHandler($this->serverAnswers))]),
            fn(): array => $this->serverUrls
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
            'kid' => self::KID,
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
        $store->acceptAnswer($payload . '.' . EntitlementToken::base64UrlEncode($signature));
    }
}
