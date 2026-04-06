<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Tests\Core\Workers;

use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Workers\WorkerAudioProcessor;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Class WorkerAudioProcessorTest
 *
 * Tests for WorkerAudioProcessor class
 *
 * @package MikoPBX\Tests\Core\Workers
 */
class WorkerAudioProcessorTest extends AbstractUnitTest
{
    /**
     * Temporary test files directory
     */
    private string $tempDir;

    /**
     * Test source files
     */
    private array $testSourceFiles = [];

    /**
     * Test target file
     */
    private string $testTargetFile;

    /**
     * Set up test environment
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Create temporary directory for test files
        $this->tempDir = sys_get_temp_dir() . '/mikopbx_audio_test_' . uniqid();
        mkdir($this->tempDir, 0755, true);

        // Create test source files
        $this->testSourceFiles = [
            $this->tempDir . '/external_test.wav',
            $this->tempDir . '/internal_test.wav'
        ];

        foreach ($this->testSourceFiles as $file) {
            touch($file);
            file_put_contents($file, 'test_wav_data');
        }

        $this->testTargetFile = $this->tempDir . '/output.webm';
    }

    /**
     * Clean up test environment
     */
    protected function tearDown(): void
    {
        // Remove test files
        if (is_dir($this->tempDir)) {
            array_map('unlink', glob("$this->tempDir/*"));
            rmdir($this->tempDir);
        }

        parent::tearDown();
    }

    /**
     * Test worker instantiation
     */
    public function testWorkerInstantiation(): void
    {
        $worker = new WorkerAudioProcessor();
        $this->assertInstanceOf(WorkerAudioProcessor::class, $worker);
    }

    /**
     * Test getCheckInterval method
     */
    public function testGetCheckInterval(): void
    {
        $interval = WorkerAudioProcessor::getCheckInterval();
        $this->assertIsInt($interval);
        $this->assertEquals(30, $interval);
    }

    /**
     * Test queue name constant
     */
    public function testQueueNameConstant(): void
    {
        $this->assertEquals('audio_conversion', WorkerAudioProcessor::QUEUE_NAME);
    }

    /**
     * Test deserializeJob with valid JSON
     */
    public function testDeserializeJobWithValidJson(): void
    {
        $worker = new WorkerAudioProcessor();

        $validJobData = [
            'source_files' => $this->testSourceFiles,
            'target_file' => $this->testTargetFile,
            'cdr_id' => 'test_cdr_123'
        ];

        $jsonData = json_encode($validJobData);

        $result = $this->invokeMethod($worker, 'deserializeJob', [$jsonData]);

        $this->assertIsArray($result);
        $this->assertEquals($validJobData, $result);
    }

    /**
     * Test deserializeJob with invalid JSON
     */
    public function testDeserializeJobWithInvalidJson(): void
    {
        $worker = new WorkerAudioProcessor();

        $this->expectException(\JsonException::class);

        $this->invokeMethod($worker, 'deserializeJob', ['invalid json {']);
    }

    /**
     * Test deserializeJob with non-array JSON
     */
    public function testDeserializeJobWithNonArrayJson(): void
    {
        $worker = new WorkerAudioProcessor();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Invalid job data format: expected array');

        $this->invokeMethod($worker, 'deserializeJob', ['"string_value"']);
    }

    /**
     * Test validateJobData with valid data
     */
    public function testValidateJobDataWithValidData(): void
    {
        $worker = new WorkerAudioProcessor();

        $validJobData = [
            'source_files' => $this->testSourceFiles,
            'target_file' => $this->testTargetFile,
            'cdr_id' => 'test_cdr_123'
        ];

        // Should not throw exception
        $this->invokeMethod($worker, 'validateJobData', [$validJobData]);
        $this->assertTrue(true);
    }

