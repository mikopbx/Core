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

use MikoPBX\Tests\AdminCabinet\Tests\Data\EmployeeDataFactory;
use RuntimeException;

/**
 * Class TestClassGenerator
 * Generator for extension test classes
 */
class GenerateExtensionTests
{
    /**
     * List of employees to exclude from automatic test generation
     */
    private const array EXCLUDED_EMPLOYEES = [
        'nikita.telegrafov',
        'alexandra.pushina.289',
        'smith.james'
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

namespace MikoPBX\Tests\AdminCabinet\Tests\Extensions;

use MikoPBX\Tests\AdminCabinet\Tests\Data\EmployeeDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\CreateExtensionsTest;

/**
 * Test class for creating extension for %s
 */
class %sTest extends CreateExtensionsTest
{
    /**
     * Get employee test data
     *
     * @return array
     */
    protected function getEmployeeData(): array
    {
        return EmployeeDataFactory::getEmployeeData('%s');
    }
}

PHP;

    /**
     * Generate test classes for all employees
     *
     * @param string $outputDir Directory for generated test files
     * @return void
     */
    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new RuntimeException("Directory '$outputDir' was not created");
        }

        foreach (EmployeeDataFactory::getAllEmployeeKeys() as $employeeKey) {
            // Skip excluded employees
            if (in_array($employeeKey, self::EXCLUDED_EMPLOYEES, true)) {
                continue;
            }
            $employeeData = EmployeeDataFactory::getEmployeeData($employeeKey);
            $className = str_replace(['.', ' '], '', ucwords($employeeKey, '.'));

            $content = sprintf(
                self::TEMPLATE,
                $employeeData['username'],
                $className,
                $employeeKey
            );

            $filename = $outputDir . '/' . $className . 'Test.php';

            if (file_put_contents($filename, $content) === false) {
                throw new RuntimeException("Failed to write to file: $filename");
            }

            echo "Generated test class for {$employeeData['username']}" . PHP_EOL;
        }
    }
}

// Определяем пути относительно текущего скрипта
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/Extensions';

try {
    echo "Starting test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateExtensionTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
