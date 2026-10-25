<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\ModulesManagementProcessor;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * keepSettings is optional in modules/{id}:uninstall (#1265): a missing key
 * must mean false instead of an "Undefined array key" error.
 */
class ModulesManagementProcessorTest extends TestCase
{
    /**
     * @dataProvider boolParamProvider
     */
    public function testBoolParam(array $data, bool $expected): void
    {
        $method = new ReflectionMethod(ModulesManagementProcessor::class, 'boolParam');
        $this->assertSame($expected, $method->invoke(null, $data, 'keepSettings'));
    }

    public static function boolParamProvider(): array
    {
        return [
            'missing' => [[], false],
            'string true' => [['keepSettings' => 'true'], true],
            'string false' => [['keepSettings' => 'false'], false],
            'string 1' => [['keepSettings' => '1'], true],
            'json true' => [['keepSettings' => true], true],
            'json false' => [['keepSettings' => false], false],
            'empty' => [['keepSettings' => ''], false],
        ];
    }
}
