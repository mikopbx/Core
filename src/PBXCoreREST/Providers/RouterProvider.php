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

use MikoPBX\PBXCoreREST\Controllers\{
    Nchan\GetController as NchanGetController,
    MailSettings\OAuth2CallbackController,
    Modules\ModulesControllerBase,
    Modules\CorePostController as ModulesCorePostController,
    Modules\CoreGetController as ModulesCoreGetController
};

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\RestAPIConfigInterface;
use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use MikoPBX\PBXCoreREST\Middleware\NotFoundMiddleware;
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
        'any' => '[^/]+',           // Matches anything except slash
        'numeric' => '[0-9]+',      // Numbers only
        'alpha' => '[a-zA-Z\\-]+',  // Letters and hyphens
        'alnum' => '[a-zA-Z0-9\\-_]+', // Alphanumeric with separators
        'uuid' => '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    ];

    /**
     * Special routes that don't follow standard patterns
     */
    private const SPECIAL_ROUTES = [
        // OAuth2 callback route
        [OAuth2CallbackController::class, 'oauth2CallbackAction', '/pbxcore/api/v3/mail-settings/oauth2-callback', 'get', ''],
    ];

    /**
     * Legacy routes configuration
     */
    private const LEGACY_ROUTES = [
        // User routes (both GET and POST)

        // Nchan routes
        [NchanGetController::class, 'callAction', '/pbxcore/api/nchan/{queueName}', 'get', '/'],

        // Module routes
        [ModulesControllerBase::class, 'callActionForModule', '/pbxcore/api/modules/{moduleName}/{actionName}', 'get', '/'],
        [ModulesControllerBase::class, 'callActionForModule', '/pbxcore/api/modules/{moduleName}/{actionName}', 'post', '/'],
        [ModulesCoreGetController::class, 'callAction', '/pbxcore/api/modules/core/{actionName}', 'get', '/'],
        [ModulesCorePostController::class, 'callAction', '/pbxcore/api/modules/core/{actionName}', 'post', '/'],
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
            // Universal auto-discovered RESTful routes
            ...$this->discoverUniversalRoutes(),

            // Special case routes
            ...self::SPECIAL_ROUTES,

            // Legacy routes
            ...self::LEGACY_ROUTES,
        ];

        // Add module routes if available
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

        // Scan all controller directories
        $directories = glob($controllerPath . '/*', GLOB_ONLYDIR);

        foreach ($directories as $dir) {
            $dirName = basename($dir);

            // Skip special directories
            if (in_array($dirName, ['Nchan', 'Modules', 'MailSettings'])) {
                continue;
            }

            // Look for RestController.php
            $restControllerFile = $dir . '/RestController.php';
            if (file_exists($restControllerFile)) {
                $controllerClass = "MikoPBX\\PBXCoreREST\\Controllers\\{$dirName}\\RestController";
                $resourcePath = $this->getResourcePathFromDirectory($dirName);

                // Generate UNIVERSAL routes for this controller
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
        return [
            // === CUSTOM METHODS (highest priority for proper matching) ===

            // Collection-level custom methods: GET /resource:method, POST /resource:method
            [$controllerClass, 'handleCustomRequest', $resourcePath, 'get', ':{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleCustomRequest', $resourcePath, 'post', ':{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleCustomRequest', $resourcePath, 'put', ':{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleCustomRequest', $resourcePath, 'patch', ':{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleCustomRequest', $resourcePath, 'delete', ':{method:[a-zA-Z][a-zA-Z0-9]*}'],

            // Resource-level custom methods: GET /resource/{id}:method, POST /resource/{id}:method
            [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'get', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'post', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'put', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'patch', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'],
            [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'delete', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'],

            // === STANDARD CRUD OPERATIONS ===

            // Collection operations
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'get', '/'],     // List all
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'post', '/'],    // Create new
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'put', '/'],     // Replace all (bulk)
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'patch', '/'],   // Update all (bulk)
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'delete', '/'],  // Delete all (dangerous, controlled by processor)

            // Individual resource operations (supports ANY ID format)
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'get', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}'],     // Get one
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'put', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}'],     // Replace one
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'patch', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}'],   // Update one
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'delete', '/{id:' . self::UNIVERSAL_ID_PATTERNS['any'] . '}'],  // Delete one
        ];
    }

    /**
     * Convert directory name to resource path using convention
     * Handles ALL naming patterns automatically
     */
    private function getResourcePathFromDirectory(string $dirName): string
    {
        // Handle common naming patterns
        $conversions = [
            'GeneralSettings' => 'general-settings',
            'MailSettings' => 'mail-settings',
            'TimeSettings' => 'time-settings',
            'NetworkFilters' => 'network-filters',
            'ApiKeys' => 'api-keys',
            'OutboundRoutes' => 'outbound-routes',
            'IncomingRoutes' => 'incoming-routes',
            'OffWorkTimes' => 'off-work-times',
            'CustomFiles' => 'custom-files',
            'SoundFiles' => 'sound-files',
            'ConferenceRooms' => 'conference-rooms',
            'CallQueues' => 'call-queues',
            'IvrMenu' => 'ivr-menu',
            'DialplanApplications' => 'dialplan-applications',
            'SipProviders' => 'sip-providers',
            'IaxProviders' => 'iax-providers',
            'AsteriskManagers' => 'asterisk-managers',
            'AsteriskRestUsers' => 'asterisk-rest-users',
            'Fail2Ban' => 'fail2ban',
            'UserPageTracker' => 'user-page-tracker',
            'Users' => 'users',
        ];

        // Use specific conversion if available, otherwise auto-convert
        if (isset($conversions[$dirName])) {
            return '/pbxcore/api/v3/' . $conversions[$dirName];
        }

        // Auto-convert CamelCase to kebab-case
        $kebabCase = strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $dirName));
        return "/pbxcore/api/v3/{$kebabCase}";
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
     */
    private function attachMiddleware(Micro $application, Manager $eventsManager): void
    {
        $middleware = [
            NotFoundMiddleware::class => 'before',
            AuthenticationMiddleware::class => 'before',
            ResponseMiddleware::class => 'after',
        ];

        foreach ($middleware as $class => $function) {
            $eventsManager->attach('micro', new $class());
            $application->{$function}(new $class());
        }
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