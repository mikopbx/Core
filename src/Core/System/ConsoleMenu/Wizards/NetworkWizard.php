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

namespace MikoPBX\Core\System\ConsoleMenu\Wizards;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Utilities\IpAddressHelper;
use Phalcon\Di\Di;
use Phalcon\Translate\Adapter\NativeArray;
use PhpSchool\CliMenu\CliMenu;

/**
 * Network configuration wizard
 *
 * Multi-step wizard for configuring network interfaces:
 * 1. Select interface
 * 2. Configure IPv4 (DHCP/Static/Disabled)
 * 3. Configure IPv6 (Auto/Manual/Disabled)
 * 4. Configure DNS servers
 * 5. Review and confirm
 * 6. Apply configuration
 */
class NetworkWizard
{
    private NativeArray $translation;
    private WizardHelpers $helpers;

    public function __construct()
    {
        $di = Di::getDefault();
        $this->translation = $di->getShared(TranslationProvider::SERVICE_NAME);
        $this->helpers = new WizardHelpers();
    }

    /**
     * Run the network configuration wizard
     *
     * @param CliMenu $menu Parent menu
     * @return void
     */
    public function run(CliMenu $menu): void
    {
        // Step 1: Select interface
        $interfaceName = $this->selectInterface($menu);
        if ($interfaceName === null) {
            $this->showCancelled($menu);
            return;
        }

        // Initialize config with interface name
        $config = ['interface' => $interfaceName];

        // Step 2: Configure IPv4
        $ipv4Config = $this->configureIPv4($menu, $interfaceName);
        if ($ipv4Config === null) {
            $this->showCancelled($menu);
            return;
        }
        $config = array_merge($config, $ipv4Config);

        // Step 3: Configure IPv6
        $ipv6Config = $this->configureIPv6($menu, $interfaceName);
        if ($ipv6Config === null) {
            $this->showCancelled($menu);
            return;
        }
        $config = array_merge($config, $ipv6Config);

        // Step 4: Configure DNS
        $dnsConfig = $this->configureDNS($menu);
        if ($dnsConfig === null) {
            $this->showCancelled($menu);
            return;
        }
        $config = array_merge($config, $dnsConfig);

        // Step 5: Review and confirm
        $confirmed = $this->reviewAndConfirm($menu, $config);
        if ($confirmed === null) {
            $this->showCancelled($menu);
            return;
        }

        if ($confirmed === false) {
            // User wants to edit - restart wizard
            echo $this->translation->_('cm_RestartingWizard') . "\n";
            sleep(1);
            $this->run($menu);
            return;
        }

        // Step 6: Apply configuration
        $this->applyConfiguration($config);

        // Return to parent menu
        if ($parent = $menu->getParent()) {
            $menu->closeThis();
            $parent->open();
        }
    }

    /**
     * Step 1: Select network interface
     *
     * @param CliMenu $menu Current menu
     * @return string|null Interface name or null if cancelled
     */
    private function selectInterface(CliMenu $menu): ?string
    {
        $interfaces = LanInterfaces::find(['columns' => 'interface'])->toArray();
        $interfaceNames = array_column($interfaces, 'interface');

        if (empty($interfaceNames)) {
            echo $this->translation->_('cm_InterfaceNotFound') . "\n";
            sleep(1);
            return null;
        }

        // Auto-select if only one interface
        if (count($interfaceNames) === 1) {
            return $interfaceNames[0];
        }

        // Multiple interfaces - ask user to choose
        $options = [];
        foreach ($interfaceNames as $ifName) {
            $options[$ifName] = $ifName;
        }
        $options['cancel'] = $this->translation->_('cm_Cancel');

        $choice = $this->helpers->showArrowChoiceMenu(
            $menu,
            $this->translation->_('cm_SelectInterface'),
            $options
        );

        // Last option is Cancel
        if ($choice === null || $choice === count($interfaceNames) + 1) {
            return null;
        }

        return $interfaceNames[$choice - 1];
    }

