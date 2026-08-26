<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\PBXCoreREST\Lib\DialplanApplications\SaveRecordAction;
use PHPUnit\Framework\TestCase;

final class SaveRecordActionSecurityTest extends TestCase
{
    /**
     * @dataProvider unsafeIdentifierProvider
     */
    public function testSaveRejectsUnsafeIdentifierBeforeDatabaseAccess(string $field, string $id): void
    {
        $result = SaveRecordAction::main([
            $field => $id,
            'name' => 'Traversal attempt',
            'extension' => '99993',
            'type' => 'php',
            'applicationlogic' => '<?php echo "unsafe";',
            'httpMethod' => 'POST',
        ]);

        self::assertFalse($result->success);
        self::assertSame(422, $result->httpCode);
        self::assertNotEmpty($result->messages['error']);
    }

    public static function unsafeIdentifierProvider(): array
    {
        return [
            'REST v3 traversal' => ['id', '../../../../usr/www/sites/admin-cabinet/payload'],
            'legacy traversal' => ['uniqid', '../../../../usr/www/sites/admin-cabinet/payload'],
            'leading space' => ['id', ' DIALPLAN-ABCD1234'],
            'trailing space' => ['id', 'DIALPLAN-ABCD1234 '],
            'trailing newline' => ['id', "DIALPLAN-ABCD1234\n"],
            'embedded CRLF' => ['uniqid', "DIALPLAN-ABCD1234\r\nInjected"],
        ];
    }

}
