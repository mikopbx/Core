<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Employees;

use MikoPBX\PBXCoreREST\Lib\Employees\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Employees\SaveEmployeeAction;
use PHPUnit\Framework\TestCase;

/**
 * Issue #1383 (B-035): the CSV/batch save path truncated user_email and user_username
 * to 32 characters (and sip_secret to 64) although the schema allows more.
 */
final class SaveEmployeeActionLengthTest extends TestCase
{
    /**
     * @dataProvider schemaLimitedFields
     */
    public function testValueOfSchemaMaxLengthIsNotTruncated(string $field, string $value): void
    {
        $maxLength = DataStructure::getParameterDefinitions()['request'][$field]['maxLength'];
        $value = mb_substr(str_repeat($value, $maxLength), 0, $maxLength);

        // An existing id keeps prepareData() away from create-only defaults that need the DB
        $prepared = SaveEmployeeAction::prepareData(['id' => '1', $field => $value]);

        self::assertSame($value, $prepared[$field]);
    }

    public static function schemaLimitedFields(): array
    {
        return [
            'username' => ['user_username', 'Иван'],
            'email' => ['user_email', 'a'],
            'sip secret' => ['sip_secret', 'Zx9'],
        ];
    }
}
