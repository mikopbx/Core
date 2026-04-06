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

use MikoPBX\Tests\AdminCabinet\Tests\Data\ConferenceRoomsDataFactory;
use RuntimeException;

/**
 * Class GenerateConferenceRoomTests
 * Generator for conference room test classes
 */
class GenerateConferenceRoomTests
{
    /**
     * List of conference rooms to exclude from automatic test generation
     */
    private const array EXCLUDED_CONFERENCE_ROOMS = [
        // Add any conference rooms to exclude here
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

namespace MikoPBX\Tests\AdminCabinet\Tests\ConferenceRooms;

use MikoPBX\Tests\AdminCabinet\Tests\Data\ConferenceRoomsDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\CreateConferenceRoomsTest;

/**
 * Test class for creating conference room: %s
 */
class %sTest extends CreateConferenceRoomsTest
{
    /**
     * Get conference room test data
     *
     * @return array
     */
    protected function getConferenceRoomData(): array
    {
        return ConferenceRoomsDataFactory::getConferenceRoomData('%s');
    }
}

PHP;

    /**
     * Generate test classes for all conference rooms
     *
     * @param string $outputDir Directory for generated test files
     * @return void
     */
    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new RuntimeException("Directory '$outputDir' was not created");
        }

        foreach (ConferenceRoomsDataFactory::getAllConferenceKeys() as $conferenceKey) {
            // Skip excluded conference rooms
            if (in_array($conferenceKey, self::EXCLUDED_CONFERENCE_ROOMS, true)) {
                continue;
            }
            
            $conferenceData = ConferenceRoomsDataFactory::getConferenceRoomData($conferenceKey);
            
            // Generate class name from conference key
            // Convert snake_case and kebab-case to PascalCase
            $className = str_replace(['-', '_', '.'], ' ', $conferenceKey);
            $className = str_replace(' ', '', ucwords($className));
            
            $content = sprintf(
                self::TEMPLATE,
                $conferenceData['name'],
                $className,
                $conferenceKey
            );

            $filename = $outputDir . '/' . $className . 'Test.php';

            if (file_put_contents($filename, $content) === false) {
                throw new RuntimeException("Failed to write to file: $filename");
            }

            echo "Generated test class for {$conferenceData['name']} (Extension: {$conferenceData['extension']})" . PHP_EOL;
        }
    }
}

// Define paths relative to current script
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/ConferenceRooms';

try {
    echo "Starting conference room test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateConferenceRoomTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}