    /**
     * Step 2: Configure IPv4
     *
     * @param CliMenu $menu Current menu
     * @param string $interfaceName Interface name
     * @return array|null Config array or null if cancelled
     */
    private function configureIPv4(CliMenu $menu, string $interfaceName): ?array
    {
        // Load current settings
        $interface = LanInterfaces::findFirst([
            "interface = :interface:",
            'bind' => ['interface' => $interfaceName]
        ]);

        $currentMode = $interface && $interface->dhcp == '1' ? 'DHCP' :
            ($interface && !empty($interface->ipaddr) ? 'Static' : 'Disabled');

        $options = [
            'dhcp' => $this->translation->_('cm_IPv4DHCP'),
            'static' => $this->translation->_('cm_IPv4Static'),
            'disabled' => $this->translation->_('cm_IPv4Disabled'),
            'keep' => $this->translation->_('cm_KeepCurrent'),
            'back' => $this->translation->_('cm_GoBack'),
        ];

        $choice = $this->helpers->showArrowChoiceMenu(
            $menu,
            $this->translation->_('cm_IPv4ConfigMode'),
            $options,
            $currentMode
        );

        if ($choice === null || $choice === 5) {
            return null; // cancelled or go back
        }

        $config = [];

        if ($choice === 4) {
            // Keep current
            if ($interface) {
                $config['dhcp'] = $interface->dhcp;
                $config['ipaddr'] = $interface->ipaddr;
                $config['subnet'] = $interface->subnet;
                $config['gateway'] = $interface->gateway;
            }
            return $config;
        }

        if ($choice === 1) {
            // DHCP
            $config['dhcp'] = '1';
            $config['ipaddr'] = '';
            $config['subnet'] = '';
            $config['gateway'] = '';
            return $config;
        }

        if ($choice === 3) {
            // Disabled
            $config['dhcp'] = '0';
            $config['ipaddr'] = '';
            $config['subnet'] = '';
            $config['gateway'] = '';
            return $config;
        }

        // Choice 2: Static - ask for details
        $config['dhcp'] = '0';

        $ipaddr = $this->helpers->askIPAddress($menu, $this->translation->_('cm_EnterIPv4Address'), 'v4');
        if ($ipaddr === null) {
            return null;
        }
        $config['ipaddr'] = $ipaddr;

        $subnet = $this->helpers->askSubnet($menu, $this->translation->_('cm_EnterIPv4Subnet'), 'v4');
        if ($subnet === null) {
            return null;
        }
        $config['subnet'] = $subnet;

        $gateway = $this->helpers->askIPAddress($menu, $this->translation->_('cm_EnterIPv4Gateway'), 'v4');
        if ($gateway === null) {
            return null;
        }
        $config['gateway'] = $gateway;

        return $config;
    }

    /**
     * Step 3: Configure IPv6
     *
     * @param CliMenu $menu Current menu
     * @param string $interfaceName Interface name
     * @return array|null Config array or null if cancelled
     */
    private function configureIPv6(CliMenu $menu, string $interfaceName): ?array
    {
        // Load current settings
        $interface = LanInterfaces::findFirst([
            "interface = :interface:",
            'bind' => ['interface' => $interfaceName]
        ]);

        $currentMode = $interface && $interface->ipv6_mode == '1' ? 'Auto' :
            ($interface && $interface->ipv6_mode == '2' ? 'Manual' : 'Disabled');

        $options = [
            'auto' => $this->translation->_('cm_IPv6Auto'),
            'manual' => $this->translation->_('cm_IPv6Manual'),
            'disabled' => $this->translation->_('cm_IPv6Disabled'),
            'keep' => $this->translation->_('cm_KeepCurrent'),
            'back' => $this->translation->_('cm_GoBack'),
        ];

        $choice = $this->helpers->showArrowChoiceMenu(
            $menu,
            $this->translation->_('cm_IPv6ConfigMode'),
            $options,
            $currentMode
        );

        if ($choice === null || $choice === 5) {
            return null;
        }

        $config = [];

        if ($choice === 4) {
            // Keep current
            if ($interface) {
                $config['ipv6_mode'] = $interface->ipv6_mode;
                $config['ipv6addr'] = $interface->ipv6addr;
                $config['ipv6_subnet'] = $interface->ipv6_subnet;
                $config['ipv6_gateway'] = $interface->ipv6_gateway;
            }
            return $config;
        }

        if ($choice === 1) {
            // Auto (SLAAC/DHCPv6)
            $config['ipv6_mode'] = '1';
            $config['ipv6addr'] = '';
            $config['ipv6_subnet'] = '';
            $config['ipv6_gateway'] = '';
            return $config;
        }

        if ($choice === 3) {
            // Disabled
            $config['ipv6_mode'] = '0';
            $config['ipv6addr'] = '';
            $config['ipv6_subnet'] = '';
            $config['ipv6_gateway'] = '';
            return $config;
        }

        // Choice 2: Manual - ask for details
        $config['ipv6_mode'] = '2';

        $ipv6addr = $this->helpers->askIPAddress($menu, $this->translation->_('cm_EnterIPv6Address'), 'v6');
        if ($ipv6addr === null) {
            return null;
        }
        $config['ipv6addr'] = $ipv6addr;

        $ipv6_subnet = $this->helpers->askSubnet($menu, $this->translation->_('cm_EnterIPv6Subnet'), 'v6');
        if ($ipv6_subnet === null) {
            return null;
        }
        $config['ipv6_subnet'] = $ipv6_subnet;

        $ipv6_gateway = $this->helpers->askIPAddress($menu, $this->translation->_('cm_EnterIPv6Gateway'), 'v6');
        if ($ipv6_gateway === null) {
            return null;
        }
        $config['ipv6_gateway'] = $ipv6_gateway;

        return $config;
    }

