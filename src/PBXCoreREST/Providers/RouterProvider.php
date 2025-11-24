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

namespace MikoPBX\PBXCoreREST\Providers;

use MikoPBX\PBXCoreREST\Controllers\Modules\ModulesControllerBase;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Modules\Config\RestAPIConfigInterface;
use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use MikoPBX\PBXCoreREST\Middleware\ResponseMiddleware;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Events\Manager;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\Collection;
use Phalcon\Events\Event;

/**
 * Universal Router Provider with Zero-Configuration Auto-Discovery
 *
 * This class automatically discovers and configures routes for all RESTful controllers
 * using a universal rule set that supports all REST patterns without manual configuration.
 *
 * @package MikoPBX\PBXCoreREST\Providers
 */
class RouterProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = '';

    /**
     * Universal ID patterns - covers ALL possible ID formats
     */
    private const UNIVERSAL_ID_PATTERNS = [
        'any' => '[^/:]+',          // Matches anything except slash and colon (for custom methods)
        'numeric' => '[0-9]+',      // Numbers only
        'alpha' => '[a-zA-Z\\-]+',  // Letters and hyphens
        'alnum' => '[a-zA-Z0-9\\-_]+', // Alphanumeric with separators
        'uuid' => '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    ];

    /**
     * Special routes that don't follow standard patterns
     */
    private const SPECIAL_ROUTES = [];


    /**
     * Legacy routes configuration
     */
    private const LEGACY_ROUTES = [
        // User routes (both GET and POST)
        // Module routes (legacy - only for third-party modules)
        [ModulesControllerBase::class, 'callActionForModule', '/pbxcore/api/modules/{moduleName}/{actionName}', 'get', '/'],
        [ModulesControllerBase::class, 'callActionForModule', '/pbxcore/api/modules/{moduleName}/{actionName}', 'post', '/'],

        // Note: CoreGetController and CorePostController removed - use /pbxcore/api/v3/modules instead
    ];

    /**
     * Register response service provider
     */
    public function register(DiInterface $di): void
    {
        /** @var Micro $application */
        $application = $di->getShared('application');
        /** @var Manager $eventsManager */
        $eventsManager = $di->getShared('eventsManager');

        $this->attachRoutes($application);
        $this->attachMiddleware($application, $eventsManager);
        $this->attachModuleHooks($application, $eventsManager);

        $application->setEventsManager($eventsManager);
    }

    /**
     * Attaches the routes to the application
     */
    private function attachRoutes(Micro $application): void
    {
        $routes = $this->getAllRoutes();
        $this->mountRoutes($application, $routes);
    }

    /**
     * Get all routes using universal auto-discovery
     */
    private function getAllRoutes(): array
    {
        $routes = [
            // Special case routes (must be BEFORE universal routes for priority)
            ...self::SPECIAL_ROUTES,

            // Universal auto-discovered RESTful routes (Core)
            ...$this->discoverUniversalRoutes(),

            // Module Pattern 4 auto-discovered routes
            ...$this->discoverModuleControllers(),

            // Legacy routes
            ...self::LEGACY_ROUTES,
        ];

        // Add module routes if available (Pattern 2: Custom Controllers)
        $moduleRoutes = PBXConfModulesProvider::hookModulesMethod(
            RestAPIConfigInterface::GET_PBXCORE_REST_ADDITIONAL_ROUTES
        );

        if (!empty($moduleRoutes)) {
            $routes = [...$routes, ...array_merge(...array_values($moduleRoutes))];
        }

        return $routes;
    }

    /**
     * Universal route discovery - automatically handles ALL RESTful patterns
     */
    private function discoverUniversalRoutes(): array
    {
        $routes = [];
        $controllerPath = __DIR__ . '/../Controllers';

        // Scan all PHP files in Controllers directory recursively
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($controllerPath, \RecursiveDirectoryIterator::SKIP_DOTS)
        );

        /** @var \SplFileInfo $file */
        foreach ($iterator as $file) {
            if (!($file instanceof \SplFileInfo) || $file->getExtension() !== 'php') {
                continue;
            }

            // Extract class name from file path
            $relativePath = str_replace($controllerPath . '/', '', $file->getPathname());
            $relativePath = str_replace('.php', '', $relativePath);
            $className = str_replace('/', '\\', $relativePath);
            $controllerClass = "MikoPBX\\PBXCoreREST\\Controllers\\{$className}";

            // Check if class exists and has ApiResource attribute
            if (!class_exists($controllerClass)) {
                continue;
            }

            // Get resource path from ApiResource attribute
            $resourcePath = $this->getResourcePathFromAttribute($controllerClass);

            // Skip if no ApiResource attribute found
            if ($resourcePath === null) {
                continue;
            }

            // Generate UNIVERSAL routes for this controller
            $routes = [...$routes, ...$this->generateUniversalRoutes($controllerClass, $resourcePath)];
        }

        return $routes;
    }

    /**
     * Discover REST controllers from modules (Pattern 4)
     *
     * Scans enabled modules in CORE_MODULES_DIR for API/Controllers with #[ApiResource] attribute
     * This enables Pattern 4 (Modern v3) for third-party modules
     *
     * @return array Array of routes for discovered module controllers
     */
    private function discoverModuleControllers(): array
    {
        $routes = [];

        // Get path to installed modules (/storage/usbdisk1/mikopbx/custom_modules/)
        $modulesPath = Directories::getDir(Directories::CORE_MODULES_DIR);

        // Check if modules directory exists
        if (!is_dir($modulesPath)) {
            return $routes;
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
            $apiControllersPath = "{$moduleDir}/API/Controllers";

            // Skip if module doesn't have API/Controllers directory
            if (!is_dir($apiControllersPath)) {
                continue;
            }

            // Recursively scan API/Controllers directory for PHP files
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($apiControllersPath, \RecursiveDirectoryIterator::SKIP_DOTS)
            );

            /** @var \SplFileInfo $file */
            foreach ($iterator as $file) {
                if (!($file instanceof \SplFileInfo) || $file->getExtension() !== 'php') {
                    continue;
                }

                // Extract class name from file path
                // Example: Tasks/RestController.php -> Tasks\RestController
                $relativePath = str_replace($apiControllersPath . '/', '', $file->getPathname());
                $relativePath = str_replace('.php', '', $relativePath);
                $className = str_replace('/', '\\', $relativePath);

                // Build full controller class name
                // Example: Modules\ModuleExampleModern\API\Controllers\Tasks\RestController
                $controllerClass = "Modules\\{$moduleName}\\API\\Controllers\\{$className}";

                // Check if class exists
                if (!class_exists($controllerClass)) {
                    continue;
                }

                // Get resource path from ApiResource attribute
                $resourcePath = $this->getResourcePathFromAttribute($controllerClass);

                // Skip if no ApiResource attribute found
                if ($resourcePath === null) {
                    continue;
                }

                // Generate UNIVERSAL routes for this module controller
                $routes = [...$routes, ...$this->generateUniversalRoutes($controllerClass, $resourcePath)];
            }
        }

        return $routes;
    }

    /**
     * Generate universal routes that support ALL REST patterns
     */
    private function generateUniversalRoutes(string $controllerClass, string $resourcePath): array
    {
        // Check if controller has custom ID pattern via HttpMapping attribute
        $idPatterns = $this->getCustomIdPattern($controllerClass);

        // Normalize to array for unified processing
        $patterns = is_array($idPatterns) ? $idPatterns : [$idPatterns];

        // Register public endpoints in registry for AuthenticationMiddleware
        $this->registerPublicEndpoint($controllerClass, $resourcePath);

        return $this->generateRoutes($controllerClass, $resourcePath, $patterns);
    }

    /**
     * Generate routes for one or more ID patterns (unified method)
     */
    private function generateRoutes(string $controllerClass, string $resourcePath, array $patterns): array
    {
        // Check if this is a simple controller with direct method mapping (like OAuth2CallbackController)
        $isSimpleController = $this->isSimpleController($controllerClass);

        if ($isSimpleController) {
            // For simple controllers, generate only direct routes without CRUD patterns
            return $this->generateSimpleRoutes($controllerClass, $resourcePath);
        }

        // Get HttpMapping to determine which routes are actually needed
        $httpMapping = $this->getHttpMapping($controllerClass);
        if ($httpMapping === null) {
            // No HttpMapping found - generate all routes as fallback
            return $this->generateAllRoutes($controllerClass, $resourcePath, $patterns);
        }

        // Generate only routes that are defined in HttpMapping
        return $this->generateMappedRoutes($controllerClass, $resourcePath, $patterns, $httpMapping);
    }

    /**
     * Get HttpMapping attribute from controller
     */
    private function getHttpMapping(string $controllerClass): ?\MikoPBX\PBXCoreREST\Attributes\HttpMapping
    {
        if (!class_exists($controllerClass)) {
            return null;
        }

        try {
            $reflection = new \ReflectionClass($controllerClass);
            $httpMappingAttributes = $reflection->getAttributes(\MikoPBX\PBXCoreREST\Attributes\HttpMapping::class);

            if (!empty($httpMappingAttributes)) {
                return $httpMappingAttributes[0]->newInstance();
            }
        } catch (\ReflectionException) {
            return null;
        }

        return null;
    }

    /**
     * HTTP methods supported by REST API
     */
    private const HTTP_METHODS = ['get', 'head', 'post', 'put', 'patch', 'delete'];

    /**
     * Register public endpoint if controller has PUBLIC security type
     *
     * @param string $controllerClass Fully qualified controller class name
     * @param string $resourcePath Resource path for this controller
     */
    private function registerPublicEndpoint(string $controllerClass, string $resourcePath): void
    {
        try {
            $di = \Phalcon\Di\Di::getDefault();
            if ($di === null || !$di->has(PublicEndpointsRegistryProvider::SERVICE_NAME)) {
                return;
            }

            $registry = $di->getShared(PublicEndpointsRegistryProvider::SERVICE_NAME);
            $registry->registerFromController($controllerClass, $resourcePath);
        } catch (\Exception) {
            // Ignore errors - public endpoints registry is optional
        }
    }

    /**
     * Build ID pattern for resource-level routes
     *
     * For array patterns (prefixes), escape and add suffix [^/:]+
     * For string patterns, use as-is
     *
     * @param array $patterns Array of ID patterns or single regex pattern
     * @return string Regex pattern for ID matching
     */
    private function buildIdPattern(array $patterns): string
    {
        if (empty($patterns) || $patterns === ['']) {
            return '[^/:]+';
        }

        // For array patterns (prefixes), escape and add suffix
        // For string patterns, use as-is
        // Note: Use [^/:] to explicitly exclude colon and slash from ID pattern for proper /{id}:{method} parsing
        $pattern = reset($patterns);
        return is_numeric(array_key_first($patterns)) && count($patterns) > 1
            ? preg_quote($pattern, '/') . '[^/:]+'
            : $pattern;
    }

    /**
     * Generate routes based on HttpMapping configuration
     */
    private function generateMappedRoutes(
        string $controllerClass,
        string $resourcePath,
        array $patterns,
        \MikoPBX\PBXCoreREST\Attributes\HttpMapping $httpMapping
    ): array {
        $routes = [];

        // Get operations per HTTP method
        $mapping = $httpMapping->mapping;

        // Phase 1: Collection-level custom methods (highest priority)
        foreach (self::HTTP_METHODS as $httpMethod) {
            $operations = $mapping[strtoupper($httpMethod)] ?? [];
            if (empty($operations)) {
                continue;
            }

            // Add collection-level custom method route
            $routes[] = [$controllerClass, 'handleCustomRequest', $resourcePath, $httpMethod, ':{method:[a-zA-Z][a-zA-Z0-9]*}'];
        }

        // Phase 2: Collection-level CRUD
        foreach (self::HTTP_METHODS as $httpMethod) {
            $operations = $mapping[strtoupper($httpMethod)] ?? [];
            if (empty($operations)) {
                continue;
            }

            // Add collection operation route
            $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, $httpMethod, '/'];
        }

        // Phase 3 & 4: Resource-level routes (with ID) if patterns are not empty
        if (!empty($patterns) && $patterns !== ['']) {
            foreach ($patterns as $pattern) {
                $idPattern = $this->buildIdPattern([$pattern] + $patterns);

                // Phase 3: Resource-level custom methods
                foreach (self::HTTP_METHODS as $httpMethod) {
                    $operations = $mapping[strtoupper($httpMethod)] ?? [];
                    if (empty($operations)) {
                        continue;
                    }

                    $routes[] = [$controllerClass, 'handleResourceCustomRequest', $resourcePath, $httpMethod, '/{id:' . $idPattern . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'];
                }

                // Phase 4: Resource-level CRUD operations
                foreach (self::HTTP_METHODS as $httpMethod) {
                    $operations = $mapping[strtoupper($httpMethod)] ?? [];
                    if (empty($operations)) {
                        continue;
                    }

                    $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, $httpMethod, '/{id:' . $idPattern . '}'];
                }
            }
        }

        return $routes;
    }

    /**
     * Generate all possible routes (fallback when no HttpMapping)
     */
    private function generateAllRoutes(string $controllerClass, string $resourcePath, array $patterns): array
    {
        $routes = [];

        // Phase 1: Collection-level custom methods (highest priority)
        foreach (self::HTTP_METHODS as $httpMethod) {
            $routes[] = [$controllerClass, 'handleCustomRequest', $resourcePath, $httpMethod, ':{method:[a-zA-Z][a-zA-Z0-9]*}'];
        }

        // Phase 2: Collection-level CRUD
        foreach (self::HTTP_METHODS as $httpMethod) {
            $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, $httpMethod, '/'];
        }

        // Phase 3 & 4: Resource-level routes for each pattern
        foreach ($patterns as $pattern) {
            $idPattern = $this->buildIdPattern([$pattern] + $patterns);

            // Phase 3: Resource-level custom methods
            foreach (self::HTTP_METHODS as $httpMethod) {
                $routes[] = [$controllerClass, 'handleResourceCustomRequest', $resourcePath, $httpMethod, '/{id:' . $idPattern . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'];
            }

            // Phase 4: Resource-level CRUD operations
            foreach (self::HTTP_METHODS as $httpMethod) {
                $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, $httpMethod, '/{id:' . $idPattern . '}'];
            }
        }

        return $routes;
    }

    /**
     * Check if controller is a simple controller (doesn't extend BaseRestController)
     */
    private function isSimpleController(string $controllerClass): bool
    {
        if (!class_exists($controllerClass)) {
            return false;
        }

        try {
            $reflection = new \ReflectionClass($controllerClass);
            $parentClass = $reflection->getParentClass();

            // If extends BaseController but not BaseRestController, it's a simple controller
            return $parentClass &&
                   $parentClass->getName() === 'MikoPBX\\PBXCoreREST\\Controllers\\BaseController';
        } catch (\ReflectionException) {
            return false;
        }
    }

    /**
     * Generate simple routes for controllers that don't follow REST patterns
     */
    private function generateSimpleRoutes(string $controllerClass, string $resourcePath): array
    {
        $routes = [];

        if (!class_exists($controllerClass)) {
            return $routes;
        }

        try {
            $reflection = new \ReflectionClass($controllerClass);
            $httpMappingAttributes = $reflection->getAttributes(\MikoPBX\PBXCoreREST\Attributes\HttpMapping::class);

            if (empty($httpMappingAttributes)) {
                return $routes;
            }

            $httpMapping = $httpMappingAttributes[0]->newInstance();

            // Generate direct routes based on HttpMapping
            foreach ($httpMapping->mapping as $httpMethod => $operations) {
                $ops = is_string($operations) ? [$operations] : $operations;

                foreach ($ops as $operation) {
                    // Find the method name that corresponds to this operation
                    $methodName = $operation . 'Action';

                    // Check if method exists
                    if (!$reflection->hasMethod($methodName)) {
                        continue;
                    }

                    // Add direct route: GET /full/path -> methodAction
                    $routes[] = [$controllerClass, $methodName, $resourcePath, strtolower($httpMethod), ''];
                }
            }
        } catch (\ReflectionException) {
            // Return empty routes on error
        }

        return $routes;
    }

    /**
     * Get resource path from controller's ApiResource attribute
     *
     * @return string|null Returns resource path or null if not specified
     */
    private function getResourcePathFromAttribute(string $controllerClass): ?string
    {
        if (!class_exists($controllerClass)) {
            return null;
        }

        try {
            $reflection = new \ReflectionClass($controllerClass);
            $apiResourceAttributes = $reflection->getAttributes(\MikoPBX\PBXCoreREST\Attributes\ApiResource::class);

            if (!empty($apiResourceAttributes)) {
                $apiResource = $apiResourceAttributes[0]->newInstance();
                return $apiResource->path;
            }
        } catch (\ReflectionException) {
            // Fallback to null
        }

        return null;
    }

    /**
     * Get custom ID pattern from controller's HttpMapping attribute
     *
     * @return string|array<string> Returns regex string or array of ID prefixes
     */
    private function getCustomIdPattern(string $controllerClass): string|array
    {
        if (!class_exists($controllerClass)) {
            return self::UNIVERSAL_ID_PATTERNS['any'];
        }

        try {
            $reflection = new \ReflectionClass($controllerClass);
            $httpMappingAttributes = $reflection->getAttributes(\MikoPBX\PBXCoreREST\Attributes\HttpMapping::class);

            if (!empty($httpMappingAttributes)) {
                $httpMapping = $httpMappingAttributes[0]->newInstance();
                $pattern = $httpMapping->getIdPattern();
                // Return pattern as-is (can be string or array)
                return $pattern;
            }
        } catch (\ReflectionException) {
            // Fallback to default pattern
        }

        return self::UNIVERSAL_ID_PATTERNS['any'];
    }


    /**
     * Mount routes to the application efficiently
     */
    private function mountRoutes(Micro $application, array $routes): void
    {
        // Group routes by handler and prefix for better performance
        $collections = [];

        foreach ($routes as [$handler, $method, $prefix, $httpMethod, $pattern]) {
            $key = $handler . '::' . $prefix;

            if (!isset($collections[$key])) {
                $collections[$key] = (new Collection())
                    ->setHandler($handler, true)
                    ->setPrefix($prefix);
            }

            $collections[$key]->{$httpMethod}($pattern, $method);
        }

        // Mount all collections
        foreach ($collections as $collection) {
            $application->mount($collection);
        }
    }

    /**
     * Attaches the middleware to the application
     *
     * Middleware execution order:
     * 1. BEFORE REQUEST:
     *    - AuthenticationMiddleware: Validates JWT/API Key tokens, checks public endpoints
     * 2. AFTER REQUEST:
     *    - ResponseMiddleware: Ensures response is sent
     *
     * Note: 404 errors are handled in BaseRestController::handleCRUDRequest()
     * and handleCustomRequest() when processor method doesn't exist.
     */
    private function attachMiddleware(Micro $application, Manager $eventsManager): void
    {
        $middleware = [
            AuthenticationMiddleware::class => 'before',
            ResponseMiddleware::class => 'after',
        ];

        foreach ($middleware as $class => $function) {
            $eventsManager->attach('micro', new $class());
            $application->{$function}(new $class());
        }

        // Register notFound handler (required by Phalcon Micro)
        // Returns 404 with standard error structure
        $application->notFound(function () use ($application) {
            $response = $application->getDI()->getShared('response');
            $response->setStatusCode(404, 'Not Found');
            $response->setJsonContent([
                'success' => false,
                'messages' => [
                    'error' => ['Endpoint not found: ' . ($_SERVER['REQUEST_URI'] ?? 'unknown')]
                ],
                'data' => null
            ]);
            $response->send();
            return false;
        });
    }

    /**
     * Attaches the modules hooks to the application
     */
    private function attachModuleHooks(Micro $application, Manager $eventsManager): void
    {
        $eventsManager->attach(
            "micro:beforeExecuteRoute",
            function (Event $event, $app) {
                PBXConfModulesProvider::hookModulesMethod(RestAPIConfigInterface::ON_BEFORE_EXECUTE_RESTAPI_ROUTE, [$app]);
            }
        );
        $eventsManager->attach(
            "micro:afterExecuteRoute",
            function (Event $event, $app) {
                PBXConfModulesProvider::hookModulesMethod(RestAPIConfigInterface::ON_AFTER_EXECUTE_RESTAPI_ROUTE, [$app]);
            }
        );
    }
}