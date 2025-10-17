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

namespace MikoPBX\PBXCoreREST\Services;

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Controllers\Extensions\RestController as ExtensionsController;
use MikoPBX\PBXCoreREST\Controllers\CallQueues\RestController as CallQueuesController;
use MikoPBX\PBXCoreREST\Controllers\IvrMenu\RestController as IvrMenuController;
use MikoPBX\PBXCoreREST\Controllers\ConferenceRooms\RestController as ConferenceRoomsController;
use MikoPBX\PBXCoreREST\Controllers\DialplanApplications\RestController as DialplanApplicationsController;
use MikoPBX\PBXCoreREST\Controllers\IncomingRoutes\RestController as IncomingRoutesController;
use MikoPBX\PBXCoreREST\Controllers\OutboundRoutes\RestController as OutboundRoutesController;
use MikoPBX\PBXCoreREST\Controllers\OffWorkTimes\RestController as OffWorkTimesController;
use MikoPBX\PBXCoreREST\Controllers\Sip\RestController as SipController;
use MikoPBX\PBXCoreREST\Controllers\Iax\RestController as IaxController;
use MikoPBX\PBXCoreREST\Controllers\SipProviders\RestController as SipProvidersController;
use MikoPBX\PBXCoreREST\Controllers\IaxProviders\RestController as IaxProvidersController;
use MikoPBX\PBXCoreREST\Controllers\Providers\RestController as ProvidersController;
use MikoPBX\PBXCoreREST\Controllers\Cdr\RestController as CdrController;
use MikoPBX\PBXCoreREST\Controllers\Auth\RestController as AuthController;
use MikoPBX\PBXCoreREST\Controllers\ApiKeys\RestController as ApiKeysController;
use MikoPBX\PBXCoreREST\Controllers\AsteriskManagers\RestController as AsteriskManagersController;
use MikoPBX\PBXCoreREST\Controllers\AsteriskRestUsers\RestController as AsteriskRestUsersController;
use MikoPBX\PBXCoreREST\Controllers\Passkeys\RestController as PasskeysController;
use MikoPBX\PBXCoreREST\Controllers\Passwords\RestController as PasswordsController;
use MikoPBX\PBXCoreREST\Controllers\Fail2Ban\RestController as Fail2BanController;
use MikoPBX\PBXCoreREST\Controllers\Firewall\RestController as FirewallController;
use MikoPBX\PBXCoreREST\Controllers\NetworkFilters\RestController as NetworkFiltersController;
use MikoPBX\PBXCoreREST\Controllers\Users\RestController as UsersController;
use MikoPBX\PBXCoreREST\Controllers\Employees\RestController as EmployeesController;
use MikoPBX\PBXCoreREST\Controllers\System\RestController as SystemController;
use MikoPBX\PBXCoreREST\Controllers\Storage\RestController as StorageController;
use MikoPBX\PBXCoreREST\Controllers\Network\RestController as NetworkController;
use MikoPBX\PBXCoreREST\Controllers\TimeSettings\RestController as TimeSettingsController;
use MikoPBX\PBXCoreREST\Controllers\GeneralSettings\RestController as GeneralSettingsController;
use MikoPBX\PBXCoreREST\Controllers\MailSettings\RestController as MailSettingsController;
use MikoPBX\PBXCoreREST\Controllers\Sysinfo\RestController as SysinfoController;
use MikoPBX\PBXCoreREST\Controllers\Syslog\RestController as SyslogController;
use MikoPBX\PBXCoreREST\Controllers\Advice\RestController as AdviceController;
use MikoPBX\PBXCoreREST\Controllers\SoundFiles\RestController as SoundFilesController;
use MikoPBX\PBXCoreREST\Controllers\Files\RestController as FilesController;
use MikoPBX\PBXCoreREST\Controllers\CustomFiles\RestController as CustomFilesController;
use MikoPBX\PBXCoreREST\Controllers\Modules\RestController as ModulesController;
use MikoPBX\PBXCoreREST\Controllers\License\RestController as LicenseController;
use MikoPBX\PBXCoreREST\Controllers\UserPageTracker\RestController as UserPageTrackerController;
use MikoPBX\PBXCoreREST\Controllers\WikiLinks\RestController as WikiLinksController;

