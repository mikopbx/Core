<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Library;

use MikoPBX\Common\Library\DialplanEntityIdentity;
use PHPUnit\Framework\TestCase;

final class DialplanEntityIdentityTest extends TestCase
{
    private const string QUEUE = DialplanEntityIdentity::QUEUE_ID_SCHEMA_PATTERN;

    public function testAcceptsGeneratedAndMigrationIds(): void
    {
        self::assertTrue(DialplanEntityIdentity::isValidClientId('QUEUE-C1941834', self::QUEUE));
        self::assertTrue(
            DialplanEntityIdentity::isValidClientId('QUEUE-F38325E796B3FFB8938BA383AA119148', self::QUEUE)
        );
        self::assertTrue(
            DialplanEntityIdentity::isValidClientId('IVR-6915a3c2', DialplanEntityIdentity::IVR_ID_SCHEMA_PATTERN)
        );
    }

    public function testAcceptsLegacyConferenceIdsMatchedByTheConferenceRoute(): void
    {
        $pattern = DialplanEntityIdentity::CONFERENCE_ID_SCHEMA_PATTERN;
        self::assertTrue(DialplanEntityIdentity::isValidClientId('CONFERENCE-84C175B8', $pattern));
        self::assertTrue(DialplanEntityIdentity::isValidClientId('CONFERENCE-ROOM-1', $pattern));
        self::assertTrue(DialplanEntityIdentity::isValidClientId('CONFERENCE12AB34CDZ', $pattern));
        self::assertFalse(DialplanEntityIdentity::isValidClientId("CONFERENCE-X\n[x]", $pattern));
        self::assertFalse(DialplanEntityIdentity::isValidClientId('CONFERENCE', $pattern));
    }

    /**
     * @dataProvider unsafeClientIdProvider
     */
    public function testRejectsClientIdsThatCanAlterAsteriskConfigs(mixed $id): void
    {
        self::assertFalse(DialplanEntityIdentity::isValidClientId($id, self::QUEUE));
    }

    public static function unsafeClientIdProvider(): array
    {
        return [
            'section injection' => ["QUEUE-A]\n[injected]\nstrategy=ringall\n;"],
            'trailing newline' => ["QUEUE-ABCD1234\n"],
            'carriage return' => ["QUEUE-AB\rCD"],
            'bracket' => ['QUEUE-AB]CD'],
            'dialplan argument separator' => ['QUEUE-AB,CD'],
            'wrong prefix' => ['IVR-ABCD1234'],
            'prefix only' => ['QUEUE-'],
            'not routable by REST' => ['QUEUE-RGV3OK01'],
            'too short' => ['QUEUE-ABC'],
            'not a string' => [['QUEUE-ABCD1234']],
            'integer' => [42],
        ];
    }

    public function testAcceptsValidNewExtensions(): void
    {
        self::assertTrue(DialplanEntityIdentity::isValidNewExtension('2001'));
        self::assertTrue(DialplanEntityIdentity::isValidNewExtension(2950));
        self::assertTrue(DialplanEntityIdentity::isValidNewExtension('22001016'));
    }

    /**
     * @dataProvider unsafeNewExtensionProvider
     */
    public function testRejectsInvalidNewExtensions(mixed $extension): void
    {
        self::assertFalse(DialplanEntityIdentity::isValidNewExtension($extension));
    }

    public static function unsafeNewExtensionProvider(): array
    {
        return [
            'dialplan injection' => ["2987\nexten => 2986,1,System(id)\n;"],
            'trailing newline' => ["2987\n"],
            'one digit' => ['1'],
            'nine digits' => ['123456789'],
            'pattern' => ['_29XX'],
            'empty' => [''],
            'not scalar' => [['2001']],
        ];
    }

    public function testConfigSafetyKeepsLegacyRows(): void
    {
        self::assertTrue(DialplanEntityIdentity::isConfigSafe('QUEUE-86EE43351B7CA1A35AC1374971D92D27', '1'));
        self::assertTrue(DialplanEntityIdentity::isConfigSafe('IVR-BFBD8208', '2200116'));
        self::assertTrue(DialplanEntityIdentity::isConfigSafe('legacy_queue.1', 110));
    }

    public function testConfigSafeExtension(): void
    {
        self::assertTrue(DialplanEntityIdentity::isConfigSafeExtension('1'));
        self::assertTrue(DialplanEntityIdentity::isConfigSafeExtension(35423));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeExtension("2989\nexten => 1,1,NoOp()"));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeExtension(''));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeExtension(null));
    }

    public function testConfigSafeDestinationAndDigits(): void
    {
        self::assertTrue(DialplanEntityIdentity::isConfigSafeDestination('2001'));
        self::assertTrue(DialplanEntityIdentity::isConfigSafeDestination('voicemail'));
        self::assertTrue(DialplanEntityIdentity::isConfigSafeDestination('did2user'));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeDestination("201\n[evil]"));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeDestination('2001,1)'));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeDestination(''));
        self::assertTrue(DialplanEntityIdentity::isConfigSafeDigits('1'));
        self::assertTrue(DialplanEntityIdentity::isConfigSafeDigits('*9#'));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeDigits("1\n[evil]\nexten => s,1,System(id)"));
        self::assertFalse(DialplanEntityIdentity::isConfigSafeDigits('12345678901'));
    }

    public function testConfigSafetyRejectsInjectedRows(): void
    {
        self::assertFalse(DialplanEntityIdentity::isConfigSafe("QUEUE-A]\n[x]", '2001'));
        self::assertFalse(DialplanEntityIdentity::isConfigSafe('QUEUE-A,B', '2001'));
        self::assertFalse(DialplanEntityIdentity::isConfigSafe('QUEUE-ABCD1234', "2001\nexten => 1,1,NoOp()"));
        self::assertFalse(DialplanEntityIdentity::isConfigSafe('QUEUE-ABCD1234', null));
        self::assertFalse(DialplanEntityIdentity::isConfigSafe(null, '2001'));
    }
}
