<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Scripts;

require_once __DIR__ . '/../../../vendor/autoload.php';

use MikoPBX\Tests\AdminCabinet\Tests\Data\CallQueueDataFactory;

/**
 * Generator for Call Queue test classes
 */
class GenerateCallQueueTests
{
    /**
     * List of Call Queue to exclude from automatic test generation
     */
    private const array EXCLUDED_CALL_QUEUES = [
        'accountant.department.for.test.dropdown',
        'sales.department.to.change.extension'
    ];

    private const TEMPLATE = <<<'PHP'
<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\CallQueues;

use MikoPBX\Tests\AdminCabinet\Tests\CreateCallQueueTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\CallQueueDataFactory;

/**
 * Test class for creating %s Call Queue
 */
class %sTest extends CreateCallQueueTest
{
    protected function getCallQueueData(): array
    {
        return CallQueueDataFactory::getCallQueueData('%s');
    }
}

PHP;

    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new \RuntimeException("Directory '$outputDir' was not created");
        }

        foreach (CallQueueDataFactory::getAllQueueKeys() as $queueKey) {
            // Skip excluded queues
            if (in_array($queueKey, self::EXCLUDED_CALL_QUEUES, true)) {
                continue;
            }

            $queueData = CallQueueDataFactory::getCallQueueData($queueKey);
            $className = str_replace(['.', ' '], '', ucwords($queueKey, '.'));

            $content = sprintf(
                self::TEMPLATE,
                $queueData['name'],
                $className,
                $queueKey
            );

            $filename = $outputDir . '/' . $className . 'Test.php';

            if (file_put_contents($filename, $content) === false) {
                throw new \RuntimeException("Failed to write to file: $filename");
            }

            echo "Generated test class for {$queueData['name']}" . PHP_EOL;
        }
    }
}

// Определяем пути относительно текущего скрипта
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/CallQueues';

try {
    echo "Starting test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateCallQueueTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
