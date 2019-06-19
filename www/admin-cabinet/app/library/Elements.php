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
class Elements extends Component {

	private $_headerMenu
		= [


			'setup'       => [
				'caption'   => 'mm_Setup',
				'iconclass' => '',
				'submenu'   => [
					//                'users'=>array(
					//                    'caption' => 'Users',
					//                    'iconclass' => '',
					//                    'action' => 'index',
					//                    'param' =>'',
					//                    'style' =>''
					//                ),
					'extensions'            => [
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
			'routing'     => [
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
					// 'module-smart-i-v-r'    => array(
					// 	'caption'   => 'mm_ModuleSmartIVR',
					// 	'iconclass' => 'compass',
					// 	'action'    => 'index',
					// 	'param'     => '',
					// 	'style'     => '',
					// ),
					// 'module-c-t-i-client'   => array(
					// 	'caption'   => 'mm_ModuleCTIClient',
					// 	'iconclass' => 'laptop',
					// 	'action'    => 'index',
					// 	'param'     => '',
					// 	'style'     => '',
					// ),
					'pbx-extension-modules' => array(
						'caption'   => 'mm_ModuleManager',
						'iconclass' => 'puzzle piece',
						'action'    => 'index',
						'param'     => '',
						'style'     => '',
					),
					//                'autoprovisioning' => array(
					//                    'caption' => 'Autoprovisioning',
					//                    'iconclass' => '',
					//                    'action' => 'index',
					//                    'param' =>'',
					//                    'style' =>''
					//                ),
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
			'maintenance'     => array(
				'caption'   => 'mm_Maintenance',
				'iconclass' => '',
				'submenu'   => array(
					'backup'            => array(
						'caption'   => 'mm_Backup',
						'iconclass' => 'umbrella',
						'action'    => 'index',
						'param'     => '',
						'style'     => '',
					),
					'update'            => array(
						'caption'   => 'mm_UpdateSystem',
						'iconclass' => 'sync',
						'action'    => 'index',
						'param'     => '',
						'style'     => '',
					),
					'system-diagnostic' => array(
						'caption'   => 'mm_SystemDiagnostic',
						'iconclass' => 'stethoscope',
						'action'    => 'index',
						'param'     => '',
						'style'     => '',
					),

					'licensing'         => [
						'caption'   => 'mm_Licensing',
						'iconclass' => 'key',
						'action'    => 'modify',
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
					'restart'           => array(
						'caption'   => 'mm_Restart',
						'iconclass' => 'power off',
						'action'    => 'index',
						'param'     => '',
						'style'     => '',
					),
				),
			),
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
					'fail2-ban' => array(
						'caption'   => 'mm_BruteForceProtection',
						'iconclass' => 'user secret',
						'action'    => 'index',
						'param'     => '',
						'style'     => '',
					),
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
	public function getMenu() {
		foreach ( $this->_headerMenu as $group => $groupparams ) {
			if ( key_exists( 'submenu', $groupparams ) ) {
				echo '<div class="item">';
				echo '<div class="header">';
				if ( key_exists( 'iconclass', $groupparams ) && ! empty( $groupparams['iconclass'] ) ) {
					echo "<i class='{$groupparams['iconclass']} icon'></i>";
				}
				echo $this->translation->_( $groupparams['caption'] ) . '</div>';
				echo '<div class="menu">';
				foreach ( $groupparams['submenu'] as $controller => $option ) {
					$link= $this->url->get( $controller . '/' . $option['action'] . '/' . $option['param'] );
					$caption = $this->translation->_( $option['caption'] );
					echo "<a class='item {$option['style']}' href='{$link}'>
                    		<i class='{$option['iconclass']} icon'></i>{$caption}
                    	 </a>";
				}
				echo '</div>';
				echo '</div>';
			} else {
				$link= $this->url->get( $group . '/' . $groupparams['action'] . '/'. $groupparams['param'] );
				$caption = $this->translation->_( $groupparams['caption'] );
				echo "<a class='item {$groupparams['style']}' href='{$link}'>
                    	<i class='{$groupparams['iconclass']} icon'></i>{$caption}
                      </a>";
			}
		}

	}

	public function getIconByController( $controllerName ) {
		$uncamelizeControllerName = Text::uncamelize( $controllerName, '-' );
		$result                   = '';
		foreach ( $this->_headerMenu as $index => $group ) {
			if ( $index == $uncamelizeControllerName
			     && key_exists( 'iconclass', $group[$uncamelizeControllerName] )
			     && ! empty($group[$uncamelizeControllerName]['iconclass'])
			) {
				$result = "<i class='{$group[$uncamelizeControllerName]['iconclass']} icon'></i>";
				break;
			}
			if ( key_exists( 'submenu', $group ) ) {
				foreach ( $group['submenu'] as $index2 => $submenu ) {
					if ( $index2 == $uncamelizeControllerName
					&& !empty($submenu['iconclass'])) {
						$result = "<i class='{$submenu['iconclass']} icon'></i>";
						break;
					}
				}
			}
		}

		return $result;
	}
}