/**
 * API Tag Registry
 *
 * Centralized registry for API tag groups and endpoint tags.
 * Maps controller classes to tag names and organizes them into hierarchical groups
 * for OpenAPI specification generation and Stoplight Elements navigation.
 *
 * Similar to AdminCabinet/Library/Elements.php menu structure but for REST API.
 *
 * @package MikoPBX\PBXCoreREST\Services
 */
class ApiTagRegistry
{
    /**
     * Tag groups configuration with translation keys
     *
     * Structure matches AdminCabinet menu pattern:
     * - Group key => group configuration
     * - caption => translation key for group name
     * - tags => array of controller classes with their tag configurations
     *
     * @var array<string, array{caption: string, tags: array<string, array{caption: string}>}>
     */
    private static array $tagGroups = [
        'core_pbx_functions' => [
            'caption' => 'rest_tag_group_CorePBXFunctions',
            'tags' => [
                ExtensionsController::class => [
                    'caption' => 'rest_tag_Extensions'
                ],
                CallQueuesController::class => [
                    'caption' => 'rest_tag_CallQueues'
                ],
                IvrMenuController::class => [
                    'caption' => 'rest_tag_IVRMenu'
                ],
                ConferenceRoomsController::class => [
                    'caption' => 'rest_tag_ConferenceRooms'
                ],
                DialplanApplicationsController::class => [
                    'caption' => 'rest_tag_DialplanApplications'
                ],
            ],
        ],
        'routing_scheduling' => [
            'caption' => 'rest_tag_group_RoutingScheduling',
            'tags' => [
                IncomingRoutesController::class => [
                    'caption' => 'rest_tag_IncomingRoutes'
                ],
                OutboundRoutesController::class => [
                    'caption' => 'rest_tag_OutboundRoutes'
                ],
                OffWorkTimesController::class => [
                    'caption' => 'rest_tag_OffWorkTimes'
                ],
            ],
        ],
        'connectivity_communication' => [
            'caption' => 'rest_tag_group_ConnectivityCommunication',
            'tags' => [
                SipController::class => [
                    'caption' => 'rest_tag_SIP'
                ],
                IaxController::class => [
                    'caption' => 'rest_tag_IAX'
                ],
                SipProvidersController::class => [
                    'caption' => 'rest_tag_SIPProviders'
                ],
                IaxProvidersController::class => [
                    'caption' => 'rest_tag_IAXProviders'
                ],
                ProvidersController::class => [
                    'caption' => 'rest_tag_Providers'
                ],
                CdrController::class => [
                    'caption' => 'rest_tag_CDR'
                ],
            ],
        ],
        'security_access' => [
            'caption' => 'rest_tag_group_SecurityAccess',
            'tags' => [
                AuthController::class => [
                    'caption' => 'rest_tag_Authentication'
                ],
                ApiKeysController::class => [
                    'caption' => 'rest_tag_APIKeys'
                ],
                AsteriskManagersController::class => [
                    'caption' => 'rest_tag_AsteriskManagers'
                ],
                AsteriskRestUsersController::class => [
                    'caption' => 'rest_tag_AsteriskRESTUsers'
                ],
                PasskeysController::class => [
                    'caption' => 'rest_tag_Passkeys'
                ],
                PasswordsController::class => [
                    'caption' => 'rest_tag_Passwords'
                ],
                Fail2BanController::class => [
                    'caption' => 'rest_tag_Fail2Ban'
                ],
                FirewallController::class => [
                    'caption' => 'rest_tag_Firewall'
                ],
                NetworkFiltersController::class => [
                    'caption' => 'rest_tag_NetworkFilters'
                ],
                UsersController::class => [
                    'caption' => 'rest_tag_Users'
                ],
                EmployeesController::class => [
                    'caption' => 'rest_tag_Employees'
                ],
            ],
        ],
        'system_configuration' => [
            'caption' => 'rest_tag_group_SystemConfiguration',
            'tags' => [
                SystemController::class => [
                    'caption' => 'rest_tag_System'
                ],
                StorageController::class => [
                    'caption' => 'rest_tag_Storage'
                ],
                NetworkController::class => [
                    'caption' => 'rest_tag_Network'
                ],
                TimeSettingsController::class => [
                    'caption' => 'rest_tag_TimeSettings'
                ],
                GeneralSettingsController::class => [
                    'caption' => 'rest_tag_GeneralSettings'
                ],
                MailSettingsController::class => [
                    'caption' => 'rest_tag_MailSettings'
                ],
            ],
        ],
        'diagnostics_monitoring' => [
            'caption' => 'rest_tag_group_DiagnosticsMonitoring',
            'tags' => [
                SysinfoController::class => [
                    'caption' => 'rest_tag_SystemInformation'
                ],
                SyslogController::class => [
                    'caption' => 'rest_tag_SystemLogs'
                ],
                AdviceController::class => [
                    'caption' => 'rest_tag_SystemAdvice'
                ],
            ],
        ],
        'resources_media' => [
            'caption' => 'rest_tag_group_ResourcesMedia',
            'tags' => [
                SoundFilesController::class => [
                    'caption' => 'rest_tag_SoundFiles'
                ],
                FilesController::class => [
                    'caption' => 'rest_tag_Files'
                ],
                CustomFilesController::class => [
                    'caption' => 'rest_tag_CustomFiles'
                ],
            ],
        ],
        'platform' => [
            'caption' => 'rest_tag_group_Platform',
            'tags' => [
                ModulesController::class => [
                    'caption' => 'rest_tag_Modules'
                ],
                LicenseController::class => [
                    'caption' => 'rest_tag_License'
                ],
                UserPageTrackerController::class => [
                    'caption' => 'rest_tag_Analytics'
                ],
                WikiLinksController::class => [
                    'caption' => 'rest_tag_Documentation'
                ],
            ],
        ],
    ];

