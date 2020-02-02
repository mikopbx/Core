<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Phalcon\Mvc\User\Component;
use Phalcon\Text;

/**
 * Elements
 *
 * Helps to build UI elements for the application
 */
class Elements extends Component
{

    private $_headerMenu
        = [
            'setup'   => [
                'caption'   => 'mm_Setup',
                'iconclass' => '',
                'submenu'   => [
                    'extensions'          => [
                        'caption'   => 'mm_Extensions',
                        'iconclass' => 'user outline',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'call-queues'         => [
                        'caption'   => 'mm_CallQueues',
                        'iconclass' => 'users',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'ivr-menu'            => [
                        'caption'   => 'mm_IvrMenu',
                        'iconclass' => 'sitemap',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'conference-rooms'    => [
                        'caption'   => 'mm_Conferences',
                        'iconclass' => 'phone volume',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'sound-files'         => [
                        'caption'   => 'mm_SoundFiles',
                        'iconclass' => 'sound',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'call-detail-records' => [
                        'caption'   => 'mm_CallDetailRecords',
                        'iconclass' => 'list ul',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                ],
            ],
            'routing' => [
                'caption'   => 'mm_Routing',
                'iconclass' => '',
                'submenu'   => [
                    'providers'         => [
                        'caption'   => 'mm_Providers',
                        'iconclass' => 'server',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'incoming-routes'   => [
                        'caption'   => 'mm_IncomingRoutes',
                        'iconclass' => 'map signs',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'outbound-routes'   => [
                        'caption'   => 'mm_OutboundRoutes',
                        'iconclass' => 'random',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'out-off-work-time' => [
                        'caption'   => 'mm_OutOffWorkTime',
                        'iconclass' => 'calendar times outline',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                ],
            ],

            'modules'         => [
                'caption'   => 'mm_Modules',
                'iconclass' => '',
                'submenu'   => [
                    'dialplan-applications' => [
                        'caption'   => 'mm_DialplanApplication',
                        'iconclass' => 'php',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'pbx-extension-modules' => [
                        'caption'   => 'mm_ModuleManager',
                        'iconclass' => 'puzzle piece',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'licensing' => [
                        'caption'   => 'mm_Licensing',
                        'iconclass' => 'key',
                        'action'    => 'modify',
                        'param'     => '',
                        'style'     => '',
                    ],
                ],
            ],

            //        'diagnostics'=>array(
            //            'caption' => 'Diagnostics',
            //            'iconclass' => '',
            //            'submenu' => array(
            //                'connections' => array(
            //                    'caption' => 'Connecton status',
            //                    'iconclass' => '',
            //                    'action' => 'index',
            //                    'param' =>'',
            //                    'style' =>''
            //                ),
            //                'currentcals'=>array(
            //                    'caption' => 'Current calls',
            //                    'iconclass' => '',
            //                    'action' => 'index',
            //                    'param' =>'',
            //                    'style' =>''
            //                ),
            //                'server-information'=>array(
            //                    'caption' => 'Server information',
            //                    'iconclass' => '',
            //                    'action' => 'index',
            //                    'param' =>'',
            //                    'style' =>''
            //                ),
            //                'error-logs'=>array(
            //                    'caption' => 'Error logs',
            //                    'iconclass' => '',
            //                    'action' => 'index',
            //                    'param' =>'',
            //                    'style' =>''
            //                ),
            //                'diskusage' => array(
            //                    'caption' => 'Disk usage',
            //                    'iconclass' => '',
            //                    'action' => 'index',
            //                    'param' =>'',
            //                    'style' =>''
            //                ),
            //                'packet-capture' => array(
            //                    'caption' => 'Packet capture',
            //                    'iconclass' => '',
            //                    'action' => 'index',
            //                    'param' =>'',
            //                    'style' =>''
            //                ),
            //                'asterisk-cli' => array(
            //                    'caption' => 'Asterisk cli',
            //                    'iconclass' => '',
            //                    'action' => 'index',
            //                    'param' =>'',
            //                    'style' =>''
            //                ),
            //            )
            //        ),
            'maintenance'     => [
                'caption'   => 'mm_Maintenance',
                'iconclass' => '',
                'submenu'   => [
                    'backup'            => [
                        'caption'   => 'mm_Backup',
                        'iconclass' => 'history',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'update'            => [
                        'caption'   => 'mm_UpdateSystem',
                        'iconclass' => 'sync',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'system-diagnostic' => [
                        'caption'   => 'mm_SystemDiagnostic',
                        'iconclass' => 'stethoscope',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'console'   => [
                        'caption'   => 'mm_SSHConsole',
                        'iconclass' => 'terminal',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    // 'factory-reset' => array(
                    //     'caption' => 'Factory defaults',
                    //     'iconclass' => '',
                    //     'action' => 'index',
                    //     'param' =>'',
                    //     'style' =>''
                    // ),
                    'restart'   => [
                        'caption'   => 'mm_Restart',
                        'iconclass' => 'power off',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                ],
            ],
            'networkSettings' => [
                'caption'   => 'mm_NetworkSettings',
                'iconclass' => '',
                'submenu'   => [
                    'network'   => [
                        'caption'   => 'mm_Network',
                        'iconclass' => 'globe',
                        'action'    => 'modify',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'firewall'  => [
                        'caption'   => 'mm_Firewall',
                        'iconclass' => 'shield alternate',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'fail2-ban' => [
                        'caption'   => 'mm_BruteForceProtection',
                        'iconclass' => 'user secret',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                ],
            ],
            'server'          => [
                'caption'   => 'mm_System',
                'iconclass' => '',
                'submenu'   => [
                    'general-settings'  => [
                        'caption'   => 'mm_GeneralSettings',
                        'iconclass' => 'cogs',
                        'action'    => 'modify',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'time-settings'     => [
                        'caption'   => 'mm_SystemClock',
                        'iconclass' => 'time',
                        'action'    => 'modify',
                        'param'     => '',
                        'style'     => '',
                    ],

                    //                'storage' => array(
                    //                    'caption' => 'Storage settings',
                    //                    'iconclass' => '',
                    //                    'action' => 'index',
                    //                    'param' =>'',
                    //                    'style' =>''
                    //                ),
                    'mail-settings'     => [
                        'caption'   => 'mm_MailSettings',
                        'iconclass' => 'envelope outline',
                        'action'    => 'modify',
                        'param'     => '',
                        'style'     => '',
                    ],
                    //                'ldap-settings'=> array(
                    //                    'caption' => 'LDAP settings',
                    //                    'iconclass' => '',
                    //                    'action' => 'index',
                    //                    'param' =>'',
                    //                    'style' =>''
                    //                ),
                    'asterisk-managers' => [
                        'caption'   => 'mm_AsteriskManagerInterface',
                        'iconclass' => 'asterisk',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                    'custom-files'      => [
                        'caption'   => 'mm_CustomFiles',
                        'iconclass' => 'linux',
                        'action'    => 'index',
                        'param'     => '',
                        'style'     => '',
                    ],
                ],
            ],
            'session'         => [
                'caption'   => 'mm_Logout',
                'iconclass' => 'sign out',
                'action'    => 'end',
                'param'     => '',
                'style'     => 'BottomOfPage',
            ],

        ];

    /**
     * Builds header menu with left and right items
     *
     * @return string
     */
    public function getMenu() : void
    {
        $resultHtml = '';
        foreach ($this->_headerMenu as $group => $groupparams) {
            if (array_key_exists('submenu', $groupparams)) {
                $resultHtml .= '<div class="item">';
                $resultHtml .= '<div class="header">';
                if (array_key_exists('iconclass', $groupparams) && ! empty($groupparams['iconclass'])) {
                    $resultHtml .= "<i class='{$groupparams['iconclass']} icon'></i>";
                }
                $resultHtml .=  $this->translation->_($groupparams['caption']) . '</div>';
                $resultHtml .=  "<div class='menu' data-group='{$group}'>";
                foreach ($groupparams['submenu'] as $controller => $option) {
                    $link    = $this->url->get($controller . '/' . $option['action'] . '/' . $option['param']);
                    $caption = $this->translation->_($option['caption']);
                    $resultHtml .=  "<a class='item {$option['style']}' href='{$link}'>
                    		<i class='{$option['iconclass']} icon'></i>{$caption}
                    	 </a>";
                }
                $resultHtml .=  '</div>';
                $resultHtml .=  '</div>';
            } else {
                $link    = $this->url->get($group . '/' . $groupparams['action'] . '/' . $groupparams['param']);
                $caption = $this->translation->_($groupparams['caption']);
                $resultHtml .=  "<a class='item {$groupparams['style']}' href='{$link}'>
                    	<i class='{$groupparams['iconclass']} icon'></i>{$caption}
                      </a>";
            }
        }
        echo $resultHtml;
    }

    /**
     * Получить иконку по имени контроллера
     *
     * @param $controllerName
     *
     * @return string
     */
    public function getIconByController($controllerName): string
    {
        $uncamelizeControllerName = Text::uncamelize($controllerName, '-');
        $result                   = '';
        foreach ($this->_headerMenu as $index => $group) {
            if ($index === $uncamelizeControllerName
                && array_key_exists('iconclass', $group[$uncamelizeControllerName])
                && ! empty($group[$uncamelizeControllerName]['iconclass'])
            ) {
                $result = "<i class='{$group[$uncamelizeControllerName]['iconclass']} icon'></i>";
                break;
            }
            if (array_key_exists('submenu', $group)) {
                foreach ($group['submenu'] as $index2 => $submenu) {
                    if ($index2 === $uncamelizeControllerName
                        && ! empty($submenu['iconclass'])) {
                        $result = "<i class='{$submenu['iconclass']} icon'></i>";
                        break;
                    }
                }
            }
        }
        return $result;
    }

    /**
     * Returns array of main menu groups
     * @return array
     */
    public function getMenuGroups() :array
    {
        $result = [];
        foreach ($this->_headerMenu as $group => $groupparams) {
            if (array_key_exists('submenu', $groupparams)){
                $result[(string)($group)] =$this->translation->_($groupparams['caption']);
            }
        }
        return $result;
    }
}
