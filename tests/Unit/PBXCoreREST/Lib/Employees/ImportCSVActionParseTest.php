<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Employees;

use MikoPBX\PBXCoreREST\Lib\Employees\ImportCSVAction;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * A row the header delimiter does not split into columns must be marked invalid, not read
 * with the whole line as the employee number (issue #1349).
 */
final class ImportCSVActionParseTest extends TestCase
{
    private string $csv;

    protected function setUp(): void
    {
        $this->csv = sys_get_temp_dir() . '/employees-import-parse-' . bin2hex(random_bytes(8)) . '.csv';
    }

    protected function tearDown(): void
    {
        if (file_exists($this->csv)) {
            unlink($this->csv);
        }
    }

    public function testRowWithAnotherDelimiterIsMarkedInvalid(): void
    {
        $records = $this->parse(
            "number,user_username,user_email\r\n"
            . "201,Alice,alice@example.com\r\n"
            . "202;\"Bob [x]\";bob@example.com\r\n"
        );

        self::assertCount(2, $records);
        self::assertSame('201', $records[0]['number']);
        self::assertArrayNotHasKey('_invalid_row', $records[0]);

        self::assertTrue($records[1]['_invalid_row']);
        self::assertSame(3, $records[1]['_line']);
        self::assertSame('202;"Bob [x]";bob@example.com', $records[1]['number']);
        self::assertSame('', $records[1]['user_username']);
    }

    public function testShortRowWithSeveralColumnsIsPaddedNotInvalid(): void
    {
        $records = $this->parse("number,user_username,user_email\n203,Carol\n");

        self::assertCount(1, $records);
        self::assertArrayNotHasKey('_invalid_row', $records[0]);
        self::assertSame('Carol', $records[0]['user_username']);
        self::assertSame('', $records[0]['user_email']);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function parse(string $content): array
    {
        file_put_contents($this->csv, $content);
        $method = new ReflectionMethod(ImportCSVAction::class, 'parseCSV');
        $result = $method->invoke(null, $this->csv);

        self::assertTrue($result['success']);
        return $result['records'];
    }
}