    /**
     * Step 4: Configure DNS servers
     *
     * @param CliMenu $menu Current menu
     * @return array|null DNS config or null if cancelled
     */
    private function configureDNS(CliMenu $menu): ?array
    {
        echo "\n";
        $isInternet = $this->helpers->askYesNo($menu, $this->translation->_('cm_IsInternetInterface'));
        if ($isInternet === null) {
            return null;
        }

        $dnsConfig = [];
        $dnsConfig['internet'] = $isInternet ? '1' : '0';

        if (!$isInternet) {
            return $dnsConfig;
        }

        // Configure DNS servers
        echo "\n" . $this->translation->_('cm_ConfigureDNS') . "\n\n";

        // Primary DNS
        $primaryDns = $this->helpers->askIPAddress($menu, $this->translation->_('cm_EnterPrimaryDNS'), 'both', true);
        if ($primaryDns === null) {
            return null;
        }

        if (!empty($primaryDns)) {
            if (IpAddressHelper::isIpv6($primaryDns)) {
                $dnsConfig['primarydns6'] = $primaryDns;
            } else {
                $dnsConfig['primarydns'] = $primaryDns;
            }
        }

        // Secondary DNS
        $secondaryDns = $this->helpers->askIPAddress($menu, $this->translation->_('cm_EnterSecondaryDNS'), 'both', true);
        if ($secondaryDns === null) {
            return null;
        }

        if (!empty($secondaryDns)) {
            if (IpAddressHelper::isIpv6($secondaryDns)) {
                $dnsConfig['secondarydns6'] = $secondaryDns;
            } else {
                $dnsConfig['secondarydns'] = $secondaryDns;
            }
        }

        return $dnsConfig;
    }

    /**
     * Step 5: Review and confirm configuration
     *
     * @param CliMenu $menu Current menu
     * @param array $config Complete configuration
     * @return bool|null True to apply, false to edit, null to cancel
     */
    private function reviewAndConfirm(CliMenu $menu, array $config): ?bool
    {
        echo "\n";
        $this->helpers->showConfigSummary($config);

        $options = [
            'apply' => $this->translation->_('cm_ApplyConfiguration'),
            'edit' => $this->translation->_('cm_EditConfiguration'),
            'cancel' => $this->translation->_('cm_Cancel'),
        ];

        $choice = $this->helpers->showArrowChoiceMenu(
            $menu,
            $this->translation->_('cm_ReviewConfiguration'),
            $options
        );

        if ($choice === null || $choice === 3) {
            return null;
        }

        if ($choice === 2) {
            return false;
        }

        return true;
    }

    /**
     * Step 6: Apply configuration to database
     *
     * @param array $config Configuration to apply
     * @return void
     */
    private function applyConfiguration(array $config): void
    {
        // Validate IPv6 addresses before saving
        if (!empty($config['ipv6addr'])) {
            if (!IpAddressHelper::isIpv6($config['ipv6addr'])) {
                echo "\n" . $this->translation->_('cm_InvalidIPv6Address') . ": {$config['ipv6addr']}\n";
                sleep(3);
                return;
            }
        }

        if (!empty($config['ipv6_gateway'])) {
            if (!IpAddressHelper::isIpv6($config['ipv6_gateway'])) {
                echo "\n" . $this->translation->_('cm_InvalidIPv6Gateway') . ": {$config['ipv6_gateway']}\n";
                sleep(3);
                return;
            }
        }

        // Find or create interface record
        $interface = LanInterfaces::findFirst([
            "interface = :interface:",
            'bind' => ['interface' => $config['interface']]
        ]);

        if (!$interface) {
            $interface = new LanInterfaces();
            $interface->interface = $config['interface'];
        }

        // Apply all configuration fields
        foreach ($config as $key => $value) {
            if ($key !== 'interface' && property_exists($interface, $key)) {
                $interface->$key = $value;
            }
        }

        // Save - this triggers WorkerModelsEvents automatically
        if ($interface->save()) {
            echo "\n" . $this->translation->_('cm_ConfigurationSaved') . "\n";
            sleep(2);
        } else {
            echo "\nError saving configuration:\n";
            foreach ($interface->getMessages() as $message) {
                echo "  - " . $message . "\n";
            }
            sleep(3);
        }
    }

    /**
     * Show wizard cancelled message and return to parent menu
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    private function showCancelled(CliMenu $menu): void
    {
        echo $this->translation->_('cm_WizardCancelled') . "\n";
        sleep(1);
        if ($parent = $menu->getParent()) {
            $menu->closeThis();
            $parent->open();
        }
    }
}
