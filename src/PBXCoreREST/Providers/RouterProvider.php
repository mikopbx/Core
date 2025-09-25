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

use MikoPBX\PBXCoreREST\Lib\RestfulRouteBuilder;

use MikoPBX\PBXCoreREST\Controllers\
{
    ApiKeys\RestController as ApiKeysRestController,
    AsteriskRestUsers\RestController as AsteriskRestUsersRestController,
    Cdr\GetController as CdrGetController,
    DialplanApplications\RestController as DialplanApplicationsRestController,
    Iax\RestController as IaxRestController,
    Modules\ModulesControllerBase,
    Modules\CorePostController as ModulesCorePostController,
    Modules\CoreGetController as ModulesCoreGetController,
    Sip\GetController as SipGetController,
    Sip\PostController as SipPostController,
    Sip\RestController as SipRestController,
    Storage\GetController as StorageGetController,
    Storage\PostController as StoragePostController,
    Storage\RestController as StorageRestController,
    Syslog\GetController as SyslogGetController,
    Syslog\PostController as SyslogPostController,
    Sysinfo\RestController as SysinfoRestController,
    System\RestController as SystemRestController,
    Firewall\RestController as FirewallRestController,
    NetworkFilters\RestController as NetworkFiltersRestController,
    Files\RestController as FilesRestController,
    Advice\RestController as AdviceRestController,
    Extensions\GetController as ExtensionsGetController,
    Extensions\PostController as ExtensionsPostController,
    Extensions\RestController as ExtensionsRestController,
    Employees\RestController as EmployeesRestController,
    Fail2Ban\RestController as Fail2BanRestController,
    CallQueues\RestController as CallQueuesRestController,
    IvrMenu\RestController as IvrMenuRestController,
    ConferenceRooms\RestController as ConferenceRoomsRestController,
    GeneralSettings\RestController as GeneralSettingsRestController,
    IncomingRoutes\RestController as IncomingRoutesRestController,
    MailSettings\RestController as MailSettingsRestController,
    MailSettings\OAuth2CallbackController,
    Network\RestController as NetworkRestController,
    OutboundRoutes\RestController as OutboundRoutesRestController,
    OffWorkTimes\RestController as OffWorkTimesRestController,
    CustomFiles\RestController as CustomFilesRestController,
    SoundFiles\RestController as SoundFilesRestController,
    TimeSettings\RestController as TimeSettingsRestController,
    Users\GetController as UsersGetController,
    Nchan\GetController as NchanGetController,
    License\RestController as LicenseRestController,
    UserPageTracker\PostController as UserPageTrackerPostController,
    Providers\RestController as ProvidersRestController,
    SipProviders\RestController as SipProvidersRestController,
    IaxProviders\RestController as IaxProvidersRestController,
    AsteriskManagers\RestController as AsteriskManagersRestController,
    Passwords\RestController as PasswordsRestController,
    Syslog\RestController as SyslogRestController
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
 * Register Router service
 *
 * @package MikoPBX\PBXCoreREST\Providers
 */
class RouterProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = '';

    /**
     * Register response service provider
     *
     * @param DiInterface $di The DI container.
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
     * Attaches the routes to the application; lazy loaded
     *
     * @param Micro                   $application
     */
    private function attachRoutes(Micro $application): void
    {

        // Add hard coded routes
        $routes = $this->getRoutes();

        // Add additional modules routes
        $additionalRoutes = PBXConfModulesProvider::hookModulesMethod(RestAPIConfigInterface::GET_PBXCORE_REST_ADDITIONAL_ROUTES);
        $additionalRoutes = array_values($additionalRoutes);
        $routes = array_merge($routes, ...$additionalRoutes);

        // Class, Method, Route, Handler, ParamsRegex
        foreach ($routes as $route) {
            $collection = new Collection();
            $collection
                ->setHandler($route[0], true)
                ->setPrefix($route[2])
                ->{$route[3]}(
                    $route[4],
                    $route[1]
                );

            $application->mount($collection);
        }
    }

    /**
     * Returns the array for the routes
     *
     * @return array
     */
    private function getRoutes(): array
    {
        $routes = [];
        
        // ========== Legacy v1/v2 API routes ==========
        $routes = array_merge($routes, [
            // Class, Method, Route, Handler, ParamsRegex
            [SipGetController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'get', '/'],
            [SipPostController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'post', '/'],
            [CdrGetController::class, 'callAction', '/pbxcore/api/cdr/{actionName}', 'get', '/'],
            [CdrGetController::class, 'callAction', '/pbxcore/api/cdr/v2/{actionName}', 'get', '/'],
        ]);
        
        // ========== v3 RESTful API routes with numeric IDs ==========
        $routes = array_merge($routes, RestfulRouteBuilder::buildBatchRoutes([
            FirewallRestController::class => '/pbxcore/api/v3/firewall',
            NetworkFiltersRestController::class => '/pbxcore/api/v3/network-filters',
            ExtensionsRestController::class => '/pbxcore/api/v3/extensions',
            EmployeesRestController::class => '/pbxcore/api/v3/employees',
            ApiKeysRestController::class => '/pbxcore/api/v3/api-keys',
            OutboundRoutesRestController::class => '/pbxcore/api/v3/outbound-routes',
            OffWorkTimesRestController::class => '/pbxcore/api/v3/off-work-times',
            CustomFilesRestController::class => '/pbxcore/api/v3/custom-files',
            AsteriskManagersRestController::class => '/pbxcore/api/v3/asterisk-managers',
            AsteriskRestUsersRestController::class => '/pbxcore/api/v3/asterisk-rest-users',
        ], ['idPattern' => 'numeric']));
        
        // ========== v3 RESTful API routes with alphanumeric IDs ==========
        $routes = array_merge($routes, RestfulRouteBuilder::buildBatchRoutes([
            ConferenceRoomsRestController::class => '/pbxcore/api/v3/conference-rooms',
            CallQueuesRestController::class => '/pbxcore/api/v3/call-queues',
            IvrMenuRestController::class => '/pbxcore/api/v3/ivr-menu',
            IncomingRoutesRestController::class => '/pbxcore/api/v3/incoming-routes',
            SoundFilesRestController::class => '/pbxcore/api/v3/sound-files',
            DialplanApplicationsRestController::class => '/pbxcore/api/v3/dialplan-applications',
            ProvidersRestController::class => '/pbxcore/api/v3/providers',
            SipProvidersRestController::class => '/pbxcore/api/v3/sip-providers',
            IaxProvidersRestController::class => '/pbxcore/api/v3/iax-providers',
            NetworkRestController::class => '/pbxcore/api/v3/network',
        ], ['idPattern' => 'alphanumeric']));

        // ========== v3 RESTful API singleton resources (no ID in path) ==========
        // GeneralSettings is a singleton resource - there's only one set of general settings
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            GeneralSettingsRestController::class,
            '/pbxcore/api/v3/general-settings'
        ));

        // MailSettings OAuth2 callback - specific route
        $routes[] = [
            OAuth2CallbackController::class,
            'oauth2CallbackAction',
            '/pbxcore/api/v3/mail-settings/oauth2-callback',
            'get',
            ''  // No additional params
        ];

        // MailSettings is a singleton resource - there's only one set of mail settings
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            MailSettingsRestController::class,
            '/pbxcore/api/v3/mail-settings'
        ));

        // Add Syslog RESTful routes (custom methods only, no CRUD)
        $routes = array_merge($routes, RestfulRouteBuilder::buildCustomOnlyRoutes(
            SyslogRestController::class,
            '/pbxcore/api/v3/syslog'
        ));

        // Add Advice RESTful routes (custom methods only, no CRUD)
        $routes = array_merge($routes, RestfulRouteBuilder::buildCustomOnlyRoutes(
            AdviceRestController::class,
            '/pbxcore/api/v3/advice'
        ));

        // Add SIP RESTful routes (custom methods only, no CRUD)
        // SIP API needs both collection-level and resource-level custom methods
        $routes = array_merge($routes, [
            // Collection-level custom methods (getStatuses, forceCheck all, getPeersStatuses, getRegistry)
            [SipRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/sip', 'get', ':{customMethod:[a-zA-Z0-9]+}'],
            [SipRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/sip', 'post', ':{customMethod:[a-zA-Z0-9]+}'],
            // Resource-level custom methods (getStatus/228, forceCheck/228, getHistory/228, getStats/228, getSecret/228)
            [SipRestController::class, 'handleResourceCustomRequest', '/pbxcore/api/v3/sip', 'get', '/{id:[a-zA-Z0-9\\-]+}:{customMethod:[a-zA-Z0-9]+}'],
            [SipRestController::class, 'handleResourceCustomRequest', '/pbxcore/api/v3/sip', 'post', '/{id:[a-zA-Z0-9\\-]+}:{customMethod:[a-zA-Z0-9]+}'],
        ]);

        // Fail2Ban is a singleton resource - there's only one fail2ban configuration
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            Fail2BanRestController::class,
            '/pbxcore/api/v3/fail2ban'
        ));

        // TimeSettings is a singleton resource - there's only one time configuration
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            TimeSettingsRestController::class,
            '/pbxcore/api/v3/time-settings'
        ));

        // Storage is a singleton resource - there's only one storage configuration
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            StorageRestController::class,
            '/pbxcore/api/v3/storage'
        ));

        // IAX is a singleton resource - there's only one IAX service configuration
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            IaxRestController::class,
            '/pbxcore/api/v3/iax'
        ));

        // Passwords is a singleton resource - there's only one password service in the system
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            PasswordsRestController::class,
            '/pbxcore/api/v3/passwords'
        ));

        // License is a singleton resource - there's only one license in the system
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            LicenseRestController::class,
            '/pbxcore/api/v3/license'
        ));

        // Sysinfo is a singleton resource - there's only one system in the PBX
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            SysinfoRestController::class,
            '/pbxcore/api/v3/sysinfo'
        ));

        // Files API - hybrid resource that works with filesystem (not database entities)
        // Supports both standard REST operations and custom methods
        $routes = array_merge($routes, [
            // Standard CRUD operations on files
            [FilesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/files', 'get', '/{id:.+}'],       // GET /files/{path}
            [FilesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/files', 'put', '/{id:.+}'],       // PUT /files/{path}
            [FilesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/files', 'delete', '/{id:.+}'],    // DELETE /files/{path}

            // Custom methods for specialized file operations
            [FilesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/files', 'get', ':{customMethod:[a-zA-Z0-9]+}'],     // GET :uploadStatus, :firmwareStatus
            [FilesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/files', 'post', ':{customMethod:[a-zA-Z0-9]+}'],    // POST :upload, :downloadFirmware
        ]);

        // System is a singleton resource with mostly custom methods (commands)
        $routes = array_merge($routes, RestfulRouteBuilder::buildSingletonRoutes(
            SystemRestController::class,
            '/pbxcore/api/v3/system'
        ));

        // ========== More legacy v1/v2 routes ==========
        $routes = array_merge($routes, [
            [StorageGetController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'get', '/'],
            [StoragePostController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'post', '/'],
            [SyslogGetController::class, 'callAction', '/pbxcore/api/syslog/{actionName}', 'get', '/'],
            [SyslogPostController::class, 'callAction', '/pbxcore/api/syslog/{actionName}', 'post', '/'],
            [ExtensionsGetController::class, 'callAction', '/pbxcore/api/extensions/{actionName}', 'get', '/'],
            [ExtensionsPostController::class, 'callAction', '/pbxcore/api/extensions/{actionName}', 'post', '/'],

            // v2 API routes
            [ExtensionsGetController::class, 'callAction', '/pbxcore/api/v2/extensions/{actionName}', 'get', '/'],
            [ExtensionsGetController::class, 'callAction', '/pbxcore/api/v2/extensions/{actionName}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [ExtensionsPostController::class, 'callAction', '/pbxcore/api/v2/extensions/{actionName}', 'post', '/'],

            // More v1/v2 routes
            [UsersGetController::class, 'callAction', '/pbxcore/api/users/{actionName}', 'get', '/'],
            [NchanGetController::class, 'callAction', '/pbxcore/api/nchan/{queueName}', 'get', '/'],
            [UserPageTrackerPostController::class, 'callAction', '/pbxcore/api/v2/user-page-tracker/{actionName}', 'post', '/'],

            // Module routes
            [ModulesControllerBase::class, 'callActionForModule', '/pbxcore/api/modules/{moduleName}/{actionName}', 'get', '/'],
            [ModulesControllerBase::class, 'callActionForModule', '/pbxcore/api/modules/{moduleName}/{actionName}', 'post', '/'],
            [ModulesCoreGetController::class, 'callAction', '/pbxcore/api/modules/core/{actionName}', 'get', '/'],
            [ModulesCorePostController::class, 'callAction', '/pbxcore/api/modules/core/{actionName}', 'post', '/'],
        ]);
        
        return $routes;
    }

    /**
     * Attaches the middleware to the application
     *
     * @param Micro   $application
     * @param Manager $eventsManager
     */
    private function attachMiddleware(Micro $application, Manager $eventsManager): void
    {
        $middleware = $this->getMiddleware();

        /**
         * Get the events manager and attach the middleware to it
         */
        foreach ($middleware as $class => $function) {
            $eventsManager->attach('micro', new $class());
            $application->{$function}(new $class());
        }
    }

    /**
     * Returns the array for the middleware with the action to attach
     *
     * @return array
     */
    private function getMiddleware(): array
    {
        return [
            NotFoundMiddleware::class       => 'before',
            AuthenticationMiddleware::class => 'before',
            ResponseMiddleware::class       => 'after',
        ];
    }

    /**
     * Attaches the modules hooks to the application
     *
     * @param Micro   $application
     * @param Manager $eventsManager
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
