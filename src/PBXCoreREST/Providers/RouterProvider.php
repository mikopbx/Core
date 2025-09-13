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

use MikoPBX\PBXCoreREST\Controllers\
{
    ApiKeys\RestController as ApiKeysRestController,
    AsteriskRestUsers\RestController as AsteriskRestUsersRestController,
    Cdr\GetController as CdrGetController,
    Iax\GetController as IaxGetController,
    Modules\ModulesControllerBase,
    Modules\CorePostController as ModulesCorePostController,
    Modules\CoreGetController as ModulesCoreGetController,
    Sip\GetController as SipGetController,
    Sip\PostController as SipPostController,
    Storage\GetController as StorageGetController,
    Storage\PostController as StoragePostController,
    Syslog\GetController as SyslogGetController,
    Syslog\PostController as SyslogPostController,
    Sysinfo\GetController as SysinfoGetController,
    Sysinfo\PostController as SysinfoPostController,
    System\GetController as SystemGetController,
    System\PostController as SystemPostController,
    Firewall\GetController as FirewallGetController,
    Firewall\PostController as FirewallPostController,
    Files\GetController as FilesGetController,
    Files\PostController as FilesPostController,
    Advice\GetController as AdviceGetController,
    Extensions\GetController as ExtensionsGetController,
    Extensions\PostController as ExtensionsPostController,
    Employees\RestController as EmployeesRestController,
    CallQueues\RestController as CallQueuesRestController,
    CallQueues\GetController as CallQueuesGetController,
    CallQueues\PostController as CallQueuesPostController,
    CallQueues\PutController as CallQueuesPutController,
    CallQueues\DeleteController as CallQueuesDeleteController,
    IvrMenu\RestController as IvrMenuRestController,
    DialplanApplications\GetController as DialplanApplicationsGetController,
    DialplanApplications\PostController as DialplanApplicationsPostController,
    DialplanApplications\PutController as DialplanApplicationsPutController,
    DialplanApplications\DeleteController as DialplanApplicationsDeleteController,
    ConferenceRooms\RestController as ConferenceRoomsRestController,
    IncomingRoutes\GetController as IncomingRoutesGetController,
    IncomingRoutes\PostController as IncomingRoutesPostController,
    IncomingRoutes\PutController as IncomingRoutesPutController,
    IncomingRoutes\DeleteController as IncomingRoutesDeleteController,
    OutboundRoutes\GetController as OutboundRoutesGetController,
    OutboundRoutes\PostController as OutboundRoutesPostController,
    OutboundRoutes\PutController as OutboundRoutesPutController,
    OutboundRoutes\DeleteController as OutboundRoutesDeleteController,
    OutWorkTimes\GetController as OutWorkTimesGetController,
    OutWorkTimes\PostController as OutWorkTimesPostController,
    OutWorkTimes\PutController as OutWorkTimesPutController,
    OutWorkTimes\DeleteController as OutWorkTimesDeleteController,
    SoundFiles\GetController as SoundFilesGetController,
    SoundFiles\PostController as SoundFilesPostController,
    SoundFiles\PutController as SoundFilesPutController,
    SoundFiles\DeleteController as SoundFilesDeleteController,
    Users\GetController as UsersGetController,
    Nchan\GetController as NchanGetController,
    License\GetController as LicenseGetController,
    License\PostController as LicensePostController,
    UserPageTracker\PostController as UserPageTrackerPostController,
    Providers\GetController as ProvidersGetController,
    Providers\PostController as ProvidersPostController,
    Providers\PutController as ProvidersPutController,
    Providers\DeleteController as ProvidersDeleteController,
    AsteriskManagers\RestController as AsteriskManagersRestController,
    NetworkFilters\GetController as NetworkFiltersGetController,
    NetworkFilters\PostController as NetworkFiltersPostController,
    GeneralSettings\GetController as GeneralSettingsGetController,
    GeneralSettings\PostController as GeneralSettingsPostController,
    Passwords\GetController as PasswordsGetController,
    Passwords\PostController as PasswordsPostController
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
    public const string SERVICE_NAME = '';

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
        return [
            // Class, Method, Route, Handler, ParamsRegex

            [SipGetController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'get', '/'],
            [SipPostController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'post', '/'],

            [IaxGetController::class, 'callAction', '/pbxcore/api/iax/{actionName}', 'get', '/'],

            [CdrGetController::class, 'callAction', '/pbxcore/api/cdr/{actionName}', 'get', '/'],
            [CdrGetController::class, 'callAction', '/pbxcore/api/cdr/v2/{actionName}', 'get', '/'],

            [FirewallGetController::class, 'callAction', '/pbxcore/api/firewall/{actionName}', 'get', '/'],
            [FirewallPostController::class, 'callAction', '/pbxcore/api/firewall/{actionName}', 'post', '/'],

            [StorageGetController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'get', '/'],
            [StoragePostController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'post', '/'],

            [SystemGetController::class, 'callAction', '/pbxcore/api/system/{actionName}', 'get', '/'],
            [SystemPostController::class, 'callAction', '/pbxcore/api/system/{actionName}', 'post', '/'],

            [SyslogGetController::class, 'callAction', '/pbxcore/api/syslog/{actionName}', 'get', '/'],
            [SyslogPostController::class, 'callAction', '/pbxcore/api/syslog/{actionName}', 'post', '/'],

            [SysinfoGetController::class, 'callAction', '/pbxcore/api/sysinfo/{actionName}', 'get', '/'],
            [SysinfoPostController::class, 'callAction', '/pbxcore/api/sysinfo/{actionName}', 'post', '/'],

            [FilesGetController::class, 'callAction', '/pbxcore/api/files/{actionName}', 'get', '/'],
            [FilesPostController::class, 'callAction', '/pbxcore/api/files/{actionName}', 'post', '/'],

            [AdviceGetController::class, 'callAction', '/pbxcore/api/advice/{actionName}', 'get', '/'],

            [ExtensionsGetController::class, 'callAction', '/pbxcore/api/extensions/{actionName}', 'get', '/'],
            [ExtensionsPostController::class, 'callAction', '/pbxcore/api/extensions/{actionName}', 'post', '/'],
            
            // v2 Extensions REST API endpoints
            [ExtensionsGetController::class, 'callAction', '/pbxcore/api/v2/extensions/{actionName}', 'get', '/'],
            [ExtensionsGetController::class, 'callAction', '/pbxcore/api/v2/extensions/{actionName}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [ExtensionsPostController::class, 'callAction', '/pbxcore/api/v2/extensions/{actionName}', 'post', '/'],
                
            // v3 Employees RESTful API endpoints
            // Custom methods with colon notation (Google API Design Guide) - must be before standard routes
            // Using relative paths from prefix for proper Phalcon routing
            [EmployeesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/employees', 'get', ':{customMethod:[a-zA-Z]+}'],
            [EmployeesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/employees', 'post', ':{customMethod:[a-zA-Z]+}'],
            [EmployeesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/employees', 'post', '/{id:[0-9]+}:{customMethod:[a-zA-Z]+}'],
            
            // Standard CRUD operations
            [EmployeesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/employees', 'get', '/'],
            [EmployeesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/employees', 'get', '/{id:[0-9]+}'],
            [EmployeesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/employees', 'post', '/'],
            [EmployeesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/employees', 'put', '/{id:[0-9]+}'],
            [EmployeesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/employees', 'patch', '/{id:[0-9]+}'],
            [EmployeesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/employees', 'delete', '/{id:[0-9]+}'],
            
            // v3 API Keys RESTful API endpoints
            // Custom methods with colon notation
            [ApiKeysRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/api-keys', 'get', ':{customMethod:[a-zA-Z]+}'],
            [ApiKeysRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/api-keys', 'post', ':{customMethod:[a-zA-Z]+}'],
            [ApiKeysRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/api-keys', 'post', '/{id:[0-9]+}:{customMethod:[a-zA-Z]+}'],
            
            // Standard CRUD operations
            [ApiKeysRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/api-keys', 'get', '/'],
            [ApiKeysRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/api-keys', 'get', '/{id:[0-9]+}'],
            [ApiKeysRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/api-keys', 'post', '/'],
            [ApiKeysRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/api-keys', 'put', '/{id:[0-9]+}'],
            [ApiKeysRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/api-keys', 'patch', '/{id:[0-9]+}'],
            [ApiKeysRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/api-keys', 'delete', '/{id:[0-9]+}'],
            
            // v3 Conference Rooms RESTful API endpoints
            // Custom methods with colon notation
            [ConferenceRoomsRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/conference-rooms', 'get', ':{customMethod:[a-zA-Z]+}'],
            
            // Standard CRUD operations
            [ConferenceRoomsRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/conference-rooms', 'get', '/'],
            [ConferenceRoomsRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/conference-rooms', 'get', '/{id:[a-zA-Z0-9\-]+}'],
            [ConferenceRoomsRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/conference-rooms', 'post', '/'],
            [ConferenceRoomsRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/conference-rooms', 'put', '/{id:[a-zA-Z0-9\-]+}'],
            [ConferenceRoomsRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/conference-rooms', 'patch', '/{id:[a-zA-Z0-9\-]+}'],
            [ConferenceRoomsRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/conference-rooms', 'delete', '/{id:[a-zA-Z0-9\-]+}'],

            [CallQueuesGetController::class, 'callAction', '/pbxcore/api/v2/call-queues/{actionName}', 'get', '/'],
            [CallQueuesGetController::class, 'callAction', '/pbxcore/api/v2/call-queues/{actionName}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [CallQueuesPostController::class, 'callAction', '/pbxcore/api/v2/call-queues/{actionName}', 'post', '/'],
            [CallQueuesPutController::class, 'callAction', '/pbxcore/api/v2/call-queues/{actionName}/{id:[a-zA-Z0-9\-]+}', 'put', '/'],
            [CallQueuesDeleteController::class, 'callAction', '/pbxcore/api/v2/call-queues/{actionName}/{id:[a-zA-Z0-9\-]+}', 'delete', '/'],

            // v3 Call Queues RESTful API endpoints
            // Custom methods with colon notation (Google API Design Guide) - must be before standard routes
            [CallQueuesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/call-queues', 'get', ':{customMethod:[a-zA-Z]+}'],
            [CallQueuesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/call-queues', 'post', ':{customMethod:[a-zA-Z]+}'],
            [CallQueuesRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/call-queues', 'post', '/{id:[a-zA-Z0-9\-]+}:{customMethod:[a-zA-Z]+}'],
            
            // Standard CRUD operations
            [CallQueuesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/call-queues', 'get', '/'],
            [CallQueuesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/call-queues', 'get', '/{id:[a-zA-Z0-9\-]+}'],
            [CallQueuesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/call-queues', 'post', '/'],
            [CallQueuesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/call-queues', 'put', '/{id:[a-zA-Z0-9\-]+}'],
            [CallQueuesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/call-queues', 'patch', '/{id:[a-zA-Z0-9\-]+}'],
            [CallQueuesRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/call-queues', 'delete', '/{id:[a-zA-Z0-9\-]+}'],

            // v3 IVR Menu RESTful API endpoints
            // Custom methods with colon notation (Google API Design Guide) - must be before standard routes
            [IvrMenuRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/ivr-menu', 'get', ':{customMethod:[a-zA-Z]+}'],
            [IvrMenuRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/ivr-menu', 'post', ':{customMethod:[a-zA-Z]+}'],
            [IvrMenuRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/ivr-menu', 'post', '/{id:[a-zA-Z0-9\-]+}:{customMethod:[a-zA-Z]+}'],
            
            // Standard CRUD operations
            [IvrMenuRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/ivr-menu', 'get', '/'],
            [IvrMenuRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/ivr-menu', 'get', '/{id:[a-zA-Z0-9\-]+}'],
            [IvrMenuRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/ivr-menu', 'post', '/'],
            [IvrMenuRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/ivr-menu', 'put', '/{id:[a-zA-Z0-9\-]+}'],
            [IvrMenuRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/ivr-menu', 'patch', '/{id:[a-zA-Z0-9\-]+}'],
            [IvrMenuRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/ivr-menu', 'delete', '/{id:[a-zA-Z0-9\-]+}'],
            
            [DialplanApplicationsGetController::class, 'callAction', '/pbxcore/api/v2/dialplan-applications/{actionName}', 'get', '/'],
            [DialplanApplicationsGetController::class, 'callAction', '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [DialplanApplicationsPostController::class, 'callAction', '/pbxcore/api/v2/dialplan-applications/{actionName}', 'post', '/'],
            [DialplanApplicationsPutController::class, 'callAction', '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\-]+}', 'put', '/'],
            [DialplanApplicationsDeleteController::class, 'callAction', '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\-]+}', 'delete', '/'],

            [IncomingRoutesGetController::class, 'callAction', '/pbxcore/api/v2/incoming-routes/{actionName}', 'get', '/'],
            [IncomingRoutesGetController::class, 'callAction', '/pbxcore/api/v2/incoming-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [IncomingRoutesPostController::class, 'callAction', '/pbxcore/api/v2/incoming-routes/{actionName}', 'post', '/'],
            [IncomingRoutesPutController::class, 'callAction', '/pbxcore/api/v2/incoming-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 'put', '/'],
            [IncomingRoutesDeleteController::class, 'callAction', '/pbxcore/api/v2/incoming-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 'delete', '/'],

            [OutboundRoutesGetController::class, 'callAction', '/pbxcore/api/v2/outbound-routes/{actionName}', 'get', '/'],
            [OutboundRoutesGetController::class, 'callAction', '/pbxcore/api/v2/outbound-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [OutboundRoutesPostController::class, 'callAction', '/pbxcore/api/v2/outbound-routes/{actionName}', 'post', '/'],
            [OutboundRoutesPutController::class, 'callAction', '/pbxcore/api/v2/outbound-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 'put', '/'],
            [OutboundRoutesDeleteController::class, 'callAction', '/pbxcore/api/v2/outbound-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 'delete', '/'],

            [OutWorkTimesGetController::class, 'callAction', '/pbxcore/api/v2/out-work-times/{actionName}', 'get', '/'],
            [OutWorkTimesGetController::class, 'callAction', '/pbxcore/api/v2/out-work-times/{actionName}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [OutWorkTimesPostController::class, 'callAction', '/pbxcore/api/v2/out-work-times/{actionName}', 'post', '/'],
            [OutWorkTimesPutController::class, 'callAction', '/pbxcore/api/v2/out-work-times/{actionName}/{id:[a-zA-Z0-9\-]+}', 'put', '/'],
            [OutWorkTimesDeleteController::class, 'callAction', '/pbxcore/api/v2/out-work-times/{actionName}/{id:[a-zA-Z0-9\-]+}', 'delete', '/'],

            [UsersGetController::class, 'callAction', '/pbxcore/api/users/{actionName}', 'get', '/'],

            [NchanGetController::class, 'callAction', '/pbxcore/api/nchan/{queueName}', 'get', '/'],

            [LicenseGetController::class, 'callAction', '/pbxcore/api/license/{actionName}', 'get', '/'],
            [LicensePostController::class, 'callAction', '/pbxcore/api/license/{actionName}', 'post', '/'],

            // External modules actions
            [
                ModulesControllerBase::class,
                'callActionForModule',
                '/pbxcore/api/modules/{moduleName}/{actionName}',
                'get',
                '/',
            ],
            [
                ModulesControllerBase::class,
                'callActionForModule',
                '/pbxcore/api/modules/{moduleName}/{actionName}',
                'post',
                '/',
            ],

            // Module installation, upgrading, downloading, removing
            [ModulesCoreGetController::class, 'callAction', '/pbxcore/api/modules/core/{actionName}', 'get', '/'],
            [ModulesCorePostController::class, 'callAction', '/pbxcore/api/modules/core/{actionName}', 'post', '/'],

            [UserPageTrackerPostController::class, 'callAction', '/pbxcore/api/v2/user-page-tracker/{actionName}', 'post', '/'],
            
            // General Settings routes (v2)
            [GeneralSettingsGetController::class, 'callAction', '/pbxcore/api/v2/general-settings/{actionName}', 'get', '/'],
            [GeneralSettingsGetController::class, 'callAction', '/pbxcore/api/v2/general-settings/{actionName}/{key}', 'get', '/'],
            [GeneralSettingsPostController::class, 'callAction', '/pbxcore/api/v2/general-settings/{actionName}', 'post', '/'],
            
            // Password validation and generation endpoints (v2)
            [PasswordsGetController::class, 'callAction', '/pbxcore/api/v2/passwords/{actionName}', 'get', '/'],
            [PasswordsPostController::class, 'callAction', '/pbxcore/api/v2/passwords/{actionName}', 'post', '/'],
            
            // Sound Files routes
            [SoundFilesGetController::class, 'callAction', '/pbxcore/api/v2/sound-files/{actionName}', 'get', '/'],
            [SoundFilesGetController::class, 'callAction', '/pbxcore/api/v2/sound-files/{actionName}/{id}', 'get', '/'],
            [SoundFilesPostController::class, 'callAction', '/pbxcore/api/v2/sound-files/{actionName}', 'post', '/'],
            [SoundFilesPutController::class, 'callAction', '/pbxcore/api/v2/sound-files/{actionName}/{id:[0-9]+}', 'put', '/'],
            [SoundFilesDeleteController::class, 'callAction', '/pbxcore/api/v2/sound-files/{actionName}/{id:[0-9]+}', 'delete', '/'],

            // Providers v2 routes (only v2 is supported)
            [ProvidersGetController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}', 'get', '/'],
            [ProvidersGetController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}/{type:[A-Z]+}/{id:[a-zA-Z0-9\-]+}', 'get', '/'],
            [ProvidersGetController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}/{id}', 'get', '/'],
            [ProvidersPostController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}', 'post', '/'],
            [ProvidersPutController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}/{type:[A-Z]+}/{id:[a-zA-Z0-9\-]+}', 'put', '/'],
            [ProvidersPutController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}/{id}', 'put', '/'],
            [ProvidersDeleteController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}/{type:[A-Z]+}/{id:[a-zA-Z0-9\-]+}', 'delete', '/'],
            [ProvidersDeleteController::class, 'callAction', '/pbxcore/api/v2/providers/{actionName}/{id}', 'delete', '/'],
            
            // Network Filters v2 routes
            [NetworkFiltersGetController::class, 'callAction', '/pbxcore/api/v2/network-filters/{actionName}', 'get', '/'],
            [NetworkFiltersPostController::class, 'callAction', '/pbxcore/api/v2/network-filters/{actionName}', 'post', '/'],

            // v3 Asterisk Managers RESTful API endpoints
            // Custom methods with colon notation (Google API Design Guide) - must be before standard routes
            [AsteriskManagersRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/asterisk-managers', 'get', ':{customMethod:[a-zA-Z]+}'],
            [AsteriskManagersRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/asterisk-managers', 'post', ':{customMethod:[a-zA-Z]+}'],
            [AsteriskManagersRestController::class, 'handleCustomRequest', '/pbxcore/api/v3/asterisk-managers', 'post', '/{id:[0-9]+}:{customMethod:[a-zA-Z]+}'],
            
            // Standard CRUD operations
            [AsteriskManagersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-managers', 'get', '/'],
            [AsteriskManagersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-managers', 'get', '/{id:[0-9]+}'],
            [AsteriskManagersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-managers', 'post', '/'],
            [AsteriskManagersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-managers', 'put', '/{id:[0-9]+}'],
            [AsteriskManagersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-managers', 'patch', '/{id:[0-9]+}'],
            [AsteriskManagersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-managers', 'delete', '/{id:[0-9]+}'],

            // v3 AsteriskRestUsers (ARI) RESTful API endpoints
            // Custom methods with colon notation (Google API Design Guide) - must be before standard routes
            [AsteriskRestUsersRestController::class, 'handleCustomMethod', '/pbxcore/api/v3/asterisk-rest-users', 'get', ':{customMethod:[a-zA-Z]+}'],
            [AsteriskRestUsersRestController::class, 'handleCustomMethod', '/pbxcore/api/v3/asterisk-rest-users', 'post', ':{customMethod:[a-zA-Z]+}'],
            [AsteriskRestUsersRestController::class, 'handleCustomMethod', '/pbxcore/api/v3/asterisk-rest-users', 'post', '/{id:[0-9]+}:{customMethod:[a-zA-Z]+}'],
            
            // Standard CRUD operations
            [AsteriskRestUsersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-rest-users', 'get', '/'],
            [AsteriskRestUsersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-rest-users', 'get', '/{id:[0-9]+}'],
            [AsteriskRestUsersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-rest-users', 'post', '/'],
            [AsteriskRestUsersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-rest-users', 'put', '/{id:[0-9]+}'],
            [AsteriskRestUsersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-rest-users', 'patch', '/{id:[0-9]+}'],
            [AsteriskRestUsersRestController::class, 'handleCRUDRequest', '/pbxcore/api/v3/asterisk-rest-users', 'delete', '/{id:[0-9]+}'],

        ];
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
