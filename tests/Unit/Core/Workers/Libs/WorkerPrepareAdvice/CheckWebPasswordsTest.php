<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Core\System\PasswordService;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckWebPasswords;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use stdClass;

/**
 * Regression coverage for CheckWebPasswords::isDefaultPassword().
 *
 * The cloud-instance branch used to compare a SHA-512 hash against a plain-text
 * instance ID and therefore never fired (dead code). It now verifies the hash,
 * so an unchanged auto-provisioned cloud password is detected (issue #1132).
 */
final class CheckWebPasswordsTest extends TestCase
{
    private function isDefaultPassword(stdClass $passwords): bool
    {
        $method = new ReflectionMethod(CheckWebPasswords::class, 'isDefaultPassword');
        $method->setAccessible(true);

        return $method->invoke(new CheckWebPasswords(), $passwords);
    }

    private function makePasswords(string $stored, string $default, string $cloudInstanceId): stdClass
    {
        $passwords = new stdClass();
        $passwords->web = $stored;
        $passwords->webByDefault = $default;
        $passwords->cloudInstanceId = $cloudInstanceId;

        return $passwords;
    }

    public function testDetectsHashedCloudInstanceIdAsDefault(): void
    {
        $instanceId = 'fv45bm85kq4c8pqebgtm';
        $passwords = $this->makePasswords(
            PasswordService::generateSha512Hash($instanceId),
            'admin',
            $instanceId
        );

        self::assertTrue(
            $this->isDefaultPassword($passwords),
            'A stored hash of the cloud instance ID must be reported as the default password'
        );
    }

    public function testCustomHashedPasswordIsNotDefault(): void
    {
        $passwords = $this->makePasswords(
            PasswordService::generateSha512Hash('a-strong-user-chosen-password'),
            'admin',
            'fv45bm85kq4c8pqebgtm'
        );

        self::assertFalse($this->isDefaultPassword($passwords));
    }

    public function testDetectsHashedBuiltInDefault(): void
    {
        $passwords = $this->makePasswords(
            PasswordService::generateSha512Hash('admin'),
            'admin',
            ''
        );

        self::assertTrue($this->isDefaultPassword($passwords));
    }

    public function testLegacyPlainTextDefaultIsDetected(): void
    {
        $passwords = $this->makePasswords('admin', 'admin', '');

        self::assertTrue($this->isDefaultPassword($passwords));
    }
}