    /**
     * Test validateJobData with missing required field
     */
    public function testValidateJobDataWithMissingField(): void
    {
        $worker = new WorkerAudioProcessor();

        $invalidJobData = [
            'source_files' => $this->testSourceFiles,
            'target_file' => $this->testTargetFile
            // Missing 'cdr_id'
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: cdr_id');

        $this->invokeMethod($worker, 'validateJobData', [$invalidJobData]);
    }

    /**
     * Test validateJobData with invalid source_files type
     */
    public function testValidateJobDataWithInvalidSourceFilesType(): void
    {
        $worker = new WorkerAudioProcessor();

        $invalidJobData = [
            'source_files' => 'not_an_array',
            'target_file' => $this->testTargetFile,
            'cdr_id' => 'test_cdr_123'
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('source_files must be an array');

        $this->invokeMethod($worker, 'validateJobData', [$invalidJobData]);
    }

    /**
     * Test validateJobData with non-existent source file
     */
    public function testValidateJobDataWithNonExistentSourceFile(): void
    {
        $worker = new WorkerAudioProcessor();

        $invalidJobData = [
            'source_files' => [$this->tempDir . '/non_existent.wav'],
            'target_file' => $this->testTargetFile,
            'cdr_id' => 'test_cdr_123'
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Source file not found/');

        $this->invokeMethod($worker, 'validateJobData', [$invalidJobData]);
    }

    /**
     * Test validateJobData with non-existent target directory
     */
    public function testValidateJobDataWithNonExistentTargetDirectory(): void
    {
        $worker = new WorkerAudioProcessor();

        $invalidJobData = [
            'source_files' => $this->testSourceFiles,
            'target_file' => '/non_existent_dir/output.webm',
            'cdr_id' => 'test_cdr_123'
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Target directory does not exist');

        $this->invokeMethod($worker, 'validateJobData', [$invalidJobData]);
    }

    /**
     * Test validateJobData with non-writable target directory
     */
    public function testValidateJobDataWithNonWritableTargetDirectory(): void
    {
        // Create a read-only directory
        $readOnlyDir = $this->tempDir . '/readonly';
        mkdir($readOnlyDir, 0555);

        $worker = new WorkerAudioProcessor();

        $invalidJobData = [
            'source_files' => $this->testSourceFiles,
            'target_file' => $readOnlyDir . '/output.webm',
            'cdr_id' => 'test_cdr_123'
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Target directory is not writable');

        try {
            $this->invokeMethod($worker, 'validateJobData', [$invalidJobData]);
        } finally {
            // Cleanup: restore write permissions
            chmod($readOnlyDir, 0755);
            rmdir($readOnlyDir);
        }
    }

    /**
     * Test processConversionJob with valid job (basic validation only)
     *
     * Note: Full conversion testing will be added in Phase 1, Task 1.2
     * when FFmpegConverter is implemented
     */
    public function testProcessConversionJobValidatesSuccessfully(): void
    {
        $worker = new WorkerAudioProcessor();

        $jobData = [
            'source_files' => $this->testSourceFiles,
            'target_file' => $this->testTargetFile,
            'cdr_id' => 'test_cdr_123'
        ];

        // Create a mock BeanstalkClient message
        $mockMessage = $this->createMock(BeanstalkClient::class);
        $mockMessage->method('getBody')
            ->willReturn(json_encode($jobData));

        // Should not throw exception during validation
        $worker->processConversionJob($mockMessage);
        $this->assertTrue(true);
    }

    /**
     * Test processConversionJob with invalid JSON
     */
    public function testProcessConversionJobWithInvalidJson(): void
    {
        $worker = new WorkerAudioProcessor();

        $mockMessage = $this->createMock(BeanstalkClient::class);
        $mockMessage->method('getBody')
            ->willReturn('invalid json {');

        // Should handle exception gracefully (not throw)
        $worker->processConversionJob($mockMessage);
        $this->assertTrue(true);
    }

    /**
     * Test processConversionJob with invalid job data
     */
    public function testProcessConversionJobWithInvalidJobData(): void
    {
        $worker = new WorkerAudioProcessor();

        $invalidJobData = [
            'source_files' => 'not_an_array',
            'target_file' => $this->testTargetFile,
            'cdr_id' => 'test_cdr_123'
        ];

        $mockMessage = $this->createMock(BeanstalkClient::class);
        $mockMessage->method('getBody')
            ->willReturn(json_encode($invalidJobData));

        // Should handle exception gracefully (not throw)
        $worker->processConversionJob($mockMessage);
        $this->assertTrue(true);
    }
}