    /**
     * Get tag name by controller class
     *
     * @param string $controllerClass Full controller class name
     * @return string|null Tag name (translated) or null if not found
     */
    public static function getTagByController(string $controllerClass): ?string
    {
        foreach (self::$tagGroups as $group) {
            if (isset($group['tags'][$controllerClass])) {
                return TranslationProvider::translate($group['tags'][$controllerClass]['caption']);
            }
        }
        return null;
    }

    /**
     * Get all tags with their translation keys
     *
     * @return array<string, string> Map of controller class => tag name
     */
    public static function getAllTags(): array
    {
        $result = [];
        foreach (self::$tagGroups as $group) {
            foreach ($group['tags'] as $controller => $config) {
                $result[$controller] = TranslationProvider::translate($config['caption']);
            }
        }
        return $result;
    }

    /**
     * Generate x-tagGroups structure for OpenAPI specification
     *
     * @return array<int, array{name: string, tags: array<string>}>
     */
    public static function generateTagGroups(): array
    {
        $result = [];

        foreach (self::$tagGroups as $groupKey => $groupConfig) {
            $groupName = TranslationProvider::translate($groupConfig['caption']);
            $tags = [];

            foreach ($groupConfig['tags'] as $controller => $tagConfig) {
                $tags[] = TranslationProvider::translate($tagConfig['caption']);
            }

            $result[] = [
                'name' => $groupName,
                'tags' => $tags
            ];
        }

        return $result;
    }

    /**
     * Get tag groups configuration (for debugging/inspection)
     *
     * @return array<string, array{caption: string, tags: array<string, array{caption: string}>}>
     */
    public static function getTagGroupsConfig(): array
    {
        return self::$tagGroups;
    }
}
