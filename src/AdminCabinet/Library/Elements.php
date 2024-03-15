<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Library;

use MikoPBX\AdminCabinet\Controllers\AsteriskManagersController;
use MikoPBX\AdminCabinet\Controllers\CallDetailRecordsController;
use MikoPBX\AdminCabinet\Controllers\CallQueuesController;
use MikoPBX\AdminCabinet\Controllers\ConferenceRoomsController;
use MikoPBX\AdminCabinet\Controllers\ConsoleController;
use MikoPBX\AdminCabinet\Controllers\CustomFilesController;
use MikoPBX\AdminCabinet\Controllers\DialplanApplicationsController;
use MikoPBX\AdminCabinet\Controllers\ExtensionsController;
use MikoPBX\AdminCabinet\Controllers\Fail2BanController;
use MikoPBX\AdminCabinet\Controllers\FirewallController;
use MikoPBX\AdminCabinet\Controllers\GeneralSettingsController;
use MikoPBX\AdminCabinet\Controllers\IncomingRoutesController;
use MikoPBX\AdminCabinet\Controllers\IvrMenuController;
use MikoPBX\AdminCabinet\Controllers\MailSettingsController;
use MikoPBX\AdminCabinet\Controllers\NetworkController;
use MikoPBX\AdminCabinet\Controllers\OutboundRoutesController;
use MikoPBX\AdminCabinet\Controllers\OutOffWorkTimeController;
use MikoPBX\AdminCabinet\Controllers\PbxExtensionModulesController;
use MikoPBX\AdminCabinet\Controllers\ProvidersController;
use MikoPBX\AdminCabinet\Controllers\RestartController;
use MikoPBX\AdminCabinet\Controllers\SoundFilesController;
use MikoPBX\AdminCabinet\Controllers\SystemDiagnosticController;
use MikoPBX\AdminCabinet\Controllers\TimeSettingsController;
use MikoPBX\AdminCabinet\Controllers\UpdateController;
use MikoPBX\AdminCabinet\Providers\SecurityPluginProvider;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Di\Injectable;
use Phalcon\Text;

/**
 * Elements
 * Helps to build UI elements for the application
 *
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 *
 */
class Elements extends Injectable
{

