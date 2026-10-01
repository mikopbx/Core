<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk;

use MikoPBX\Core\Asterisk\Configs\ConferenceConf;
use PHPUnit\Framework\TestCase;

final class ConferenceConfSecurityTest extends TestCase
{
    public function testStoredPinCodeCannotInjectDialplanPriorities(): void
    {
        $conferenceConf = new ConferenceConfSecurityFixture();

        $line = $conferenceConf->renderPinCode("1)\nsame => n,Hangup(");

        self::assertSame("same => n,Set(CONFBRIDGE(user,pin)=1)\n\t", $line);
        self::assertStringNotContainsString("\nsame =>", rtrim($line));
    }

    public function testEmptyStoredPinCodeProducesNoDialplanLine(): void
    {
        $conferenceConf = new ConferenceConfSecurityFixture();

        self::assertSame('', $conferenceConf->renderPinCode(''));
    }
}

final class ConferenceConfSecurityFixture extends ConferenceConf
{
    public function __construct()
    {
    }

    public function renderPinCode(string $pinCode): string
    {
        return $this->buildPinCodeDialplan($pinCode);
    }
}
