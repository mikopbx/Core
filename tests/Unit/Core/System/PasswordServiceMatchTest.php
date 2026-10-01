<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\PasswordService;
use PHPUnit\Framework\TestCase;

/**
 * Coverage for PasswordService::matchesStoredPassword() — the discriminator used
 * to detect an auto-provisioned cloud default (web password == CLOUD_INSTANCE_ID)
 * both in CheckWebPasswords and in the forced password-change gate (issue #1132).
 */
final class PasswordServiceMatchTest extends TestCase
{
    public function testSha512HashMatchesOriginalPlainText(): void
    {
        $instanceId = 'fv45bm85kq4c8pqebgtm';
        $stored = PasswordService::generateSha512Hash($instanceId);

        self::assertTrue(PasswordService::matchesStoredPassword($instanceId, $stored));
    }

    public function testSha512HashDoesNotMatchDifferentPlainText(): void
    {
        $stored = PasswordService::generateSha512Hash('a-strong-user-chosen-password');

        self::assertFalse(
            PasswordService::matchesStoredPassword('fv45bm85kq4c8pqebgtm', $stored),
            'Once the admin sets a new password the stored hash must stop matching the instance ID'
        );
    }

    public function testLegacyPlainTextMatchesExactly(): void
    {
        self::assertTrue(PasswordService::matchesStoredPassword('admin', 'admin'));
        self::assertFalse(PasswordService::matchesStoredPassword('admin', 'other'));
    }

    public function testEmptyStoredPasswordNeverMatches(): void
    {
        self::assertFalse(PasswordService::matchesStoredPassword('anything', ''));
        self::assertFalse(PasswordService::matchesStoredPassword('', ''));
    }
}