    private array $_headerMenu
        = [
            'setup' => [
                'caption' => 'mm_Setup',
                'iconclass' => '',
                'submenu' => [
                    ExtensionsController::class => [
                        'caption' => 'mm_Extensions',
                        'iconclass' => 'user outline',
                        'action' => 'index',
                        'param' => '#reset-cache',
                        'style' => '',
                    ],
                    CallQueuesController::class => [
                        'caption' => 'mm_CallQueues',
                        'iconclass' => 'users',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    IvrMenuController::class => [
                        'caption' => 'mm_IvrMenu',
                        'iconclass' => 'sitemap',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    ConferenceRoomsController::class => [
                        'caption' => 'mm_ConferenceRooms',
                        'iconclass' => 'phone volume',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    SoundFilesController::class => [
                        'caption' => 'mm_SoundFiles',
                        'iconclass' => 'sound',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    CallDetailRecordsController::class => [
                        'caption' => 'mm_CallDetailRecords',
                        'iconclass' => 'list ul',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],
            'routing' => [
                'caption' => 'mm_Routing',
                'iconclass' => '',
                'submenu' => [
                    ProvidersController::class => [
                        'caption' => 'mm_Providers',
                        'iconclass' => 'server',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    IncomingRoutesController::class => [
                        'caption' => 'mm_IncomingRoutes',
                        'iconclass' => 'map signs',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    OutboundRoutesController::class => [
                        'caption' => 'mm_OutboundRoutes',
                        'iconclass' => 'random',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    OutOffWorkTimeController::class => [
                        'caption' => 'mm_OutOffWorkTime',
                        'iconclass' => 'calendar times outline',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],

            'modules' => [
                'caption' => 'mm_PbxExtensionModules',
                'iconclass' => '',
                'submenu' => [
                    PbxExtensionModulesController::class => [
                        'caption' => 'mm_ModuleManager',
                        'iconclass' => 'store',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    DialplanApplicationsController::class => [
                        'caption' => 'mm_DialplanApplications',
                        'iconclass' => 'php',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],

            'maintenance' => [
                'caption' => 'mm_Maintenance',
                'iconclass' => '',
                'submenu' => [
                    UpdateController::class => [
                        'caption' => 'mm_Update',
                        'iconclass' => 'sync',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    SystemDiagnosticController::class => [
                        'caption' => 'mm_SystemDiagnostic',
                        'iconclass' => 'stethoscope',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    ConsoleController::class => [
                        'caption' => 'mm_SSHConsole',
                        'iconclass' => 'terminal',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    RestartController::class => [
                        'caption' => 'mm_Restart',
                        'iconclass' => 'power off',
                        'action' => 'manage',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],
            'networkSettings' => [
                'caption' => 'mm_NetworkSettings',
                'iconclass' => '',
                'submenu' => [
                    NetworkController::class => [
                        'caption' => 'mm_Network',
                        'iconclass' => 'globe',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    FirewallController::class => [
                        'caption' => 'mm_Firewall',
                        'iconclass' => 'shield alternate',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    Fail2BanController::class => [
                        'caption' => 'mm_Fail2Ban',
                        'iconclass' => 'user secret',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],
            'server' => [
                'caption' => 'mm_System',
                'iconclass' => '',
                'submenu' => [
                    GeneralSettingsController::class => [
                        'caption' => 'mm_GeneralSettings',
                        'iconclass' => 'cogs',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    TimeSettingsController::class => [
                        'caption' => 'mm_TimeSettings',
                        'iconclass' => 'time',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    MailSettingsController::class => [
                        'caption' => 'mm_MailSettings',
                        'iconclass' => 'envelope outline',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    AsteriskManagersController::class => [
                        'caption' => 'mm_AsteriskManagers',
                        'iconclass' => 'asterisk',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    CustomFilesController::class => [
                        'caption' => 'mm_CustomFiles',
                        'iconclass' => 'linux',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],
            'integrations' => [
                'caption' => 'mm_Integrations',
                'iconclass' => 'plug',
                'submenu' => [],
            ]

        ];

    // Array of controllers that are hidden in menu in the Docker installation
    private array $_hiddenInDocker = [
        RestartController::class,
        UpdateController::class
    ];

    /**
     * Generates the HTML code for the header menu by iterating through the items and checking if they are allowed
     * to be displayed by the current user based on their role.
     *
     * @return void
     */
    public function getMenu(): void
    {
        $resultHtml = '';
        $this->addMenuItemSSHMenu();
        $this->addMenuItemsFromExternalModules();

        foreach ($this->_headerMenu as $group => $groupparams) {
            $addToHTML = false;
            $groupHtml = '';
            if (array_key_exists('submenu', $groupparams)) {
                $groupHtml .= '<div class="item">';
                $groupHtml .= '<div class="header">';
                if (array_key_exists('iconclass', $groupparams) && !empty($groupparams['iconclass'])) {
                    $groupHtml .= "<i class='{$groupparams['iconclass']} icon'></i>";
                }
                $groupHtml .= $this->translation->_($groupparams['caption']) . '</div>';
                $groupHtml .= "<div class='menu' data-group='{$group}'>";
                foreach ($groupparams['submenu'] as $controller => $option) {
                    if ($this->ifItPossibleToShowThisElement($controller, $option['action'])) {
                        $link = $this->getLinkToControllerAction($controller,  $option['action'], $option['param']);
                        $caption = $this->translation->_($option['caption']);
                        $groupHtml .= "<a class='item {$option['style']}' href='{$link}'";
                        if (isset($option['data-value'])) {
                            $groupHtml .= " data-value='{$option['data-value']}'";
                        }
                        $groupHtml .= ">
                    		<i class='{$option['iconclass']} icon'></i>{$caption}
                    	 </a>";

                        $addToHTML = true;
                    }
                }
                $groupHtml .= '</div>';
                $groupHtml .= '</div>';
            } elseif ($this->ifItPossibleToShowThisElement($group, $groupparams['action'] ?? 'index')) {
                    $link = $this->getLinkToControllerAction($group,  $groupparams['action'], $groupparams['param']);
                    $caption = $this->translation->_($groupparams['caption']);
                    $groupHtml .= "<a class='item {$groupparams['style']}' href='{$link}'>
                    	    <i class='{$groupparams['iconclass']} icon'></i>{$caption}
                        </a>";
                    $addToHTML = true;
            }
            if ($addToHTML) {
                $resultHtml .= $groupHtml;
            }
        }
        echo $resultHtml;
    }

    /**
     * Returns icon html by controller full class name
     *
     * @param $controllerClass
     *
     * @return string
     */
    public function getIconByController($controllerClass): string
    {
        $result = '';
        foreach ($this->_headerMenu as $index => $group) {
            if ($index === $controllerClass
                && array_key_exists('iconclass', $group[$controllerClass])
                && !empty($group[$controllerClass]['iconclass'])
            ) {
                $result = "<i class='{$group[$controllerClass]['iconclass']} icon'></i>";
                break;
            }
            if (array_key_exists('submenu', $group)) {
                foreach ($group['submenu'] as $index2 => $submenu) {
                    if ($index2 === $controllerClass
                        && !empty($submenu['iconclass'])) {
                        $result = "<i class='{$submenu['iconclass']} icon'></i>";
                        break;
                    }
                }
            }
        }

        if (empty($result)) {
            $result = "<i class='puzzle icon'></i>";
        }
        return $result;
    }

    /**
     * Returns an array with the allowed menu groups based on the current user's permissions.
     *
     * @return array An array of the allowed menu groups where the key is the group name and the value is its caption.
     */
    public function getMenuGroups(): array
    {
        $result = [];
        foreach ($this->_headerMenu as $group => $groupparams) {
            if (array_key_exists('submenu', $groupparams)) {
                $result[$group] = $this->translation->_($groupparams['caption']);
            }
        }

        return $result;
    }

    /**
     * Adds menu items from enabled external modules to the header menu.
     *
     * @return void
     */
    private function addMenuItemsFromExternalModules(): void
    {
        $modules = PbxExtensionModules::getEnabledModulesArray();
        foreach ($modules as $module) {
            $moduleUniqId = $module['uniqid'];
            $moduleMainController = "Modules\\{$moduleUniqId}\\App\\Controllers\\{$moduleUniqId}Controller";
            if (!class_exists($moduleMainController) || !method_exists($moduleMainController, 'indexAction')) {
                continue;
            }
            $menuSettingsKey = "AdditionalMenuItem{$moduleUniqId}";
            $menuSettings = PbxSettings::findFirstByKey($menuSettingsKey);
            if ($menuSettings !== null) {
                $menuItem = json_decode($menuSettings->value, true);
                if ($menuItem['showAtSidebar']) {
                    $this->_headerMenu[$menuItem['group']]['submenu'][$moduleMainController] = [
                        'caption' => $menuItem['caption'],
                        'iconclass' => $menuItem['iconClass'],
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ];
                }
            }
        }

        PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_BEFORE_HEADER_MENU_SHOW, [&$this->_headerMenu]);
    }

    /**
     * Modifies SSH console menu item
     *
     * @return void
     */
    private function addMenuItemSSHMenu(): void
    {
        if (PbxSettings::getValueByKey(PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD) !== '1') {
            $sshPort = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PORT);
            $this->_headerMenu['maintenance']['submenu'][ConsoleController::class]['data-value'] = "root@{$_SERVER['SERVER_ADDR']}:$sshPort";
        } else {
            unset ($this->_headerMenu['maintenance']['submenu'][ConsoleController::class]);
        }
    }

    /**
     * Get the link to a controller action.
     *
     * @param string $controller The controller namespace.
     * @param string $action The action name.
     * @param string $param The parameter value.
     *
     * @return string The generated link.
     */
    private function getLinkToControllerAction(string $controller, string $action, string $param): string
    {
        $controllerParts = explode('\\', $controller);
        $controllerName = end($controllerParts);
        // Remove the "Controller" suffix if present
        $controllerName = str_replace("Controller", "", $controllerName);

        // Convert the controller name to a dash-separated format
        $controllerName = Text::uncamelize($controllerName, '-');

        if ($controllerParts[0]==='Module'){
            // Convert the module name to a dash-separated format
            $moduleName = Text::uncamelize($controllerParts[1], '-');
            $url = $this->url->get("$moduleName/$controllerName/$action/$param");
        } else {
            $url = $this->url->get("$controllerName/$action/$param");
        }

        return $url;
    }

    /**
     * Checks if it's possible to show a specific element based on the controller and action.
     *
     * @param string $controller The name of the controller.
     * @param string $action The name of the action.
     * @return bool True if the element can be shown, false otherwise.
     */
    private function ifItPossibleToShowThisElement(string $controller, string $action):bool
    {
        // Check if the application is running in a Docker environment and if the controller is in the hidden list.
        // If so, return false as the element should not be shown.
        if (Util::isDocker() and in_array($controller, $this->_hiddenInDocker)){
           return false;
        }

        // If the application is not running in Docker or the controller is not in the hidden list,
        // use the SecurityPluginProvider to check if the element can be shown.
        return $this->di->get(SecurityPluginProvider::SERVICE_NAME, [$controller, $action]);
    }

}
