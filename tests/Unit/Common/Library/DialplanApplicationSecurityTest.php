<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Library;

use InvalidArgumentException;
use MikoPBX\Common\Library\DialplanApplicationSecurity;
use PHPUnit\Framework\TestCase;

final class DialplanApplicationSecurityTest extends TestCase
{
    public function testAcceptsGeneratedAndMigrationIdentifiers(): void
    {
        self::assertTrue(DialplanApplicationSecurity::isValidId('DIALPLAN-ABCD1234'));
        self::assertTrue(DialplanApplicationSecurity::isValidId('DIALPLAN-0123456789ABCDEF'));
    }

    public function testAcceptsLegacyIdentifiersUsedByExistingInstallations(): void
    {
        self::assertTrue(
            DialplanApplicationSecurity::isValidId('DIALPLAN-APPLICATION-7375249804c62d16c9336d')
        );
        self::assertTrue(
            DialplanApplicationSecurity::isValidId('APPLICATION-MAPPING-7375249804c62d16c9336d')
        );
        self::assertTrue(DialplanApplicationSecurity::isValidId('custom-App-123'));
    }

    /**
     * @dataProvider unsafeIdProvider
     */
    public function testRejectsIdentifiersThatCanEscapeOrAlterTheAgiPath(mixed $id): void
    {
        self::assertFalse(DialplanApplicationSecurity::isValidId($id));
    }

    public static function unsafeIdProvider(): array
    {
        return [
            'relative traversal' => ['../../usr/www/sites/admin-cabinet/payload'],
            'absolute path' => ['/tmp/payload'],
            'backslash traversal' => ['..\\..\\tmp\\payload'],
            'embedded nul' => ["DIALPLAN-ABCD1234\0.php"],
            'dot' => ['DIALPLAN-ABCD1234.php'],
            'newline' => ["DIALPLAN-ABCD1234\nInjected"],
            'space' => ['DIALPLAN ABCD1234'],
            'underscore' => ['DIALPLAN_ABCD1234'],
            'too long' => [str_repeat('A', 129)],
            'array' => [['DIALPLAN-ABCD1234']],
            'null' => [null],
        ];
    }

    public function testBuildScriptPathKeepsValidApplicationInsideAgiDirectory(): void
    {
        $agiDir = sys_get_temp_dir() . '/dialplan-security-test';

        self::assertSame(
            $agiDir . '/DIALPLAN-ABCD1234.php',
            DialplanApplicationSecurity::buildScriptPath($agiDir, 'DIALPLAN-ABCD1234')
        );
    }

    public function testBuildScriptPathFailsClosedForTraversal(): void
    {
        $this->expectException(InvalidArgumentException::class);

        DialplanApplicationSecurity::buildScriptPath('/var/lib/asterisk/agi-bin', '../../tmp/payload');
    }
}
