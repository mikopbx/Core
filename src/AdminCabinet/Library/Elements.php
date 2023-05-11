<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\AdminCabinet\Providers\SecurityPluginProvider;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
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
                    'extensions' => [
                        'caption' => 'mm_Extensions',
                        'iconclass' => 'user outline',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'call-queues' => [
                        'caption' => 'mm_CallQueues',
                        'iconclass' => 'users',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'ivr-menu' => [
                        'caption' => 'mm_IvrMenu',
                        'iconclass' => 'sitemap',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'conference-rooms' => [
                        'caption' => 'mm_Conferences',
                        'iconclass' => 'phone volume',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'sound-files' => [
                        'caption' => 'mm_SoundFiles',
                        'iconclass' => 'sound',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'call-detail-records' => [
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
                    'providers' => [
                        'caption' => 'mm_Providers',
                        'iconclass' => 'server',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'incoming-routes' => [
                        'caption' => 'mm_IncomingRoutes',
                        'iconclass' => 'map signs',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'outbound-routes' => [
                        'caption' => 'mm_OutboundRoutes',
                        'iconclass' => 'random',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'out-off-work-time' => [
                        'caption' => 'mm_OutOffWorkTime',
                        'iconclass' => 'calendar times outline',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],

            'modules' => [
                'caption' => 'mm_Modules',
                'iconclass' => '',
                'submenu' => [
                    'dialplan-applications' => [
                        'caption' => 'mm_DialplanApplication',
                        'iconclass' => 'php',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'pbx-extension-modules' => [
                        'caption' => 'mm_ModuleManager',
                        'iconclass' => 'puzzle piece',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'licensing' => [
                        'caption' => 'mm_PaidModulesAccessNew',
                        'iconclass' => 'key',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],

            'maintenance' => [
                'caption' => 'mm_Maintenance',
                'iconclass' => '',
                'submenu' => [
                    'update' => [
                        'caption' => 'mm_UpdateSystem',
                        'iconclass' => 'sync',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'system-diagnostic' => [
                        'caption' => 'mm_SystemDiagnostic',
                        'iconclass' => 'stethoscope',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'console' => [
                        'caption' => 'mm_SSHConsole',
                        'iconclass' => 'terminal',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'restart' => [
                        'caption' => 'mm_Restart',
                        'iconclass' => 'power off',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],
            'networkSettings' => [
                'caption' => 'mm_NetworkSettings',
                'iconclass' => '',
                'submenu' => [
                    'network' => [
                        'caption' => 'mm_Network',
                        'iconclass' => 'globe',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    'firewall' => [
                        'caption' => 'mm_Firewall',
                        'iconclass' => 'shield alternate',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'fail2-ban' => [
                        'caption' => 'mm_BruteForceProtection',
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
                    'general-settings' => [
                        'caption' => 'mm_GeneralSettings',
                        'iconclass' => 'cogs',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    'time-settings' => [
                        'caption' => 'mm_SystemClock',
                        'iconclass' => 'time',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    'mail-settings' => [
                        'caption' => 'mm_MailSettings',
                        'iconclass' => 'envelope outline',
                        'action' => 'modify',
                        'param' => '',
                        'style' => '',
                    ],
                    'asterisk-managers' => [
                        'caption' => 'mm_AsteriskManagerInterface',
                        'iconclass' => 'asterisk',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                    'custom-files' => [
                        'caption' => 'mm_CustomFiles',
                        'iconclass' => 'linux',
                        'action' => 'index',
                        'param' => '',
                        'style' => '',
                    ],
                ],
            ],

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
                    $isAllowed = $this->di->get(SecurityPluginProvider::SERVICE_NAME, [$controller, $option['action']]);
                    if ($isAllowed) {
                        $link = $this->url->get($controller . '/' . $option['action'] . '/' . $option['param']);
                        $caption = $this->translation->_($option['caption']);
                        $groupHtml .= "<a class='item {$option['style']}' href='{$link}'";
                        if (isset($option['data-value'])){
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
            } else {
                $isAllowedGroup = $this->di->get(SecurityPluginProvider::SERVICE_NAME, [$group, $groupparams['action'] ?? 'index']);
                if ($isAllowedGroup) {
                    $link = $this->url->get($group . '/' . $groupparams['action'] . '/' . $groupparams['param']);
                    $caption = $this->translation->_($groupparams['caption']);
                    $groupHtml .= "<a class='item {$groupparams['style']}' href='{$link}'>
                    	    <i class='{$groupparams['iconclass']} icon'></i>{$caption}
                        </a>";
                    $addToHTML = true;
                }
            }
            if ($addToHTML) {
                $resultHtml .= $groupHtml;
            }
        }
        echo $resultHtml;
    }

    /**
     * Returns icon html by controller name
     *
     * @param $controllerName
     *
     * @return string
     */
    public function getIconByController($controllerName): string
    {
        $uncamelizeControllerName = Text::uncamelize($controllerName, '-');
        $result = '';
        foreach ($this->_headerMenu as $index => $group) {
            if ($index === $uncamelizeControllerName
                && array_key_exists('iconclass', $group[$uncamelizeControllerName])
                && !empty($group[$uncamelizeControllerName]['iconclass'])
            ) {
                $result = "<i class='{$group[$uncamelizeControllerName]['iconclass']} icon'></i>";
                break;
            }
            if (array_key_exists('submenu', $group)) {
                foreach ($group['submenu'] as $index2 => $submenu) {
                    if ($index2 === $uncamelizeControllerName
                        && !empty($submenu['iconclass'])) {
                        $result = "<i class='{$submenu['iconclass']} icon'></i>";
                        break;
                    }
                }
            }
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
     * Prepares array of available WEB UI languages
     * @return array
     */
    public function getAvailableWebAdminLanguages(): array
    {
        return [
            'en' => $this->translation->_('ex_English'),
            'ru' => $this->translation->_('ex_Russian'),
            'de' => $this->translation->_('ex_Deutsch'),
            'es' => $this->translation->_('ex_Spanish'),
            'el' => $this->translation->_('ex_Greek'),
            'fr' => $this->translation->_('ex_French'),
            'pt' => $this->translation->_('ex_Portuguese'),
            'pt_BR' => $this->translation->_('ex_PortugueseBrazil'),
            'uk' => $this->translation->_('ex_Ukrainian'),
            'ka' => $this->translation->_('ex_Georgian'),
            'it' => $this->translation->_('ex_Italian'),
            'da' => $this->translation->_('ex_Danish'),
            'pl' => $this->translation->_('ex_Polish'),
            'sv' => $this->translation->_('ex_Swedish'),
            'cs' => $this->translation->_('ex_Czech'),
            'tr' => $this->translation->_('ex_Turkish'),
            'ja' => $this->translation->_('ex_Japanese'),
            'vi' => $this->translation->_('ex_Vietnamese'),
            'az' => $this->translation->_('ex_Azərbaycan'),
            'zh_Hans' => $this->translation->_('ex_Chinese'),
        ];
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
            $unCamelizedControllerName = Text::uncamelize($module['uniqid'], '-');
            $isAllowed = $this->di->get(SecurityPluginProvider::SERVICE_NAME, [$unCamelizedControllerName]);
            if ($isAllowed) {
                $menuSettings = "AdditionalMenuItem{$module['uniqid']}";
                $previousMenuSettings = PbxSettings::findFirstByKey($menuSettings);
                if ($previousMenuSettings !== null) {
                    $menuItem = json_decode($previousMenuSettings->value, true);
                    if ($menuItem['showAtSidebar']) {
                        $controllerUrl = "$unCamelizedControllerName\\$unCamelizedControllerName";
                        $this->_headerMenu[$menuItem['group']]['submenu'][$controllerUrl] = [
                            'caption' => $menuItem['caption'],
                            'iconclass' => $menuItem['iconClass'],
                            'action' => 'index',
                            'param' => '',
                            'style' => '',
                        ];
                    }
                }
            }
        }

        PBXConfModulesProvider::hookModulesProcedure(WebUIConfigInterface::ON_BEFORE_HEADER_MENU_SHOW, [&$this->_headerMenu]);
    }

    /**
     * Modifies SSH console menu item
     * @param $headerMenu
     * @return void
     */
    private function addMenuItemSSHMenu():void
    {
        if (PbxSettings::getValueByKey('SSHDisablePasswordLogins')!=='1'){
            $sshPort = PbxSettings::getValueByKey('SSHPort');
            $this->_headerMenu['maintenance']['submenu']['console']['data-value']="root@{$_SERVER['SERVER_ADDR']}:$sshPort";
        } else {
            unset ($this->_headerMenu['maintenance']['submenu']['console']);
        }
    }

}
