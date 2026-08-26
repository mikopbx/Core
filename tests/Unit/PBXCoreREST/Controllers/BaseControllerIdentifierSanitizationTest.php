<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Controllers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Filter\Filter;
use PHPUnit\Framework\TestCase;

final class BaseControllerIdentifierSanitizationTest extends TestCase
{
    public function testIdentifierFieldsReachResourceValidationWithoutTrimming(): void
    {
        $data = BaseController::sanitizeData([
            'id' => " DIALPLAN-ABCD1234\n",
            'uniqid' => "DIALPLAN-ABCD1234\r",
        ], new Filter());

        self::assertSame(" DIALPLAN-ABCD1234\n", $data['id']);
        self::assertSame("DIALPLAN-ABCD1234\r", $data['uniqid']);
    }
}
