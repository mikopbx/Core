<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\LicenseV2;

use MikoPBX\Core\System\LicenseV2\HostFacts;
use PHPUnit\Framework\TestCase;

class HostFactsTest extends TestCase
{
    private const string INSTALL = '0123456789abcdef0123456789abcdef';

    private function facts(array $sources, string $environment = 'vm'): HostFacts
    {
        return new HostFacts(static fn(): array => ['environment' => $environment, 'sources' => $sources]);
    }

    public function testHashIsBoundToInstallNameAndValue(): void
    {
        $hashes = $this->facts(['product_uuid' => 'ABCD-1234'])->fingerprint(self::INSTALL);
        $this->assertSame([substr(hash('sha256', self::INSTALL . '|product_uuid|abcd-1234'), 0, 16)], $hashes);
        $this->assertNotSame($hashes, $this->facts(['product_uuid' => 'ABCD-1234'])->fingerprint(str_repeat('f', 32)));
        $this->assertNotSame($hashes, $this->facts(['board_serial' => 'ABCD-1234'])->fingerprint(self::INSTALL));
    }

    /**
     * @dataProvider placeholders
     */
    public function testPlaceholdersAreNotSent(string $value): void
    {
        $this->assertSame([], $this->facts(['board_serial' => $value])->fingerprint(self::INSTALL));
    }

    public static function placeholders(): array
    {
        return [
            'empty' => [''], 'blank' => ['   '], 'oem' => ['To be filled by O.E.M.'], 'default' => ['Default string'],
            'none' => ['None'], 'digits' => ['0123456789'], 'zero uuid' => ['00000000-0000-0000-0000-000000000000'],
            'f uuid' => ['FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'], 'zero mac' => ['00:00:00:00:00:00'],
        ];
    }

    public function testFourSourcesAtMostAndNoDuplicates(): void
    {
        $hashes = $this->facts([
            'product_uuid' => '4c4c4544-0032-4a10-8047-b2c04f4a4d32', 'board_serial' => 'PF2ABCDE',
            'disk_serial' => 'S3Z9NB0K123456', 'mac' => '52:54:00:12:34:56',
        ])->fingerprint(self::INSTALL);
        $this->assertCount(4, $hashes);
        $this->assertSame($hashes, array_values(array_unique($hashes)));
        foreach ($hashes as $hash) {
            $this->assertMatchesRegularExpression('/^[0-9a-f]{16}$/', $hash);
        }
    }

    /**
     * @dataProvider environments
     */
    public function testEnvironmentIsAlwaysOneTheServerAccepts(string $probed, string $expected): void
    {
        $this->assertSame($expected, $this->facts([], $probed)->environment());
    }

    public static function environments(): array
    {
        return [
            ['bare', 'bare'], ['vm', 'vm'], ['container', 'container'],
            // A detector that failed or said something new must not cost the PBX its license: vm is the safe guess.
            ['', 'vm'], ['virtual', 'vm'],
        ];
    }

    public function testReplacedHardwareIsSeenByTheSameInstance(): void
    {
        $mac = '52:54:00:12:34:56';
        $facts = new HostFacts(static function () use (&$mac): array {
            return ['environment' => 'bare', 'sources' => ['mac' => $mac]];
        });
        $before = $facts->fingerprint(self::INSTALL);
        $mac = '52:54:00:65:43:21';
        $this->assertNotSame($before, $facts->fingerprint(self::INSTALL), 'a long-lived worker must not keep old hardware');
    }

    public function testMatchesNeedsKHashesOfTheDocument(): void
    {
        $document = ['k' => 3, 'h' => ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc', 'dddddddddddddddd']];
        $this->assertTrue(HostFacts::matches($document, ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'dddddddddddddddd']));
        $this->assertFalse(HostFacts::matches($document, ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'eeeeeeeeeeeeeeee']));
        $this->assertFalse(HostFacts::matches($document, ['aaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaa']));
        $this->assertFalse(HostFacts::matches(['k' => 3, 'h' => []], []));
    }
}
