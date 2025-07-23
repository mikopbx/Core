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

use MikoPBX\Tests\AdminCabinet\Tests\Data\DialplanApplicationsDataFactory;
use RuntimeException;

/**
 * Class GenerateDialplanApplicationTests
 * Generator for dialplan application test classes
 */
class GenerateDialplanApplicationTests
{
    /**
     * List of dialplan applications to exclude from automatic test generation
     */
    private const array EXCLUDED_APPLICATIONS = [
        // Add any applications to exclude here
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

namespace MikoPBX\Tests\AdminCabinet\Tests\DialplanApplications;

use MikoPBX\Tests\AdminCabinet\Tests\Data\DialplanApplicationsDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\CreateDialPlanApplicationTest;

/**
 * Test class for creating dialplan application: %s
 */
class %sTest extends CreateDialPlanApplicationTest
{
    /**
     * Get dialplan application test data
     *
     * @return array
     */
    protected function getDialplanApplicationData(): array
    {
        return DialplanApplicationsDataFactory::getApplicationData('%s');
    }
}

PHP;

    /**
     * Generate test classes for all dialplan applications
     *
     * @param string $outputDir Directory for generated test files
     * @return void
     */
    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new RuntimeException("Directory '$outputDir' was not created");
        }

        foreach (DialplanApplicationsDataFactory::getAllApplicationKeys() as $applicationKey) {
            // Skip excluded applications
            if (in_array($applicationKey, self::EXCLUDED_APPLICATIONS, true)) {
                continue;
            }
            
            $applicationData = DialplanApplicationsDataFactory::getApplicationData($applicationKey);
            
            // Generate class name from application key
            // Convert snake_case and kebab-case to PascalCase
            $className = str_replace(['-', '_', '.'], ' ', $applicationKey);
            $className = str_replace(' ', '', ucwords($className));
            
            $content = sprintf(
                self::TEMPLATE,
                $applicationData['name'],
                $className,
                $applicationKey
            );

            $filename = $outputDir . '/' . $className . 'Test.php';

            if (file_put_contents($filename, $content) === false) {
                throw new RuntimeException("Failed to write to file: $filename");
            }

            echo "Generated test class for {$applicationData['name']} (Type: {$applicationData['type']})" . PHP_EOL;
        }
    }
}

// Define paths relative to current script
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/DialplanApplications';

try {
    echo "Starting dialplan application test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateDialplanApplicationTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}