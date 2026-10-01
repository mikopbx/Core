<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Employees;

use MikoPBX\PBXCoreREST\Lib\Common\SchemaValidator;
use MikoPBX\PBXCoreREST\Lib\Employees\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Employees\ImportCSVAction;
use MikoPBX\Core\System\Directories;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use ReflectionProperty;

final class ImportCSVActionSecurityTest extends TestCase
{
    private string $tempDir;

    protected function setUp(): void
    {
        $this->tempDir = sys_get_temp_dir() . '/employees-import-security-' . bin2hex(random_bytes(8));
        mkdir($this->tempDir, 0700, true);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->tempDir . '/*') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->tempDir);
        Directories::reset();
    }

    public function testPublicSchemaRejectsTraversalInUploadId(): void
    {
        $relatedDefinitions = DataStructure::getParameterDefinitions()['related'];
        $schema = ['type' => 'object', 'properties' => $relatedDefinitions];

        foreach (['../outside', '..', '/etc', 'folder\\outside', "id\0suffix"] as $uploadId) {
            $this->assertNotEmpty(
                SchemaValidator::validate(['upload_id' => $uploadId], $schema),
                "Unsafe upload_id must be rejected: {$uploadId}"
            );
        }
    }

    public function testDirectFilepathIsNotAcceptedByImportEndpoint(): void
    {
        $csv = $this->tempDir . '/employees.csv';
        file_put_contents($csv, "number,user_username\n");

        $result = ImportCSVAction::main(['mode' => 'preview', 'filepath' => $csv]);

        $this->assertFalse($result->success);
        $this->assertSame([], $result->data);
        $this->assertContains('ex_ImportFileNotFound', $result->messages['error']);
    }

    public function testImportModeRejectsTraversalBeforeReadingTemporaryJson(): void
    {
        $importDir = '/tmp/employee_import';
        if (!is_dir($importDir)) {
            mkdir($importDir, 0700, true);
        }
        $outsideName = 'employees-import-' . bin2hex(random_bytes(8));
        $outsideFile = '/tmp/' . $outsideName . '.json';
        file_put_contents($outsideFile, '{invalid-json');

        try {
            $result = ImportCSVAction::main([
                'mode' => 'import',
                'uploadId' => '../' . $outsideName,
            ]);
        } finally {
            unlink($outsideFile);
        }

        $this->assertFalse($result->success);
        $this->assertContains('ex_ImportFileNotFound', $result->messages['error']);
        $this->assertNotContains('ex_ImportInvalidData', $result->messages['error']);
    }

    public function testPreviewReadsCsvOnlyFromConfiguredUploadDirectory(): void
    {
        $uploadId = 'safe-upload_123';
        $uploadDir = $this->tempDir . '/' . $uploadId;
        mkdir($uploadDir, 0700);
        file_put_contents($uploadDir . '/employees.csv', "number,user_username\n");
        $this->setUploadDirectory($this->tempDir);

        try {
            $result = ImportCSVAction::main(['mode' => 'preview', 'upload_id' => $uploadId]);
        } finally {
            unlink($uploadDir . '/employees.csv');
            rmdir($uploadDir);
        }

        $this->assertFalse($result->success);
        $this->assertContains('ex_ImportNoRecords', $result->messages['error']);
        $this->assertNotContains('ex_ImportFileNotFound', $result->messages['error']);
    }

    public function testPreviewRejectsUploadDirectorySymlinkOutsideConfiguredRoot(): void
    {
        $root = $this->tempDir . '/uploads';
        $outside = $this->tempDir . '/outside';
        mkdir($root, 0700);
        mkdir($outside, 0700);
        file_put_contents($outside . '/employees.csv', "number,user_username\n");
        symlink($outside, $root . '/linked-upload');
        $this->setUploadDirectory($root);

        try {
            $result = ImportCSVAction::main(['mode' => 'preview', 'upload_id' => 'linked-upload']);
        } finally {
            unlink($root . '/linked-upload');
            unlink($outside . '/employees.csv');
            rmdir($outside);
            rmdir($root);
        }

        $this->assertFalse($result->success);
        $this->assertContains('ex_ImportFileNotFound', $result->messages['error']);
    }

    public function testPreviewRejectsCsvSymlinkOutsideUploadDirectory(): void
    {
        $root = $this->tempDir . '/uploads';
        $uploadDir = $root . '/safe-upload';
        mkdir($root, 0700);
        mkdir($uploadDir, 0700);
        $outsideCsv = $this->tempDir . '/outside.csv';
        file_put_contents($outsideCsv, "number,user_username\n");
        symlink($outsideCsv, $uploadDir . '/employees.csv');
        $this->setUploadDirectory($root);

        try {
            $result = ImportCSVAction::main(['mode' => 'preview', 'upload_id' => 'safe-upload']);
        } finally {
            unlink($uploadDir . '/employees.csv');
            unlink($outsideCsv);
            rmdir($uploadDir);
            rmdir($root);
        }

        $this->assertFalse($result->success);
        $this->assertContains('ex_ImportFileNotFound', $result->messages['error']);
    }

    public function testImportRejectsNonStringIdentifiers(): void
    {
        foreach ([['unexpected'], (object)['unexpected' => true]] as $value) {
            $preview = ImportCSVAction::main(['mode' => 'preview', 'upload_id' => $value]);
            $import = ImportCSVAction::main(['mode' => 'import', 'uploadId' => $value]);

            $this->assertFalse($preview->success);
            $this->assertContains('ex_ImportFileNotFound', $preview->messages['error']);
            $this->assertFalse($import->success);
            $this->assertContains('ex_ImportFileNotFound', $import->messages['error']);
        }
    }

    public function testCsvPreviewDoesNotRewriteUtf8BomSource(): void
    {
        $csv = $this->tempDir . '/employees.csv';
        $original = "\xEF\xBB\xBFnumber,user_username\r\n100,Alice\r\n";
        file_put_contents($csv, $original);

        $method = new ReflectionMethod(ImportCSVAction::class, 'parseCSV');
        $result = $method->invoke(null, $csv);

        $this->assertTrue($result['success']);
        $this->assertSame($original, file_get_contents($csv));
    }

    public function testCsvPreviewDoesNotRewriteWindows1251Source(): void
    {
        $csv = $this->tempDir . '/employees.csv';
        $original = mb_convert_encoding(
            "number,user_username\r\n101,Алиса\r\n",
            'Windows-1251',
            'UTF-8'
        );
        file_put_contents($csv, $original);

        $method = new ReflectionMethod(ImportCSVAction::class, 'parseCSV');
        $result = $method->invoke(null, $csv);

        $this->assertTrue($result['success']);
        $this->assertSame('Алиса', $result['records'][0]['user_username']);
        $this->assertSame($original, file_get_contents($csv));
    }

    private function setUploadDirectory(string $directory): void
    {
        $property = new ReflectionProperty(Directories::class, 'dirCache');
        $property->setValue(null, [Directories::WWW_UPLOAD_DIR => $directory]);
    }
}
