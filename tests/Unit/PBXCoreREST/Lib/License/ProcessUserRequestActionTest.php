<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\License;

use MikoPBX\PBXCoreREST\Lib\License\ProcessUserRequestAction;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/** #1200: a malformed key or an incomplete trial form gets a validation message, not an internal error. */
final class ProcessUserRequestActionTest extends TestCase
{
    private const string KEY = 'MIKO-ABCDE-12345-FGHIJ-67890';
    private const array TRIAL = ['companyname' => 'MIKO', 'email' => 'a@b.c', 'contact' => 'Ivan'];

    private static function requestError(array $data): ?string
    {
        $method = new ReflectionMethod(ProcessUserRequestAction::class, 'requestError');
        return $method->invoke(null, $data);
    }

    public function testAKeyOfTheRightShapeGoesToTheServer(): void
    {
        self::assertNull(self::requestError(['licKey' => self::KEY]));
        self::assertNull(self::requestError(['licKey' => ' ' . self::KEY . ' ', 'coupon' => '']));
    }

    public function testAMalformedKeyIsRefusedInsteadOfAskingForATrial(): void
    {
        foreach (['MIKO-abc', 'ABCD-ABCDE-12345-FGHIJ-67890', self::KEY . 'X'] as $key) {
            self::assertSame('lic_WrongLicenseKeyOrEmpty', self::requestError(['licKey' => $key] + self::TRIAL), $key);
        }
    }

    public function testATrialNeedsCompanyEmailAndContact(): void
    {
        self::assertNull(self::requestError(self::TRIAL));
        self::assertNull(self::requestError(['licKey' => ''] + self::TRIAL));
        self::assertSame('lic_ValidateCompanyNameEmpty', self::requestError(['companyname' => ' '] + self::TRIAL));
        self::assertSame('lic_ValidateContactEmail', self::requestError(array_diff_key(self::TRIAL, ['email' => 1])));
        self::assertSame('lic_ValidateContactName', self::requestError(array_diff_key(self::TRIAL, ['contact' => 1])));
        self::assertSame('lic_ValidateCompanyNameEmpty', self::requestError([]));
    }
}
