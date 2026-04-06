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

use MikoPBX\Tests\AdminCabinet\Tests\Data\ModuleDataFactory;
use RuntimeException;

/**
 * Generator for Module test classes
 */
class GenerateModuleTests
{
    /**
     * Template for module test class
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

namespace MikoPBX\Tests\AdminCabinet\Tests\PBXExtensions;

use MikoPBX\Tests\AdminCabinet\Tests\InstallModuleTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\ModuleDataFactory;

/**
* Test class for installing %s module
*
* Module ID: %s
* State: %s
*/
class %sTest extends InstallModuleTest
{
    protected function getModuleData(): array
    {
        return ModuleDataFactory::getModuleData('%s');
    }
}

PHP;

    /**
     * Generate test classes for modules
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

        echo "Starting test class generation..." . PHP_EOL;

        foreach (ModuleDataFactory::getAllModuleKeys() as $moduleKey) {
            self::generateModuleTestClass($outputDir, $moduleKey);
        }

        echo "Test class generation completed!" . PHP_EOL;
    }

    /**
     * Generate test class for a specific module
     *
     * @param string $outputDir Output directory
     * @param string $moduleKey Module key
     * @return void
     * @throws RuntimeException If file writing fails
     */
    private static function generateModuleTestClass(string $outputDir, string $moduleKey): void
    {
        $moduleData = ModuleDataFactory::getModuleData($moduleKey);

        // Generate class name
        $className = str_replace(
            ['Module', '.'],
            '',
            ucwords($moduleData['moduleId'], '.')
        );

        // Get module description
        $moduleDescription = self::getModuleDescription($moduleData['moduleId']);

        // Get state description
        $stateDescription = $moduleData['enable'] ? 'Enabled after installation' : 'Disabled after installation';

        // Generate content
        $content = sprintf(
            self::TEMPLATE,
            $moduleDescription,
            $moduleData['moduleId'],
            $stateDescription,
            $className,
            $moduleKey
        );

        // Write file
        $filename = $outputDir . '/' . $className . 'Test.php';
        if (file_put_contents($filename, $content) === false) {
            throw new RuntimeException("Failed to write file: $filename");
        }

        echo sprintf(
            "Generated test class for module %s (%s) -> %s" . PHP_EOL,
            $moduleData['moduleId'],
            $stateDescription,
            $filename
        );
    }

    /**
     * Get human-readable module description
     *
     * @param string $moduleId Module ID
     * @return string Module description
     */
    private static function getModuleDescription(string $moduleId): string
    {
        $descriptions = [
            'ModuleAutoprovision' => 'Auto Provisioning',
            'ModuleBackup' => 'Backup',
            'ModuleCTIClient' => 'CTI Client',
            'ModuleDocker' => 'Docker',
            'ModulePhoneBook' => 'Phone Book',
            'ModuleSmartIVR' => 'Smart IVR',
            'ModuleTelegramNotify' => 'Telegram Notifications',
            'ModuleUsersGroups' => 'User Groups',
        ];

        return $descriptions[$moduleId] ?? $moduleId;
    }
}

// Определяем пути относительно текущего скрипта
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/PBXExtensions';

try {
    echo "Starting test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateModuleTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
