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

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Directories;

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
     * WHY: Include both Core and Module controllers for complete OpenAPI spec
     * Module controllers discovered via discoverModuleControllers()
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

        // Discover Core controllers
        $controllers = self::discoverCoreControllers();

        // Discover Module controllers
        $moduleControllers = self::discoverModuleControllers();
        $controllers = array_merge($controllers, $moduleControllers);

        sort($controllers); // Sort for consistent ordering

        // Cache the result
        self::$cachedControllers = $controllers;

        return $controllers;
    }

    /**
     * Discover Core REST API controllers
     *
     * Scans the PBXCoreREST/Controllers directory for Core controllers
     *
     * @return array<string> List of Core controller class names
     */
    private static function discoverCoreControllers(): array
    {
        $controllers = [];
        $controllersPath = dirname(__DIR__, 2) . '/Controllers';

        // Scan all subdirectories in Controllers folder
        $directories = glob($controllersPath . '/*', GLOB_ONLYDIR);

        if ($directories === false) {
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

        return $controllers;
    }

    /**
     * Discover Module REST API controllers
     *
     * WHY: Scans enabled modules for Lib/RestAPI/{Resource}/Controller.php
     * Only includes controllers with ApiResource attribute
     *
     * NEW PATTERN (2025):
     * Modules/{ModuleName}/Lib/RestAPI/{Resource}/Controller.php
     * Example: Modules/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Controller.php
     *
     * @return array<string> List of Module controller class names
     */
    private static function discoverModuleControllers(): array
    {
        $controllers = [];

        // Get path to installed modules (/storage/usbdisk1/mikopbx/custom_modules/)
        $modulesPath = Directories::getDir(Directories::CORE_MODULES_DIR);

        // Check if modules directory exists
        if (!is_dir($modulesPath)) {
            return $controllers;
        }

        // Get only enabled modules from database
        $enabledModules = PbxExtensionModules::find([
            'conditions' => 'disabled = :disabled:',
            'bind' => ['disabled' => '0']
        ]);

        // Scan each enabled module
        foreach ($enabledModules as $module) {
            $moduleName = $module->uniqid;
            $moduleDir = "{$modulesPath}/{$moduleName}";
            $restApiPath = "{$moduleDir}/Lib/RestAPI";

            // Skip if module doesn't have Lib/RestAPI directory
            if (!is_dir($restApiPath)) {
                continue;
            }

            // Recursively scan Lib/RestAPI directory for Controller.php files
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($restApiPath, \RecursiveDirectoryIterator::SKIP_DOTS)
            );

            /** @var \SplFileInfo $file */
            foreach ($iterator as $file) {
                if (!($file instanceof \SplFileInfo) || $file->getExtension() !== 'php') {
                    continue;
                }

                // Only process files named *Controller.php
                if (!str_ends_with($file->getFilename(), 'Controller.php')) {
                    continue;
                }

                // Extract class name from file path
                // Example: Tasks/Controller.php -> Tasks\Controller
                $relativePath = str_replace($restApiPath . '/', '', $file->getPathname());
                $relativePath = str_replace('.php', '', $relativePath);
                $className = str_replace('/', '\\', $relativePath);

                // Build full controller class name
                // Example: Modules\ModuleExampleRestAPIv3\Lib\RestAPI\Tasks\Controller
                $controllerClass = "Modules\\{$moduleName}\\Lib\\RestAPI\\{$className}";

                // Check if class exists and has ApiResource attribute
                if (!class_exists($controllerClass)) {
                    continue;
                }

                // WHY: Only include controllers with #[ApiResource] attribute
                // This matches the pattern used in RouterProvider::discoverModuleControllers()
                try {
                    $reflection = new \ReflectionClass($controllerClass);
                    $attributes = $reflection->getAttributes(\MikoPBX\PBXCoreREST\Attributes\ApiResource::class);

                    if (!empty($attributes)) {
                        $controllers[] = $controllerClass;
                    }
                } catch (\ReflectionException $e) {
                    // Skip classes that can't be reflected
                    continue;
                }
            }
        }

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
