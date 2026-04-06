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

use MikoPBX\Tests\AdminCabinet\Tests\Data\OutOfWorkPeriodsDataFactory;
use RuntimeException;

/**
 * Generator for Out of Work Period test classes
 */
class GenerateOutOfWorkPeriodTests
{
    /**
     * Template for Out of Work Period test class
     */
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

namespace MikoPBX\Tests\AdminCabinet\Tests\OutOfWorkPeriods;

use MikoPBX\Tests\AdminCabinet\Tests\CreateOutOfWorkPeriodTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\OutOfWorkPeriodsDataFactory;

/**
* Test class for creating %s period
*
* Description: %s
* Type: %s
* Time: %s
* Action: %s
*/
class %sTest extends CreateOutOfWorkPeriodTest
{
    protected function getPeriodData(): array
    {
        return OutOfWorkPeriodsDataFactory::getPeriodData('%s');
    }
}

PHP;

    /**
     * Generate test classes for all periods
     *
     * @param string $outputDir Output directory for test classes
     * @return void
     * @throws RuntimeException If directory creation fails
     */
    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new RuntimeException("Failed to create directory: $outputDir");
        }

        echo "Starting Out of Work Period test class generation..." . PHP_EOL;
        echo "Output directory: $outputDir" . PHP_EOL;

        foreach (OutOfWorkPeriodsDataFactory::getAllPeriodKeys() as $periodKey) {
            self::generatePeriodTestClass($outputDir, $periodKey);
        }

        echo "Out of Work Period test class generation completed!" . PHP_EOL;
    }

    /**
     * Generate test class for a specific period
     *
     * @param string $outputDir Output directory
     * @param string $periodKey Period key
     * @return void
     * @throws RuntimeException If file writing fails
     */
    private static function generatePeriodTestClass(string $outputDir, string $periodKey): void
    {
        $periodData = OutOfWorkPeriodsDataFactory::getPeriodData($periodKey);

        // Generate class name
        $className = str_replace(
            [' ', '.', '-'],
            '',
            ucwords($periodKey, ' .-')
        );

        // Get period type description
        $periodType = self::getPeriodType($periodData);

        // Get time description
        $timeDescription = self::getTimeDescription($periodData);

        // Get action description
        $actionDescription = self::getActionDescription($periodData);

        // Generate content
        $content = sprintf(
            self::TEMPLATE,
            ucwords(str_replace('.', ' ', $periodKey)),
            $periodData['description'],
            $periodType,
            $timeDescription,
            $actionDescription,
            $className,
            $periodKey
        );

        // Write file
        $filename = $outputDir . '/' . $className . 'Test.php';
        if (file_put_contents($filename, $content) === false) {
            throw new RuntimeException("Failed to write file: $filename");
        }

        echo sprintf(
            "Generated test class for period %s (%s) -> %s" . PHP_EOL,
            $periodKey,
            $periodType,
            $filename
        );
    }

    /**
     * Get period type description
     *
     * @param array $periodData Period data
     * @return string Period type description
     */
    private static function getPeriodType(array $periodData): string
    {
        if (!empty($periodData['date_from'])) {
            return 'Date Range';
        }
        if ($periodData['weekday_from'] !== '-1') {
            return 'Weekly';
        }
        if (!empty($periodData['time_from'])) {
            return 'Daily Time Range';
        }
        return 'Unknown';
    }

    /**
     * Get time description
     *
     * @param array $periodData Period data
     * @return string Time description
     */
    private static function getTimeDescription(array $periodData): string
    {
        if (!empty($periodData['date_from'])) {
            return sprintf("From %s to %s", $periodData['date_from'], $periodData['date_to']);
        }
        if ($periodData['weekday_from'] !== '-1') {
            return sprintf(
                "Weekdays %s to %s%s",
                self::getWeekdayName($periodData['weekday_from']),
                self::getWeekdayName($periodData['weekday_to']),
                !empty($periodData['time_from']) ? " {$periodData['time_from']} - {$periodData['time_to']}" : ""
            );
        }
        if (!empty($periodData['time_from'])) {
            return sprintf("Daily %s - %s", $periodData['time_from'], $periodData['time_to']);
        }
        return 'All time';
    }

    /**
     * Get weekday name
     *
     * @param string $weekday Weekday number
     * @return string Weekday name
     */
    private static function getWeekdayName(string $weekday): string
    {
        $weekdays = [
            '-1' => 'Any',
            '1' => 'Monday',
            '2' => 'Tuesday',
            '3' => 'Wednesday',
            '4' => 'Thursday',
            '5' => 'Friday',
            '6' => 'Saturday',
            '7' => 'Sunday'
        ];
        return $weekdays[$weekday] ?? $weekday;
    }

    /**
     * Get action description
     *
     * @param array $periodData Period data
     * @return string Action description
     */
    private static function getActionDescription(array $periodData): string
    {
        switch ($periodData['action']) {
            case 'extension':
                return sprintf("Forward to extension %s", $periodData['extension']);
            case 'playmessage':
                return sprintf("Play message ID %s", $periodData['audio_message_id']);
            default:
                return $periodData['action'];
        }
    }
}

// Определяем пути относительно текущего скрипта
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/OutOfWorkPeriods';

try {
    echo "Starting test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateOutOfWorkPeriodTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
