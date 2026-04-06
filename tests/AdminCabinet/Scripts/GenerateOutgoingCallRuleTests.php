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

use MikoPBX\Tests\AdminCabinet\Tests\Data\OutgoingCallRulesDataFactory;

/**
 * Generator for Outgoing Call Rule test classes
 */
class GenerateOutgoingCallRuleTests
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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\OutgoingCallRules;

use MikoPBX\Tests\AdminCabinet\Tests\CreateOutgoingCallRuleTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\OutgoingCallRulesDataFactory;

/**
 * Test class for creating %s
 * 
 * Rule Type: %s
 * Name: %s
 * Pattern: %s
 * Provider: %s
 * Description: %s
 * 
 * Number Handling:
 * - Rest Numbers: %s
 * - Trim From Begin: %s
 * - Prepend: %s
 */
class %sTest extends CreateOutgoingCallRuleTest
{
    protected function getRuleData(): array
    {
        return OutgoingCallRulesDataFactory::getRuleData('%s');
    }
}
PHP;

    public static function generateTestClasses(string $outputDir): void
    {
        if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
            throw new \RuntimeException("Failed to create directory: $outputDir");
        }

        echo "Starting Outgoing Call Rule test class generation..." . PHP_EOL;

        foreach (OutgoingCallRulesDataFactory::getAllRuleKeys() as $ruleKey) {
            $ruleData = OutgoingCallRulesDataFactory::getRuleData($ruleKey);

            $className = str_replace(['.', ' '], '', ucwords($ruleKey, '. '));

            $provider = !empty($ruleData['providerName'])
                ? $ruleData['providerName']
                : ($ruleData['providerid'] ?: 'None');

            $pattern = $ruleData['numberbeginswith'] ?: 'Any';

            $content = sprintf(
                self::TEMPLATE,
                $ruleData['rulename'],
                $ruleData['type'],
                $ruleData['rulename'],
                $pattern,
                $provider,
                $ruleData['description'],
                $ruleData['restnumbers'],
                $ruleData['trimfrombegin'],
                $ruleData['prepend'] ?: 'None',
                $className,
                $ruleKey
            );

            $filename = $outputDir . '/' . $className . 'Test.php';

            if (file_put_contents($filename, $content) === false) {
                throw new \RuntimeException("Failed to write file: $filename");
            }

            echo sprintf(
                "Generated test class for %s rule '%s' -> %s\n",
                $ruleData['type'],
                $ruleData['rulename'],
                $filename
            );
        }

        echo "Outgoing Call Rule test class generation completed!" . PHP_EOL;
    }
}
// Определяем пути относительно текущего скрипта
$baseDir = dirname(__DIR__); // Tests/AdminCabinet
$outputDir = $baseDir . '/Tests/OutgoingCallRules';

try {
    echo "Starting test class generation..." . PHP_EOL;
    echo "Output directory: $outputDir" . PHP_EOL;
    GenerateOutgoingCallRuleTests::generateTestClasses($outputDir);
    echo "Test class generation completed successfully!" . PHP_EOL;
} catch (\Exception $e) {
    echo "Error generating test classes: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

