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

use MikoPBX\Tests\AdminCabinet\Tests\Data\MOHAudioFilesDataFactory;

/**
 * Generator for MOH Audio Files test classes
 */
class GenerateMOHFileTests
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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\MOHFiles;

use MikoPBX\Tests\AdminCabinet\Tests\CreateMOHAudioFileTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\MOHAudioFilesDataFactory;

/**
 * Test class for creating %s MOH audio file
 * 
 * Name: %s
 * File: %s
 * Description: %s
 */
class %sTest extends CreateMOHAudioFileTest
{
    protected function getAudioFileData(): array
    {
        return MOHAudioFilesDataFactory::getAudioFileData('%s');
    }
}
PHP;

    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new \RuntimeException("Failed to create directory: $outputDir");
        }

        echo "Starting MOH Audio Files test class generation..." . PHP_EOL;

        foreach (MOHAudioFilesDataFactory::getAllAudioFileKeys() as $fileKey) {
            $fileData = MOHAudioFilesDataFactory::getAudioFileData($fileKey);

            $className = str_replace(['.', ' '], '', ucwords($fileKey, '. '));

            $content = sprintf(
                self::TEMPLATE,
                ucwords(str_replace('.', ' ', $fileKey)),
                $fileData['name'],
                $fileData['filename'],
                $fileData['description'],
                $className,
                $fileKey
            );

            $filename = $outputDir . '/' . $className . 'Test.php';

            if (file_put_contents($filename, $content) === false) {
                throw new \RuntimeException("Failed to write file: $filename");
            }

            echo sprintf(
                "Generated test class for MOH file %s (%s) -> %s\n",
                $fileData['name'],
                $fileData['filename'],
                $filename
            );
        }

        echo "MOH Audio Files test class generation completed!" . PHP_EOL;
    }
}

// Определяем пути относительно текущего скрипта
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/MOHFiles';

try {
    echo "Starting test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateMOHFileTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
