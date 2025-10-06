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

namespace MikoPBX\Tests\AdminCabinet\Tests\Traits;

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Trait EntityCreationTrait
 * Provides helper methods for conditional entity creation in tests
 *
 * @package MikoPBX\Tests\AdminCabinet\Tests\Traits
 */
trait EntityCreationTrait
{
    /**
     * Creates an entity if it doesn't already exist
     *
     * @param string $entityName Name of the entity for logging purposes
     * @param string $testClass Fully qualified test class name
     * @param string $testMethod Test method to call for creating the entity
     * @param callable $existsCallback Callback that returns true if entity exists
     * @param string $entityType Type of entity for logging (e.g., 'extension', 'provider', 'route')
     * @return void
     */
    private function createEntityIfNotExists(
        string $entityName,
        string $testClass,
        string $testMethod,
        callable $existsCallback,
        string $entityType = 'extension'
    ): void {
        if (!$existsCallback($entityName)) {
            try {
                /** @var MikoPBXTestsBase $testInstance */
                $testInstance = new $testClass();
                $testInstance->setUp();
                if (method_exists($testInstance, $testMethod)) {
                    $testInstance->$testMethod();
                }
                self::annotate("Created $entityName $entityType");
            } catch (\Exception $e) {
                self::annotate("$entityName $entityType creation failed: " . $e->getMessage());
            }
        } else {
            self::annotate("$entityName $entityType already exists - skipping creation");
        }
    }
}
