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

namespace MikoPBX\Core\System\ConsoleMenu\Actions;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\System\ConsoleMenu\Utilities\MenuStyleConfig;
use MikoPBX\Core\System\Network;
use Phalcon\Di\Di;
use Phalcon\Translate\Adapter\NativeArray;
use PhpSchool\CliMenu\CliMenu;
use PhpSchool\CliMenu\Input\InputIO;
use PhpSchool\CliMenu\Input\Text;

/**
 * Network-related actions for console menu
 *
 * Handles:
 * - Network interface display
 * - DHCP configuration
 * - Internet interface setting
 */
class NetworkActions
{
    private NativeArray $translation;
    private MenuStyleConfig $styleConfig;

    public function __construct()
    {
        $di = Di::getDefault();
        $this->translation = $di->getShared(TranslationProvider::SERVICE_NAME);
        $this->styleConfig = new MenuStyleConfig();
    }

    /**
     * Display current network interfaces information
     *
     * @return void
     */
    public function displayNetworkInterfaces(): void
    {
        $network = new Network();
        $networks = $network->getEnabledLanInterfaces();

        if (empty($networks)) {
            echo "\n   " . $this->translation->_('cm_NoInterfacesConfigured') . "\n\n";
            return;
        }

        echo "\n   " . $this->translation->_('cm_CurrentNetworkConfiguration') . ":\n";
        echo "   " . str_repeat('-', 70) . "\n";

        foreach ($networks as $if_data) {
            $if_data['interface_orign'] = $if_data['interface'];
            $if_data['interface'] = ($if_data['vlanid'] > 0) ? "vlan{$if_data['vlanid']}" : $if_data['interface'];
            $interface = $network->getInterface($if_data['interface']);

            if (empty($interface['mac'])) {
                continue;
            }

            echo "   Interface: {$if_data['interface']}";
            if ($if_data['internet'] === '1') {
                echo " " . MenuStyleConfig::colorize('[Internet]', MenuStyleConfig::COLOR_GREEN);
            }
            echo "\n";

            // IPv4 configuration
            if ($if_data['dhcp'] === '1') {
                echo "     IPv4: DHCP";
            } elseif (!empty($interface['ipaddr'])) {
                echo "     IPv4: {$interface['ipaddr']}/{$interface['subnet']}";
            } else {
                echo "     IPv4: " . $this->translation->_('cm_NotConfigured');
            }
            echo "\n";

            // IPv6 configuration
            if (!empty($interface['ipv6addr'])) {
                echo "     IPv6: {$interface['ipv6addr']}";
                if (!empty($interface['ipv6_subnet'])) {
                    echo "/{$interface['ipv6_subnet']}";
                }
                echo "\n";
            }

            // MAC address (always exists at this point due to check on line 80)
            echo "     MAC: {$interface['mac']}\n";

            echo "\n";
        }

        echo "   " . str_repeat('-', 70) . "\n\n";
    }

    /**
     * Configure network interface using DHCP
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function setupLanAuto(CliMenu $menu): void
    {
        $ethName = $this->selectInterface($menu);
        if (empty($ethName)) {
            return;
        }

        echo $this->translation->_('cm_LanWillBeConfiguredDhcp');
        $network = new Network();
        $data = [
            'dhcp' => 1,
            'interface' => $ethName,
        ];

        $network->updateNetSettings($data);
        $network->lanConfigure();
        $nginxConf = new NginxConf();
        $nginxConf->reStart();
        sleep(1);

        if ($parent = $menu->getParent()) {
            $menu->closeThis();
            $parent->open();
        }
    }

    /**
     * Set the internet interface flag
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function setupInternetInterface(CliMenu $menu): void
    {
        $ethName = $this->selectInterface($menu);
        if (empty($ethName)) {
            return;
        }

        echo $this->translation->_('cm_LanWillBeConfiguredDhcp');
        $network = new Network();
        $data = [
            'interface' => $ethName,
            'internet' => 1,
        ];
        $network->updateNetSettings($data);
        $network->lanConfigure();

        sleep(1);
        if ($parent = $menu->getParent()) {
            $menu->closeThis();
            $parent->open();
        }
    }

    /**
     * Select network interface from list
     *
     * @param CliMenu $menu Current menu
     * @return string Selected interface name or empty if cancelled
     */
    private function selectInterface(CliMenu $menu): string
    {
        $lan = LanInterfaces::find(['columns' => 'interface'])->toArray();
        $lan = array_column($lan, 'interface');

        if (empty($lan)) {
            echo $this->translation->_('cm_InterfaceNotFound');
            sleep(1);
            if ($parent = $menu->getParent()) {
                $menu->closeThis();
                $parent->open();
            }
            return '';
        }

        if (count($lan) === 1) {
            return $lan[0];
        }

        // Multiple interfaces - ask user
        $style = $this->styleConfig->getInputStyle();
        $input = new class (new InputIO($menu, $menu->getTerminal()), $style, $lan) extends Text {
            private array $lan;

            public function __construct(InputIO $inputIO, $style, array $lan)
            {
                parent::__construct($inputIO, $style);
                $this->lan = $lan;
            }

            public function validate(string $input): bool
            {
                return in_array($input, $this->lan);
            }
        };

        $dialog = $input
            ->setPromptText($this->translation->_('cm_EnterInterfaceName', ['interfaces' => implode(',', $lan)]))
            ->setValidationFailedText($this->translation->_('cm_Warning'))
            ->ask();

        return $dialog->fetch();
    }
}
