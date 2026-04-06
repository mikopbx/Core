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

use MikoPBX\Tests\AdminCabinet\Tests\Data\AmiUserDataFactory;

/**
 * Generator for AMI Users test classes
 */
class GenerateAMIUsersTests
{
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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\AMIUsers;

use MikoPBX\Tests\AdminCabinet\Tests\CreateAmiUserTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\AmiUserDataFactory;

/**
 * Test class for creating %s AMI user
 */
class %sTest extends CreateAmiUserTest
{
    protected function getAmiUserData(): array
    {
        return AmiUserDataFactory::getAmiUserData('%s');
    }
}

PHP;

    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new \RuntimeException("Directory '$outputDir' was not created");
        }

        foreach (AmiUserDataFactory::getAllUserKeys() as $queueKey) {
            $amiData = AmiUserDataFactory::getAmiUserData($queueKey);
            $className = str_replace(['.', ' '], '', ucwords($queueKey, '.'));

            $content = sprintf(
                self::TEMPLATE,
                $amiData['username'],
                $className,
                $queueKey
            );

            $filename = $outputDir . '/' . $className . 'Test.php';

            if (file_put_contents($filename, $content) === false) {
                throw new \RuntimeException("Failed to write to file: $filename");
            }

            echo "Generated test class for {$amiData['username']}" . PHP_EOL;
        }
    }
}

// Определяем пути относительно текущего скрипта
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/AMIUsers';

try {
    echo "Starting test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateAMIUsersTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
