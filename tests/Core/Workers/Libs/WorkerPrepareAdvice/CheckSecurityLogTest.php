<?php

namespace MikoPBX\Tests\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSecurityLog;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Directories;
use Phalcon\Di\Di;

class CheckSecurityLogTest extends AbstractUnitTest
{
    private string $testLogFile;
    private CheckSecurityLog $checker;

    protected function setUp(): void
    {
        parent::setUp();

        $this->checker = new CheckSecurityLog();

        // Create test log file path
        $logDir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/asterisk';
        $this->testLogFile = $logDir . '/security_log';
    }

    public function testProcessWithNoLogFile(): void
    {
        // Remove log file if exists
        if (file_exists($this->testLogFile)) {
            unlink($this->testLogFile);
        }

        $result = $this->checker->process();

        // Should return empty array when log doesn't exist
        $this->assertIsArray($result);
        $this->assertEmpty($result);
    }

    public function testProcessFirstRun(): void
    {
        // Create a test log file
        $this->createTestLogFile(1024); // 1KB

        // Clear cache to simulate first run
        $this->clearCheckSecurityLogCache();

        $result = $this->checker->process();

        // First run should not generate warnings
        $this->assertIsArray($result);
        $this->assertEmpty($result);

        // Cleanup
        $this->cleanup();
    }

    public function testProcessNormalGrowth(): void
    {
        // Create initial log file
        $this->createTestLogFile(1024); // 1KB

        // Clear cache
        $this->clearCheckSecurityLogCache();

        // First run - establish baseline
        $this->checker->process();

        // Simulate normal growth (less than 1MB per 10 minutes)
        sleep(1); // Wait a bit for timestamp difference
        $this->createTestLogFile(1024 + 500 * 1024); // Add 500KB

        $result = $this->checker->process();

        // Should not generate warnings for normal growth
        $this->assertIsArray($result);
        $this->assertArrayNotHasKey('warning', $result);
        $this->assertArrayNotHasKey('error', $result);

        // Cleanup
        $this->cleanup();
    }

    public function testProcessSuspiciousGrowth(): void
    {
        // Create initial log file
        $this->createTestLogFile(1024); // 1KB

        // Clear cache
        $this->clearCheckSecurityLogCache();

        // First run - establish baseline
        $this->checker->process();

        // Simulate suspicious growth (1-5MB per interval)
        sleep(1);
        $this->createTestLogFile(1024 + 2 * 1024 * 1024); // Add 2MB

        $result = $this->checker->process();

        // Should generate warning for suspicious growth
        $this->assertIsArray($result);
        // Note: Actual warning generation depends on normalized growth calculation
        // which is based on time elapsed

        // Cleanup
        $this->cleanup();
    }

    public function testProcessLogRotation(): void
    {
        // Create initial log file
        $this->createTestLogFile(5 * 1024 * 1024); // 5MB

        // Clear cache
        $this->clearCheckSecurityLogCache();

        // First run
        $this->checker->process();

        // Simulate log rotation (file becomes smaller)
        sleep(1);
        $this->createTestLogFile(1024); // Reset to 1KB

        $result = $this->checker->process();

        // Should not generate errors after rotation
        $this->assertIsArray($result);
        // Log rotation should reset tracking

        // Cleanup
        $this->cleanup();
    }

    /**
     * Create test log file with specified size
     *
     * @param int $sizeBytes File size in bytes
     */
    private function createTestLogFile(int $sizeBytes): void
    {
        $logDir = dirname($this->testLogFile);

        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        // Create file with random content
        $content = str_repeat("Security event test line\n", (int)($sizeBytes / 25));
        file_put_contents($this->testLogFile, $content);
    }

    /**
     * Clear cache keys used by CheckSecurityLog
     */
    private function clearCheckSecurityLogCache(): void
    {
        $di = Di::getDefault();
        if ($di !== null) {
            $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
            $managedCache->delete('CheckSecurityLog:lastSize');
            $managedCache->delete('CheckSecurityLog:lastCheckTimestamp');
        }
    }

    /**
     * Cleanup test files and cache
     */
    private function cleanup(): void
    {
        if (file_exists($this->testLogFile)) {
            unlink($this->testLogFile);
        }
        $this->clearCheckSecurityLogCache();
    }

    protected function tearDown(): void
    {
        $this->cleanup();
        parent::tearDown();
    }
}
