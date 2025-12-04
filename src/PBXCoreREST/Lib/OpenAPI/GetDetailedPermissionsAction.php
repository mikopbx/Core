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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Modules\Config\RestAPIConfigInterface;
use MikoPBX\PBXCoreREST\Attributes\ApiResource;
use MikoPBX\PBXCoreREST\Attributes\HttpMapping;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Services\ApiMetadataRegistry;
use Phalcon\Di\Di;
use MikoPBX\Common\Library\Text;
use ReflectionClass;
use Throwable;

use function MikoPBX\Common\Config\appPath;

/**
 * Get detailed permissions structure for ACL management UI
 *
 * Returns a comprehensive view of all controllers and their actions for building
 * ACL tree in ModuleUsersUI. Includes AdminCabinet controllers, REST API controllers,
 * and module controllers.
 *
 * WHY: Replaces fragile local code parsing in ModuleUsersUI with a centralized API
 * that Core controls and maintains. This ensures compatibility when Core changes
 * controller patterns (e.g., migrating from Phalcon Annotations to PHP 8 Attributes).
 *
 * NOTE: Exclusion rules (alwaysAllowed, alwaysDenied, linkedActions) are NOT returned
 * by this API. ModuleUsersUI maintains and applies these rules locally.
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class GetDetailedPermissionsAction
{
    /**
     * Category identifier for AdminCabinet controllers
     */
    private const CATEGORY_ADMIN_CABINET = 'AdminCabinet';

    /**
     * Category identifier for Core REST API controllers
     */
    private const CATEGORY_PBX_CORE_REST = 'PBX_CORE_REST';

    /**
     * Type identifier for MVC (App) controllers
     */
    private const TYPE_APP = 'APP';

    /**
     * Type identifier for REST API controllers
     */
    private const TYPE_REST = 'REST';

    /**
     * Get detailed permissions structure for ACL management
     *
     * Discovers all controllers (AdminCabinet, REST API, Modules) and returns
     * a comprehensive structure suitable for building ACL tree in UI.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();

        try {
            // Build categories from different sources
            $categories = [];

            // 1. Scan AdminCabinet controllers (MVC pattern)
            $adminCabinetData = self::scanAdminCabinetControllers();
            if (!empty($adminCabinetData)) {
                $categories[self::CATEGORY_ADMIN_CABINET] = $adminCabinetData;
            }

            // 2. Scan REST API controllers (Pattern 4 - PHP 8 Attributes)
            // WHY: Returns separate Core and Module endpoints
            // Core endpoints go to PBX_CORE_REST, Module endpoints merged with module categories
            $restApiData = self::scanRestApiControllers();

            // 2a. Add Core REST endpoints to PBX_CORE_REST category
            if (!empty($restApiData['core']['controllers'])) {
                $categories[self::CATEGORY_PBX_CORE_REST] = $restApiData['core'];
            }

            // 3. Scan Module APP controllers (MVC pattern in modules)
            $moduleAppData = self::scanModuleAppControllers();
            foreach ($moduleAppData as $moduleId => $data) {
                $categories[$moduleId] = $data;
            }

            // 4. Scan Module REST controllers (Pattern 2 legacy)
            $moduleRestData = self::scanModuleRestControllers();
            foreach ($moduleRestData as $moduleId => $data) {
                if (isset($categories[$moduleId])) {
                    // WHY defensive merge: Different controller types (APP vs REST Pattern 2) may
                    // have different path conventions. We use + operator to preserve existing keys
                    // and only add new ones, preventing silent overwrites.
                    $categories[$moduleId]['controllers'] =
                        ($categories[$moduleId]['controllers'] ?? []) + ($data['controllers'] ?? []);
                } else {
                    $categories[$moduleId] = $data;
                }
            }

            // 5. Merge Module REST v3 endpoints (Pattern 4) from step 2
            // WHY: Module Pattern 4 endpoints were discovered in scanRestApiControllers()
            // but separated from Core endpoints for proper categorization
            foreach ($restApiData['modules'] ?? [] as $moduleId => $moduleControllers) {
                if (isset($categories[$moduleId])) {
                    // WHY defensive merge: Pattern 4 REST endpoints have unique /pbxcore/api/v3/...
                    // paths that shouldn't conflict with APP or Pattern 2 controllers, but we use
                    // + operator to be safe and preserve any existing controller data.
                    $categories[$moduleId]['controllers'] =
                        ($categories[$moduleId]['controllers'] ?? []) + $moduleControllers;
                } else {
                    // New module category with only REST v3 endpoints
                    $categories[$moduleId] = [
                        'type' => self::TYPE_REST,
                        'controllers' => $moduleControllers
                    ];
                }
            }

            $res->data = [
                'categories' => $categories
            ];

            $res->success = true;

        } catch (Throwable $e) {
            $res->messages['error'][] = 'Failed to generate detailed permissions: ' . $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }

        return $res;
    }

    /**
     * Scan AdminCabinet controllers for actions
     *
     * WHY: AdminCabinet uses MVC pattern with action methods ending in "Action"
     * These controllers handle web UI requests and need ACL protection.
     *
     * @return array{type: string, controllers: array<string, array{name: string, label: string, actions: array<string>}>}
     */
    private static function scanAdminCabinetControllers(): array
    {
        $controllers = [];
        $controllersDir = appPath('src/AdminCabinet/Controllers');

        if (!is_dir($controllersDir)) {
            return [
                'type' => self::TYPE_APP,
                'controllers' => []
            ];
        }

        $controllerFiles = glob("{$controllersDir}/*.php", GLOB_NOSORT);

        if ($controllerFiles === false) {
            return [
                'type' => self::TYPE_APP,
                'controllers' => []
            ];
        }

        foreach ($controllerFiles as $file) {
            $className = pathinfo($file, PATHINFO_FILENAME);
            $controllerClass = 'MikoPBX\\AdminCabinet\\Controllers\\' . $className;

            // Extract controller name without "Controller" suffix
            $controllerName = str_replace('Controller', '', $className);

            // Get public action methods using reflection
            $actions = self::getControllerActions($controllerClass);

            if (!empty($actions)) {
                $controllers[$controllerClass] = [
                    'name' => $controllerName,
                    'label' => $controllerName,
                    'actions' => $actions
                ];
            }
        }

        return [
            'type' => self::TYPE_APP,
            'controllers' => $controllers
        ];
    }

    /**
     * Scan REST API controllers for actions (Core and Module Pattern 4)
     *
     * WHY: REST API uses Pattern 4 (PHP 8 Attributes) with ApiResource and HttpMapping
     * We reuse ControllerDiscovery and ApiMetadataRegistry that are already battle-tested
     * for OpenAPI generation.
     *
     * WHY separate Core from Module: Module REST v3 endpoints should appear in their
     * respective module categories, not in PBX_CORE_REST. This allows ACL tree to show
     * module endpoints grouped under the module name.
     *
     * @return array{core: array{type: string, controllers: array}, modules: array<string, array{type: string, controllers: array}>}
     */
    private static function scanRestApiControllers(): array
    {
        $coreControllers = [];
        $moduleControllers = []; // moduleId => [path => controllerData]

        // Discover all REST controllers using existing discovery mechanism
        $allControllers = ControllerDiscovery::discoverAll();

        // Create metadata registry to scan controllers
        $registry = new ApiMetadataRegistry();
        $metadata = $registry->scanControllers($allControllers);

        // Process each resource from metadata
        foreach ($metadata['resources'] ?? [] as $resource) {
            $resourceData = $resource['resource'] ?? [];
            $httpMapping = $resource['httpMapping'] ?? [];

            $path = $resourceData['path'] ?? '';
            if (empty($path)) {
                continue;
            }

            // WHY: Determine if this is a module controller by checking class namespace
            // Module controllers: Modules\{ModuleId}\Lib\RestAPI\...
            // Core controllers: MikoPBX\PBXCoreREST\Controllers\...
            $controllerClass = $resource['class'] ?? '';
            $moduleId = self::extractModuleIdFromClass($controllerClass);

            // Extract label from first tag
            $tags = $resourceData['tags'] ?? [];
            $label = !empty($tags) ? $tags[0] : '';

            // Extract resource name from path
            // /pbxcore/api/v3/extensions -> extensions
            $pathParts = explode('/', trim($path, '/'));
            $resourceName = end($pathParts);

            // Collect all actions from HTTP mapping
            $actions = [];
            $mapping = $httpMapping['mapping'] ?? [];

            foreach ($mapping as $httpMethod => $operations) {
                $ops = is_string($operations) ? [$operations] : $operations;
                $actions = array_merge($actions, $ops);
            }

            // Add custom methods
            foreach ($httpMapping['custom'] ?? [] as $customMethod) {
                if (!in_array($customMethod, $actions)) {
                    $actions[] = $customMethod;
                }
            }

            $actions = array_unique($actions);

            if (!empty($actions)) {
                $controllerData = [
                    'name' => $resourceName,
                    'label' => $label,
                    'actions' => array_values($actions)
                ];

                // WHY: Separate Core and Module endpoints
                // Core endpoints go to PBX_CORE_REST category
                // Module endpoints go to their respective module categories
                if ($moduleId === null) {
                    // Core controller
                    $coreControllers[$path] = $controllerData;
                } else {
                    // Module controller - group by moduleId
                    if (!isset($moduleControllers[$moduleId])) {
                        $moduleControllers[$moduleId] = [];
                    }
                    $moduleControllers[$moduleId][$path] = $controllerData;
                }
            }
        }

        return [
            'core' => [
                'type' => self::TYPE_REST,
                'controllers' => $coreControllers
            ],
            'modules' => $moduleControllers
        ];
    }

    /**
     * Scan Module APP controllers for actions
     *
     * WHY: Modules can have MVC controllers in App/Controllers directory
     * These follow the same pattern as AdminCabinet controllers.
     *
     * @return array<string, array{type: string, controllers: array<string, array{name: string, label: string, actions: array<string>}>}>
     */
    private static function scanModuleAppControllers(): array
    {
        $result = [];
        $modulesDir = Directories::getDir(Directories::CORE_MODULES_DIR);

        if (!is_dir($modulesDir)) {
            return $result;
        }

        // Get only enabled modules
        $enabledModules = PbxExtensionModules::find([
            'conditions' => 'disabled = :disabled:',
            'bind' => ['disabled' => '0']
        ]);

        foreach ($enabledModules as $module) {
            $moduleId = $module->uniqid;
            $controllersDir = "{$modulesDir}/{$moduleId}/App/Controllers";

            if (!is_dir($controllersDir)) {
                continue;
            }

            $controllerFiles = glob("{$controllersDir}/*.php", GLOB_NOSORT);

            if ($controllerFiles === false) {
                continue;
            }

            $controllers = [];
            foreach ($controllerFiles as $file) {
                $className = pathinfo($file, PATHINFO_FILENAME);
                $controllerClass = "Modules\\{$moduleId}\\App\\Controllers\\{$className}";
                $controllerName = str_replace('Controller', '', $className);

                $actions = self::getControllerActions($controllerClass);

                if (!empty($actions)) {
                    $controllers[$controllerClass] = [
                        'name' => $controllerName,
                        'label' => $controllerName,
                        'actions' => $actions
                    ];
                }
            }

            if (!empty($controllers)) {
                $result[$moduleId] = [
                    'type' => self::TYPE_APP,
                    'controllers' => $controllers
                ];
            }
        }

        return $result;
    }

    /**
     * Scan Module REST controllers for actions
     *
     * WHY: Modules can provide REST API through two patterns:
     * - Pattern 2: Legacy moduleRestAPICallback with Phalcon Annotations
     * - Pattern 4: Modern Lib/RestAPI/* with PHP 8 Attributes
     *
     * Pattern 4 controllers are already discovered by ControllerDiscovery::discoverAll()
     * and included in scanRestApiControllers(). Here we handle Pattern 2 modules.
     *
     * @return array<string, array{type: string, controllers: array<string, array{name: string, label: string, actions: array<string>}>}>
     */
    private static function scanModuleRestControllers(): array
    {
        $result = [];
        $di = Di::getDefault();

        if ($di === null) {
            return $result;
        }

        // Get module config objects from DI
        $configObjects = $di->getShared(PBXConfModulesProvider::SERVICE_NAME);

        if (empty($configObjects) || !is_iterable($configObjects)) {
            return $result;
        }

        foreach ($configObjects as $configObject) {
            $moduleId = $configObject->moduleUniqueId ?? '';

            if (empty($moduleId)) {
                continue;
            }

            $controllers = [];

            // Pattern 2: moduleRestAPICallback
            if (method_exists($configObject, RestAPIConfigInterface::MODULE_RESTAPI_CALLBACK)) {
                // Build endpoint path using kebab-case module name
                $controllerName = '/pbxcore/api/modules/' . Text::uncamelize($moduleId, '-');

                // WHY '*' wildcard: Pattern 2 modules use Phalcon Annotations which require
                // loading Annotations Reader and instantiating the controller to parse.
                // We use '*' wildcard to indicate "all actions" for this endpoint.
                //
                // UI handling: The frontend (ModuleUsersUI) should interpret '*' as:
                // - Display: "All actions" or similar label
                // - ACL logic: Grant/deny permission to entire endpoint, not individual actions
                // - User experience: Collapsible single item instead of listing unknown actions
                $controllers[$controllerName] = [
                    'name' => $moduleId,
                    'label' => $moduleId,
                    'actions' => ['*']
                ];
            }

            // Pattern 2: getPBXCoreRESTAdditionalRoutes
            if (method_exists($configObject, RestAPIConfigInterface::GET_PBXCORE_REST_ADDITIONAL_ROUTES)) {
                try {
                    $routes = $configObject->getPBXCoreRESTAdditionalRoutes();

                    if (is_array($routes)) {
                        // Group routes by root URL
                        $routesByRoot = [];
                        foreach ($routes as $route) {
                            // Route format: [ControllerClass, ActionMethod, Path, HttpMethod, RootUrl, NoAuth]
                            if (!is_array($route) || count($route) < 5) {
                                continue;
                            }

                            $rootUrl = $route[4] ?? '';
                            if (empty($rootUrl)) {
                                continue;
                            }

                            $action = $route[1] ?? '';
                            if (empty($action)) {
                                continue;
                            }

                            if (!isset($routesByRoot[$rootUrl])) {
                                $routesByRoot[$rootUrl] = [];
                            }

                            if (!in_array($action, $routesByRoot[$rootUrl])) {
                                $routesByRoot[$rootUrl][] = $action;
                            }
                        }

                        // Add grouped routes to controllers
                        foreach ($routesByRoot as $rootUrl => $actions) {
                            if (!empty($actions)) {
                                $controllers[$rootUrl] = [
                                    'name' => $moduleId,
                                    'label' => $moduleId,
                                    'actions' => $actions
                                ];
                            }
                        }
                    }
                } catch (Throwable $e) {
                    // Skip modules with broken route definitions
                    continue;
                }
            }

            if (!empty($controllers)) {
                if (isset($result[$moduleId])) {
                    // WHY defensive merge: A module may have both moduleRestAPICallback and
                    // getPBXCoreRESTAdditionalRoutes. Use + operator to preserve existing keys.
                    $result[$moduleId]['controllers'] =
                        ($result[$moduleId]['controllers'] ?? []) + $controllers;
                } else {
                    $result[$moduleId] = [
                        'type' => self::TYPE_REST,
                        'controllers' => $controllers
                    ];
                }
            }
        }

        return $result;
    }

    /**
     * Extract module ID from controller class name
     *
     * WHY: Module REST API controllers have namespace pattern Modules\{ModuleId}\...
     * Core controllers have pattern MikoPBX\... and return null
     * Used to separate module endpoints from PBX_CORE_REST category
     *
     * @param string $controllerClass Fully qualified controller class name
     * @return string|null Module ID if module controller, null for Core controllers
     */
    private static function extractModuleIdFromClass(string $controllerClass): ?string
    {
        // Pattern: Modules\ModuleExampleRestAPIv3\Lib\RestAPI\Tasks\Controller
        // Extract: ModuleExampleRestAPIv3
        if (preg_match('#^Modules\\\\([^\\\\]+)\\\\#', $controllerClass, $matches)) {
            return $matches[1];
        }

        // Core controllers (MikoPBX\...) return null
        return null;
    }

    /**
     * Get public action methods from a controller class
     *
     * WHY: MVC controllers have action methods ending with "Action" suffix
     * We use reflection to find all public methods matching this pattern.
     *
     * @param string $controllerClass Fully qualified controller class name
     * @return array<string> List of action names (without "Action" suffix)
     */
    private static function getControllerActions(string $controllerClass): array
    {
        $actions = [];

        if (!class_exists($controllerClass)) {
            return $actions;
        }

        try {
            $reflection = new ReflectionClass($controllerClass);

            // Skip abstract classes
            if ($reflection->isAbstract()) {
                return $actions;
            }

            // Find all public methods ending with "Action"
            foreach ($reflection->getMethods(\ReflectionMethod::IS_PUBLIC) as $method) {
                $methodName = $method->getName();

                if (str_ends_with($methodName, 'Action')) {
                    // Remove "Action" suffix
                    $actionName = substr($methodName, 0, -6);
                    $actions[] = $actionName;
                }
            }
        } catch (Throwable $e) {
            // Skip classes that can't be reflected
            return $actions;
        }

        return $actions;
    }
}
