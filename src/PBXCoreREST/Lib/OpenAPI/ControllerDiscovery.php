<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\OpenAPI;

/**
 * Utility class for discovering REST API controllers
 *
 * Automatically scans the Controllers directory and finds all RestController.php files,
 * converting them to fully qualified class names for metadata scanning.
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class ControllerDiscovery
{
    /**
     * Cached list of discovered controllers
     *
     * @var array<string>|null
     */
    private static ?array $cachedControllers = null;

    /**
     * Automatically discover all REST API controllers
     *
     * Scans the Controllers directory and finds all RestController.php files,
     * then converts them to fully qualified class names.
     *
     * Results are cached for performance - subsequent calls return cached list.
     *
     * @param bool $forceRefresh Force re-scan even if cache exists
     * @return array<string> List of controller class names
     */
    public static function discoverAll(bool $forceRefresh = false): array
    {
        // Return cached result if available
        if (self::$cachedControllers !== null && !$forceRefresh) {
            return self::$cachedControllers;
        }

        $controllers = [];
        $controllersPath = dirname(__DIR__, 2) . '/Controllers';

        // Scan all subdirectories in Controllers folder
        $directories = glob($controllersPath . '/*', GLOB_ONLYDIR);

        if ($directories === false) {
            self::$cachedControllers = [];
            return [];
        }

        foreach ($directories as $dir) {
            $controllerFile = $dir . '/RestController.php';

            if (file_exists($controllerFile)) {
                // Extract namespace from directory name
                $namespace = basename($dir);
                $className = "\\MikoPBX\\PBXCoreREST\\Controllers\\{$namespace}\\RestController";

                if (class_exists($className)) {
                    $controllers[] = $className;
                }
            }
        }

        sort($controllers); // Sort for consistent ordering

        // Cache the result
        self::$cachedControllers = $controllers;

        return $controllers;
    }

    /**
     * Clear the controller cache
     *
     * Useful for testing or when controllers are dynamically added/removed.
     *
     * @return void
     */
    public static function clearCache(): void
    {
        self::$cachedControllers = null;
    }

    /**
     * Get count of discovered controllers
     *
     * @return int Number of discovered controllers
     */
    public static function count(): int
    {
        return count(self::discoverAll());
    }
}
