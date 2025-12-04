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

namespace MikoPBX\Core\System;

use Closure;
use Exception;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Storage as StorageModel;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\System\{Configs\DnsConf, Configs\Fail2BanConf, Configs\IptablesConf, Configs\NginxConf};
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\Service\Main;
use Phalcon\Di\Di;
use PhpSchool\CliMenu\Action\GoBackAction;
use PhpSchool\CliMenu\Builder\CliMenuBuilder;
use PhpSchool\CliMenu\CliMenu;
use PhpSchool\CliMenu\Input\InputIO;
use PhpSchool\CliMenu\Input\Text;
use PhpSchool\CliMenu\MenuStyle;
use PhpSchool\CliMenu\Style\SelectableStyle;

class ConsoleMenu
{
    private bool $isLiveCd;
    private bool $isDocker;

    public function __construct()
    {
        $this->isLiveCd = file_exists('/offload/livecd');
        $this->isDocker = System::isDocker();
    }

    /**
     * Ensure terminal type is valid, fallback to xterm-256color for unknown terminals.
     * Fixes issue with Ghostty and other modern terminals not recognized by remote system.
     */
    private function ensureValidTerminal(): void
    {
        // Check if tput can work with current terminal
        exec('tput cols 2>&1', $output, $exitCode);

        if ($exitCode !== 0 || empty($output[0]) || (int)$output[0] === 0) {
            // Terminal unknown or cannot determine width, use safe fallback
            putenv('TERM=xterm-256color');
        }
    }

    /**
     * Display network interfaces information
     * @return void
     */
    private function displayNetworkInterfaces(): void
    {
        $network = new Network();
        $networks = $network->getEnabledLanInterfaces();

        if (empty($networks)) {
            echo "\n   No network interfaces configured.\n\n";
            return;
        }

        echo "\n   Current Network Configuration:\n";
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
                echo " \033[01;32m[Internet]\033[39m";
            }
            echo "\n";

            // IPv4 configuration
            if ($if_data['dhcp'] === '1') {
                echo "     IPv4: DHCP";
            } elseif (!empty($interface['ipaddr'])) {
                echo "     IPv4: {$interface['ipaddr']}/{$interface['subnet']}";
            } else {
                echo "     IPv4: Not configured";
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

            // MAC address
            if (!empty($interface['mac'])) {
                echo "     MAC: {$interface['mac']}\n";
            }

            echo "\n";
        }

        echo "   " . str_repeat('-', 70) . "\n\n";
    }

    /**
     * Building a network connection setup menu
     * @param CliMenuBuilder $menuBuilder
     * @return void
     */
    public function setupLan(CliMenuBuilder $menuBuilder): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Display current network configuration
        $this->displayNetworkInterfaces();

        $menuBuilder->setTitle($translation->_('cm_ChooseAction'))
            ->addItem('[1] ' . $translation->_('cm_QuickSetupWizard') . ' (recommended)', Closure::fromCallable([$this, 'setupLanWizard']))
            ->addItem('[2] ' . $translation->_('cm_ConfiguringUsingDHCP'), Closure::fromCallable([$this, 'setupLanAuto']))
            ->addItem('[3] ' . $translation->_('cm_SetInternetInterface'), Closure::fromCallable([$this, 'setupInternetInterface']))
            ->setWidth(75)
            ->setBackgroundColour('black', 'black')
            ->enableAutoShortcuts()
            ->disableDefaultItems()
            ->addItem('[4] ' . $translation->_('cm_Cancel'), new GoBackAction());
    }

    public function setupInternetInterface(CliMenu $menu):void
    {
        $ethName = $this->setupEthParams($menu);
        if(empty($ethName)){
            return;
        }
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        echo $translation->_('cm_LanWillBeConfiguredDhcp');
        $network = new Network();
        $data = [];
        $data['interface'] = $ethName;
        $data['internet'] = intval($ethName);
        $network->updateNetSettings($data);
        $network->lanConfigure();

        sleep(1);
        if ($parent = $menu->getParent()) {
            $menu->closeThis();
            $parent->open();
        }
    }

    /**
     * Return LAN params
     * @param $menu
     * @return array
     */
    private function setupEthParams(CliMenu $menu):string
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $ethName    = '';
        $lan = LanInterfaces::find(['columns' => 'interface'])->toArray();
        $lan = array_column($lan, 'interface');
        if(count($lan)>1){
            // Set style for input menu
            $style = (new MenuStyle())
                ->setBg('white')
                ->setFg('black');

            $inputEth = new class(new InputIO($menu, $menu->getTerminal()), $style, $lan) extends Text {
                private array $lan;
                public function __construct(InputIO $inputIO, $style, array $lan)
                {
                    parent::__construct($inputIO, $style); // если Text принимает эти аргументы
                    $this->lan = $lan;
                }
                public function validate(string $input): bool
                {
                    return in_array($input, $this->lan);
                }
            };
            $elDialog = $inputEth
                ->setPromptText($translation->_('cm_EnterInterfaceName', ['interfaces' => implode(',', $lan)]))
                ->setValidationFailedText($translation->_('cm_Warning'))
                ->ask();
            $ethName = $elDialog->fetch();
        }elseif(empty($lan)){
            echo $translation->_('cm_InterfaceNotFound');
            sleep(1);
            if ($parent = $menu->getParent()) {
                $menu->closeThis();
                $parent->open();
            }
        }else{
            $ethName = $lan[0];
        }
        return $ethName;
    }

    /**
     * DHCP setting LAN
     * @param CliMenu $menu
     * @return void
     */
    public function setupLanAuto (CliMenu $menu) {
        $ethName = $this->setupEthParams($menu);
        if(empty($ethName)){
            return;
        }
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Action for DHCP configuration
        echo $translation->_('cm_LanWillBeConfiguredDhcp');
        $network = new Network();
        $data = [];
        $data['dhcp'] = 1;
        $data['interface'] = $ethName;

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

    // ==================== WIZARD HELPER METHODS ====================

    /**
     * Show arrow-based choice menu for better UX
     * Creates a temporary submenu with arrow navigation instead of text input popup
     *
     * @param CliMenu $parentMenu The parent menu context
     * @param string $title Menu title
     * @param array $options Array of options: ['label' => 'Display text', ...]
     * @param string|null $currentValue Current value to show (optional)
     * @return int|null Returns 1-based index of selected option, or null if cancelled
     */
    private function showArrowChoiceMenu(CliMenu $parentMenu, string $title, array $options, ?string $currentValue = null): ?int
    {
        $selectedIndex = null;
        $optionKeys = array_keys($options);

        // Build the menu title with current value if provided
        $menuTitle = $title;
        if ($currentValue !== null) {
            $menuTitle .= "\n  Current: $currentValue";
        }

        $builder = (new CliMenuBuilder())
            ->setTitle($menuTitle)
            ->setWidth(70)
            ->setBackgroundColour('black')
            ->setForegroundColour('white')
            ->modifySelectableStyle(function (SelectableStyle $style) {
                $style->setSelectedMarker('> ')
                    ->setUnselectedMarker('  ');
            })
            ->disableDefaultItems();

        // Add options with callbacks that save selection and close menu
        foreach ($options as $key => $label) {
            $index = array_search($key, $optionKeys) + 1; // 1-based index
            $builder->addItem(
                "[$index] $label",
                function (CliMenu $menu) use ($index, &$selectedIndex) {
                    $selectedIndex = $index;
                    $menu->close();
                }
            );
        }

        try {
            $menu = $builder->build();
            $menu->open();
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg('ConsoleMenu', 'Arrow menu error: ' . $e->getMessage());
            return null;
        }

        return $selectedIndex;
    }

    /**
     * Ask yes/no question
     * @param CliMenu $menu
     * @param string $prompt
     * @return bool|null Returns true for yes, false for no, null if invalid
     */
    private function askYesNo(CliMenu $menu, string $prompt): ?bool
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $style = (new MenuStyle())->setBg('white')->setFg('black');
        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };

        $dialog = $input->setPromptText($prompt)
            ->setValidationFailedText($translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $dialog->fetch();
        return $result === 'y' ? true : ($result === 'n' ? false : null);
    }

    /**
     * Ask for IP address with validation
     * @param CliMenu $menu
     * @param string $prompt
     * @param string $ipVersion 'v4', 'v6', or 'both'
     * @param bool $allowEmpty Allow empty input (optional field)
     * @return string|null Returns IP address or null/empty if cancelled/skipped
     */
    private function askIPAddress(CliMenu $menu, string $prompt, string $ipVersion = 'both', bool $allowEmpty = false): ?string
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $style = (new MenuStyle())->setBg('white')->setFg('black');
        $input = new class (new InputIO($menu, $menu->getTerminal()), $style, $ipVersion, $allowEmpty) extends Text {
            private string $ipVersion;
            private bool $allowEmpty;
            public function __construct(InputIO $inputIO, $style, string $ipVersion, bool $allowEmpty)
            {
                parent::__construct($inputIO, $style);
                $this->ipVersion = $ipVersion;
                $this->allowEmpty = $allowEmpty;
            }
            public function validate(string $input): bool
            {
                if (empty($input)) {
                    return $this->allowEmpty;
                }
                if ($this->ipVersion === 'v4') {
                    return filter_var($input, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
                }
                if ($this->ipVersion === 'v6') {
                    return filter_var($input, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
                }
                // both
                return filter_var($input, FILTER_VALIDATE_IP) !== false;
            }
        };

        $dialog = $input->setPromptText($prompt)
            ->setValidationFailedText($translation->_('cm_Warning'))
            ->ask();
        $result = $dialog->fetch();
        return empty($result) && $allowEmpty ? '' : $result;
    }

    /**
     * Ask for subnet prefix length with validation
     * @param CliMenu $menu
     * @param string $prompt
     * @param string $ipVersion 'v4' or 'v6'
     * @return int|null Returns prefix length or null if cancelled
     */
    private function askSubnet(CliMenu $menu, string $prompt, string $ipVersion): ?int
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $maxBits = $ipVersion === 'v6' ? 128 : 32;
        $style = (new MenuStyle())->setBg('white')->setFg('black');
        $input = new class (new InputIO($menu, $menu->getTerminal()), $style, $maxBits) extends Text {
            private int $maxBits;
            public function __construct(InputIO $inputIO, $style, int $maxBits)
            {
                parent::__construct($inputIO, $style);
                $this->maxBits = $maxBits;
            }
            public function validate(string $input): bool
            {
                return is_numeric($input) && ($input >= 1) && ($input <= $this->maxBits);
            }
        };

        $dialog = $input->setPromptText($prompt)
            ->setValidationFailedText($translation->_('cm_SubnetValidationFailed'))
            ->ask();
        $result = $dialog->fetch();
        return is_numeric($result) ? (int)$result : null;
    }

    /**
     * Show configuration summary before applying
     * @param array $config Configuration to display
     * @return void
     */
    private function showConfigSummary(array $config): void
    {
        echo "\n" . str_repeat('=', 70) . "\n";
        echo "CONFIGURATION SUMMARY\n";
        echo str_repeat('=', 70) . "\n\n";

        echo "Interface: {$config['interface']}\n\n";

        // IPv4 section
        echo "IPv4 Configuration:\n";
        if (!empty($config['dhcp']) && $config['dhcp'] == '1') {
            echo "  Mode: DHCP (automatic)\n";
        } elseif (!empty($config['ipaddr'])) {
            echo "  Mode: Static\n";
            echo "  Address: {$config['ipaddr']}/{$config['subnet']}\n";
            if (!empty($config['gateway'])) {
                echo "  Gateway: {$config['gateway']}\n";
            }
        } else {
            echo "  Mode: Disabled\n";
        }

        // IPv6 section
        echo "\nIPv6 Configuration:\n";
        $ipv6Mode = $config['ipv6_mode'] ?? '0';
        switch ($ipv6Mode) {
            case '1':
                echo "  Mode: Auto (SLAAC/DHCPv6)\n";
                break;
            case '2':
                echo "  Mode: Manual\n";
                if (!empty($config['ipv6addr'])) {
                    echo "  Address: {$config['ipv6addr']}/{$config['ipv6_subnet']}\n";
                }
                if (!empty($config['ipv6_gateway'])) {
                    echo "  Gateway: {$config['ipv6_gateway']}\n";
                }
                break;
            default:
                echo "  Mode: Disabled\n";
                break;
        }

        // DNS section
        if (!empty($config['primarydns']) || !empty($config['primarydns6'])) {
            echo "\nDNS Configuration:\n";
            if (!empty($config['primarydns'])) {
                echo "  Primary DNS (IPv4): {$config['primarydns']}\n";
            }
            if (!empty($config['secondarydns'])) {
                echo "  Secondary DNS (IPv4): {$config['secondarydns']}\n";
            }
            if (!empty($config['primarydns6'])) {
                echo "  Primary DNS (IPv6): {$config['primarydns6']}\n";
            }
            if (!empty($config['secondarydns6'])) {
                echo "  Secondary DNS (IPv6): {$config['secondarydns6']}\n";
            }
        }

        // Internet interface flag
        if (!empty($config['internet'])) {
            echo "\nInternet Interface: Yes\n";
        }

        echo "\n" . str_repeat('=', 70) . "\n";
    }

    // ==================== END WIZARD HELPER METHODS ====================

    // ==================== WIZARD STEP METHODS ====================

    /**
     * Wizard Step 1: Select network interface
     * @param CliMenu $menu
     * @return string|null Returns interface name or null if cancelled
     */
    private function wizardSelectInterface(CliMenu $menu): ?string
    {
        $interfaces = LanInterfaces::find(['columns' => 'interface'])->toArray();
        $interfaceNames = array_column($interfaces, 'interface');

        if (empty($interfaceNames)) {
            $di = Di::getDefault();
            $translation = $di->getShared(TranslationProvider::SERVICE_NAME);
            echo $translation->_('cm_InterfaceNotFound') . "\n";
            sleep(1);
            return null;
        }

        // Auto-select if only one interface
        if (count($interfaceNames) === 1) {
            return $interfaceNames[0];
        }

        // Multiple interfaces - ask user to choose with arrow menu
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Build options array for arrow menu
        $options = [];
        foreach ($interfaceNames as $ifName) {
            $options[$ifName] = $ifName;
        }
        $options['cancel'] = $translation->_('cm_Cancel');

        $choice = $this->showArrowChoiceMenu(
            $menu,
            $translation->_('cm_SelectInterface'),
            $options
        );

        // Last option is Cancel
        if ($choice === null || $choice === count($interfaceNames) + 1) {
            return null;
        }

        return $interfaceNames[$choice - 1];
    }

    /**
     * Wizard Step 2: Configure IPv4
     * @param CliMenu $menu
     * @param string $interfaceName
     * @return array|null Returns config array or null if cancelled
     */
    private function wizardConfigureIPv4(CliMenu $menu, string $interfaceName): ?array
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Load current settings
        $interface = LanInterfaces::findFirst([
            "interface = :interface:",
            'bind' => ['interface' => $interfaceName]
        ]);

        $currentMode = $interface && $interface->dhcp == '1' ? 'DHCP' :
                      ($interface && !empty($interface->ipaddr) ? 'Static' : 'Disabled');

        // Build options array for arrow menu
        $options = [
            'dhcp' => $translation->_('cm_IPv4DHCP'),
            'static' => $translation->_('cm_IPv4Static'),
            'disabled' => $translation->_('cm_IPv4Disabled'),
            'keep' => $translation->_('cm_KeepCurrent'),
            'back' => $translation->_('cm_GoBack'),
        ];

        $choice = $this->showArrowChoiceMenu(
            $menu,
            $translation->_('cm_IPv4ConfigMode'),
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

        $ipaddr = $this->askIPAddress($menu, $translation->_('cm_EnterIPv4Address'), 'v4');
        if ($ipaddr === null) return null;
        $config['ipaddr'] = $ipaddr;

        $subnet = $this->askSubnet($menu, $translation->_('cm_EnterIPv4Subnet'), 'v4');
        if ($subnet === null) return null;
        $config['subnet'] = $subnet;

        $gateway = $this->askIPAddress($menu, $translation->_('cm_EnterIPv4Gateway'), 'v4');
        if ($gateway === null) return null;
        $config['gateway'] = $gateway;

        return $config;
    }

    /**
     * Wizard Step 3: Configure IPv6
     * @param CliMenu $menu
     * @param string $interfaceName
     * @return array|null Returns config array or null if cancelled
     */
    private function wizardConfigureIPv6(CliMenu $menu, string $interfaceName): ?array
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Load current settings
        $interface = LanInterfaces::findFirst([
            "interface = :interface:",
            'bind' => ['interface' => $interfaceName]
        ]);

        $currentMode = $interface && $interface->ipv6_mode == '1' ? 'Auto' :
                      ($interface && $interface->ipv6_mode == '2' ? 'Manual' : 'Disabled');

        // Build options array for arrow menu
        $options = [
            'auto' => $translation->_('cm_IPv6Auto'),
            'manual' => $translation->_('cm_IPv6Manual'),
            'disabled' => $translation->_('cm_IPv6Disabled'),
            'keep' => $translation->_('cm_KeepCurrent'),
            'back' => $translation->_('cm_GoBack'),
        ];

        $choice = $this->showArrowChoiceMenu(
            $menu,
            $translation->_('cm_IPv6ConfigMode'),
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

        $ipv6addr = $this->askIPAddress($menu, $translation->_('cm_EnterIPv6Address'), 'v6');
        if ($ipv6addr === null) return null;
        $config['ipv6addr'] = $ipv6addr;

        $ipv6_subnet = $this->askSubnet($menu, $translation->_('cm_EnterIPv6Subnet'), 'v6');
        if ($ipv6_subnet === null) return null;
        $config['ipv6_subnet'] = $ipv6_subnet;

        $ipv6_gateway = $this->askIPAddress($menu, $translation->_('cm_EnterIPv6Gateway'), 'v6');
        if ($ipv6_gateway === null) return null;
        $config['ipv6_gateway'] = $ipv6_gateway;

        return $config;
    }

    /**
     * Wizard Step 4: Configure DNS (for internet interface only)
     * @param CliMenu $menu
     * @param array $config Current configuration
     * @return array|null Returns DNS config or null if cancelled
     */
    private function wizardConfigureDNS(CliMenu $menu, array $config): ?array
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Ask if this is internet interface
        echo "\n";
        $isInternet = $this->askYesNo($menu, $translation->_('cm_IsInternetInterface'));
        if ($isInternet === null) {
            return null; // cancelled
        }

        $dnsConfig = [];
        $dnsConfig['internet'] = $isInternet ? '1' : '0';

        if (!$isInternet) {
            return $dnsConfig; // No DNS configuration needed
        }

        // Configure DNS servers
        echo "\n" . $translation->_('cm_ConfigureDNS') . "\n\n";

        // Primary DNS (IPv4 or IPv6)
        $primaryDns = $this->askIPAddress($menu, $translation->_('cm_EnterPrimaryDNS'), 'both', true);
        if ($primaryDns === null) return null;

        if (!empty($primaryDns)) {
            if (IpAddressHelper::isIpv6($primaryDns)) {
                $dnsConfig['primarydns6'] = $primaryDns;
            } else {
                $dnsConfig['primarydns'] = $primaryDns;
            }
        }

        // Secondary DNS (optional)
        $secondaryDns = $this->askIPAddress($menu, $translation->_('cm_EnterSecondaryDNS'), 'both', true);
        if ($secondaryDns === null) return null;

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
     * Wizard Step 5: Review and confirm configuration
     * @param CliMenu $menu
     * @param array $config Complete configuration
     * @return bool|null Returns true to apply, false to edit, null to cancel
     */
    private function wizardReviewAndConfirm(CliMenu $menu, array $config): ?bool
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Show configuration summary first
        echo "\n";
        $this->showConfigSummary($config);

        // Build options array for arrow menu
        $options = [
            'apply' => $translation->_('cm_ApplyConfiguration'),
            'edit' => $translation->_('cm_EditConfiguration'),
            'cancel' => $translation->_('cm_Cancel'),
        ];

        $choice = $this->showArrowChoiceMenu(
            $menu,
            $translation->_('cm_ReviewConfiguration'),
            $options
        );

        if ($choice === null || $choice === 3) {
            return null; // cancelled
        }

        if ($choice === 2) {
            return false; // go back to edit
        }

        return true; // apply
    }

    /**
     * Wizard Step 6: Apply configuration via model save
     * @param array $config Configuration to apply
     * @return void
     */
    private function wizardApplyConfiguration(array $config): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Validate IPv6 configuration before saving
        if (!empty($config['ipv6addr'])) {
            if (!IpAddressHelper::isIpv6($config['ipv6addr'])) {
                echo "\n" . $translation->_('cm_InvalidIPv6Address') . ": {$config['ipv6addr']}\n";
                sleep(3);
                return;
            }
        }

        if (!empty($config['ipv6_gateway'])) {
            if (!IpAddressHelper::isIpv6($config['ipv6_gateway'])) {
                echo "\n" . $translation->_('cm_InvalidIPv6Gateway') . ": {$config['ipv6_gateway']}\n";
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
            echo "\n" . $translation->_('cm_ConfigurationSaved') . "\n";
            sleep(2);
        } else {
            echo "\nError saving configuration:\n";
            foreach ($interface->getMessages() as $message) {
                echo "  - " . $message . "\n";
            }
            sleep(3);
        }
    }

    // ==================== END WIZARD STEP METHODS ====================

    /**
     * Network Setup Wizard - Main coordinator method
     * @param CliMenu $menu
     * @return void
     */
    public function setupLanWizard(CliMenu $menu): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Step 1: Select interface
        $interfaceName = $this->wizardSelectInterface($menu);
        if ($interfaceName === null) {
            echo $translation->_('cm_WizardCancelled') . "\n";
            sleep(1);
            if ($parent = $menu->getParent()) {
                $menu->closeThis();
                $parent->open();
            }
            return;
        }

        // Initialize config with interface name
        $config = ['interface' => $interfaceName];

        // Step 2: Configure IPv4
        $ipv4Config = $this->wizardConfigureIPv4($menu, $interfaceName);
        if ($ipv4Config === null) {
            echo $translation->_('cm_WizardCancelled') . "\n";
            sleep(1);
            if ($parent = $menu->getParent()) {
                $menu->closeThis();
                $parent->open();
            }
            return;
        }
        $config = array_merge($config, $ipv4Config);

        // Step 3: Configure IPv6
        $ipv6Config = $this->wizardConfigureIPv6($menu, $interfaceName);
        if ($ipv6Config === null) {
            echo $translation->_('cm_WizardCancelled') . "\n";
            sleep(1);
            if ($parent = $menu->getParent()) {
                $menu->closeThis();
                $parent->open();
            }
            return;
        }
        $config = array_merge($config, $ipv6Config);

        // Step 4: Configure DNS
        $dnsConfig = $this->wizardConfigureDNS($menu, $config);
        if ($dnsConfig === null) {
            echo $translation->_('cm_WizardCancelled') . "\n";
            sleep(1);
            if ($parent = $menu->getParent()) {
                $menu->closeThis();
                $parent->open();
            }
            return;
        }
        $config = array_merge($config, $dnsConfig);

        // Step 5: Review and confirm
        $confirmed = $this->wizardReviewAndConfirm($menu, $config);
        if ($confirmed === null) {
            echo $translation->_('cm_WizardCancelled') . "\n";
            sleep(1);
            if ($parent = $menu->getParent()) {
                $menu->closeThis();
                $parent->open();
            }
            return;
        }

        if ($confirmed === false) {
            // User wants to edit - restart wizard
            echo "Returning to wizard...\n";
            sleep(1);
            $this->setupLanWizard($menu);
            return;
        }

        // Step 6: Apply configuration
        $this->wizardApplyConfiguration($config);

        // Return to main menu
        if ($parent = $menu->getParent()) {
            $menu->closeThis();
            $parent->open();
        }
    }


    /**
     * Menu Language Settings
     * @param CliMenuBuilder $menuBuilder
     * @return void
     */
    public function setupLanguage(CliMenuBuilder $menuBuilder): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $languages = [
            'en' => $translation->_('ex_English'),
            'ru' => $translation->_('ex_Russian'),
            'de' => $translation->_('ex_Deutsch'),
            'es' => $translation->_('ex_Spanish'),
            'fr' => $translation->_('ex_French'),
            'pt' => $translation->_('ex_Portuguese'),
            'uk' => $translation->_('ex_Ukrainian'),
            'it' => $translation->_('ex_Italian'),
            'da' => $translation->_('ex_Danish'),
            'nl' => $translation->_('ex_Dutch'),
            'pl' => $translation->_('ex_Polish'),
            'sv' => $translation->_('ex_Swedish'),
            'az' => $translation->_('ex_Azerbaijan'),
            'ro' => $translation->_('ex_Romanian'),
            // not able to show in console without additional shell fonts, maybe later we add it
            // 'th' => Util::translate('ex_Thai'),
            // 'el'      => Util::translate('ex_Greek'),
            // 'ka'      => Util::translate('ex_Georgian'),
            // 'cs'      => Util::translate('ex_Czech'),
            // 'tr'      => Util::translate('ex_Turkish'),
            // 'ja'      => Util::translate('ex_Japanese'),
            // 'vi'      => Util::translate('ex_Vietnamese'),
            // 'zh_Hans' => Util::translate('ex_Chinese'),
        ];

        $menuBuilder->setTitle($translation->_('cm_ChooseShellLanguage'))
            ->setWidth(75)
            ->setBackgroundColour('black', 'black')
            ->enableAutoShortcuts()
            ->disableDefaultItems();

        // Apply language selection
        $index = 1;
        foreach ($languages as $language => $name) {
            $menuBuilder->addItem(
                "[$index] $name",
                function () use ($language) {
                    PbxSettings::setValueByKey(PbxSettings::SSH_LANGUAGE, $language);
                    $di = Di::getDefault();
                    $di?->remove(TranslationProvider::SERVICE_NAME);
                    $this->start();
                }
            );
            $index++;
        }
        $menuBuilder->addItem("[$index] " . $translation->_('cm_Cancel'), new GoBackAction());
    }

    /**
     * Launching the console menu
     * @return void
     */
    public function start(): void
    {
        // Ensure terminal type is recognized, fallback to xterm-256color for unknown terminals
        $this->ensureValidTerminal();

        RegisterDIServices::init();

        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Set Cyrillic font for display
        Util::setCyrillicFont();
        $separator = '-';
        $titleWidth = 75;
        $title = str_repeat($separator, 2) . '  ' . $translation->_('cm_PbxConsoleSetup') . '  ';
        $titleSeparator = mb_substr($title . str_repeat($separator, $titleWidth - mb_strlen($title)), 0, $titleWidth);

        $menu = new CliMenuBuilder();
        $menu->setTitle($this->getBannerText())
            ->setTitleSeparator($titleSeparator)
            ->enableAutoShortcuts()
            ->setPadding(0)
            ->setMarginAuto()
            ->setForegroundColour('white', 'white')
            ->setBackgroundColour('black', 'black')
            ->modifySelectableStyle(
                function (SelectableStyle $style) {
                    $style->setSelectedMarker(' ')
                        ->setUnselectedMarker(' ');
                }
            )
            ->setWidth($titleWidth)
            ->addItem(' ', static function (CliMenu $menu) {
            })
            ->addSubMenu('[1] ' . $translation->_('cm_ChangeLanguage'), Closure::fromCallable([$this, 'setupLanguage']));

        if ($this->isDocker) {
            $menu->addSubMenu('[3] ' . $translation->_('cm_RebootSystem'), Closure::fromCallable([$this, 'setupReboot']))
                ->addItem('[4] ' . $translation->_('cm_PingHost'), Closure::fromCallable([$this, 'pingAction']))
                ->addItem('[5] ' . $translation->_('cm_Firewall') . $this->firewallWarning(), Closure::fromCallable([$this, 'setupFirewall']))
                ->addItem('[7] ' . $translation->_('cm_ResetAdminPassword'), Closure::fromCallable([$this, 'resetPassword']));
        } elseif ($this->isLiveCd) {
            $menu->addSubMenu('[2] ' . $translation->_('cm_SetupLanIpAddress'), Closure::fromCallable([$this, 'setupLan']))
                ->addSubMenu('[3] ' . $translation->_('cm_RebootSystem'), Closure::fromCallable([$this, 'setupReboot']))
                ->addItem('[4] ' . $translation->_('cm_PingHost'), Closure::fromCallable([$this, 'pingAction']));
            // Add items for live CD options
            if (file_exists('/conf.recover/conf')) {
                $menu->addItem('[8] ' . $translation->_('cm_InstallOrRecover'), Closure::fromCallable([$this, 'installRecoveryAction']));
            } else {
                $menu->addItem('[8] ' . $translation->_('cm_InstallOnHardDrive'), Closure::fromCallable([$this, 'installAction']));
            }
        } else {
            $menu->addSubMenu('[2] ' . $translation->_('cm_SetupLanIpAddress'), Closure::fromCallable([$this, 'setupLan']))
                ->addSubMenu('[3] ' . $translation->_('cm_RebootSystem'), Closure::fromCallable([$this, 'setupReboot']))
                ->addItem('[4] ' . $translation->_('cm_PingHost'), Closure::fromCallable([$this, 'pingAction']))
                ->addItem('[5] ' . $translation->_('cm_Firewall') . $this->firewallWarning(), Closure::fromCallable([$this, 'setupFirewall']))
                ->addSubMenu('[6] ' . $translation->_('cm_Storage') . $this->storageWarning(), Closure::fromCallable([$this, 'setupStorage']))
                ->addItem('[7] ' . $translation->_('cm_ResetAdminPassword'), Closure::fromCallable([$this, 'resetPassword']));
        }
        $menu->addItem('[9] ' . $translation->_('cm_Console'), Closure::fromCallable([$this, 'consoleAction']))
            ->disableDefaultItems();

        $menuBuilder = $menu->build();
        if ($menuBuilder->getTerminal()->isInteractive()) {
            echo(str_repeat(PHP_EOL, $menu->getTerminal()->getHeight()));
            try {
                $menuBuilder->open();
            } catch (\Throwable $e) {
                SystemMessages::sysLogMsg('ConsoleMenu', $e->getMessage());
                sleep(1);
            }
        }
    }

    /**
     * Function to get the banner text
     */
    private function getBannerText(): string
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $network = new Network();

        $liveCdText = '';
        if ($this->isLiveCd) {
            $liveCdText = $translation->_('cm_PbxLiveModeWarning');
        }

        // Determine version and build time
        if (file_exists('/offload/version')) {
            $version_file = '/offload/version';
        } else {
            $version_file = '/etc/version';
        }

        $version = trim(file_get_contents($version_file));
        $buildtime = trim(file_get_contents('/etc/version.buildtime'));

        // Copyright information
        $copyright_info = 'MikoPBX is Copyright © 2017-2025. All rights reserved.' . PHP_EOL .
            "   \033[01;31m" . $liveCdText . "\033[39m";


        // Get enabled LAN interfaces
        $networks = $network->getEnabledLanInterfaces();

        // Find internet interface for Web UI URL
        $webInterfaceIp = '';
        foreach ($networks as $if_data) {
            if ($if_data['internet'] === '1') {
                $if_data['interface'] = ($if_data['vlanid'] > 0) ? "vlan{$if_data['vlanid']}" : $if_data['interface'];
                $interface = $network->getInterface($if_data['interface']);

                // Prefer IPv4, fallback to IPv6
                if (!empty($interface['ipaddr'])) {
                    $webInterfaceIp = $interface['ipaddr'];
                } elseif (!empty($interface['ipv6addr'])) {
                    $webInterfaceIp = $interface['ipv6addr'];
                }
                break;
            }
        }

        // Get virtual hardware type
        $virtualHardwareType = PbxSettings::getValueByKey(PbxSettings::VIRTUAL_HARDWARE_TYPE);
        $versionSuffix = '';
        if (!empty($virtualHardwareType)) {
            $versionSuffix = " in $virtualHardwareType";
        }

        // Check for system integrity
        $broken = function () use ($translation) {
            if (Util::isT2SdeLinux()) {
                $files = Main::checkForCorruptedFiles();
                if (count($files) !== 0) {
                    return "   \033[01;31m" . $translation->_('cm_SystemIntegrityBroken') . "\033[39m";
                }
            } elseif (php_uname('m') === 'x86_64' && System::isDocker()) {
                $files = Main::checkForCorruptedFiles();
                if (count($files) !== 0) {
                    return "   \033[01;31m" . $translation->_('cm_SystemIntegrityBroken') . "\033[39m";
                }
            }
            return '';
        };

        // Determine architecture display name
        if (System::isARM64()) {
            $archDisplay = 'arm64';
        } elseif (System::isAMD64()) {
            $archDisplay = 'x64';
        } else {
            $archDisplay = php_uname('m');
        }

        // Generate the banner text
        $result = "*** " . $translation->_('cm_ThisIs') . " \033[01;32mMikoPBX v.$version$versionSuffix\033[39m" . PHP_EOL .
            "   built on $buildtime ($archDisplay)" . PHP_EOL .
            "   " . $copyright_info . PHP_EOL . PHP_EOL;

        // Display Web Interface URL if internet interface has IP
        if (!empty($webInterfaceIp)) {
            $httpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT);
            $webUrl = 'https://';

            // Handle IPv6 addresses - wrap in brackets
            if (IpAddressHelper::isIpv6($webInterfaceIp)) {
                $webUrl .= '[' . $webInterfaceIp . ']';
            } else {
                $webUrl .= $webInterfaceIp;
            }

            // Add port only if it's not standard (443)
            if ($httpsPort !== '443') {
                $webUrl .= ':' . $httpsPort;
            }

            $result .= '   ' . $translation->_('cm_WebInterfaceUrl') . ': ' . "\033[01;36m" . $webUrl . "\033[39m" . PHP_EOL;
        }

        // Append system integrity information
        $result .= $broken();
        return $result;
    }

    /**
     * Returns the firewall status text
     * @return string
     */
    public function firewallWarning(): string
    {
        // Check if the firewall is disabled
        if (PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED) === '0') {
            $di = Di::getDefault();
            $translation = $di->getShared(TranslationProvider::SERVICE_NAME);
            return "\033[01;34m (" . $translation->_('cm_FirewallDisabled') . ") \033[39m";
        }
        return '';
    }

    /**
     * Returns the text of the storage status
     * @return string
     */
    public function storageWarning(): string
    {
        // Check if storage disk is unmounted and not in livecd mode
        if (!$this->isLiveCd && !Storage::isStorageDiskMounted()) {
            $di = Di::getDefault();
            $translation = $di->getShared(TranslationProvider::SERVICE_NAME);
            return "    \033[01;31m (" . $translation->_('cm_StorageUnmounted') . ") \033[39m";
        }
        return '';
    }

    /**
     * Reboot and Shutdown Settings
     * @param CliMenuBuilder $b
     * @return void
     */
    public function setupReboot(CliMenuBuilder $b): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $b->setTitle($translation->_('cm_ChooseAction'))
            ->enableAutoShortcuts()
            ->addItem(
                '[1] ' . $translation->_('cm_Reboot'),
                function (CliMenu $menu) {
                    try {
                        $menu->close();
                    } catch (Exception $e) {
                    }
                    System::reboot();
                    sleep(2);
                    exit(0);
                }
            )
            ->addItem(
                '[2] ' . $translation->_('cm_PowerOff'),
                function (CliMenu $menu) {
                    try {
                        $menu->close();
                    } catch (Exception $e){
                    }
                    file_put_contents('/tmp/shutdown', '1');
                    exit(0);
                }
            )
            ->setWidth(75)
            ->setForegroundColour('white', 'white')
            ->setBackgroundColour('black', 'black')
            ->disableDefaultItems()
            ->addItem('[3] ' . $translation->_('cm_Cancel'), new GoBackAction());
    }

    /**
     * Ping Command Handler
     * @param CliMenu $menu
     * @return void
     */
    public function pingAction(CliMenu $menu): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $style = new MenuStyle();
        $style->setBg('white')
            ->setFg('black');
        $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
        };
        $elLanIp = $input_ip
            ->setPromptText($translation->_('cm_EnterHostnameOrIp'))
            ->setValidationFailedText($translation->_('cm_Warning'))
            ->ask();
        $pingHost = $elLanIp->fetch();
        $pingPath = Util::which('ping');
        $timeoutPath = Util::which('timeout');
        passthru("$timeoutPath 4 $pingPath -c3 " . escapeshellarg($pingHost));
        sleep(2);
        $this->start();
    }

    /**
     * Configuring firewall
     * @param CliMenu $menu
     * @return void
     */
    public function setupFirewall(CliMenu $menu): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Code for firewall optionn
        $firewall_enable = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED);

        if ($firewall_enable === '1') {
            $action = 'disable';
        } else {
            $action = 'enable';
        }

        $helloText = $translation->_('cm_DoYouWantFirewallAction', ['action' => $action]);
        $style = (new MenuStyle())
            ->setBg('white')
            ->setFg('black');

        $inputDialog = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };
        $elDialog = $inputDialog
            ->setPromptText($helloText)
            ->setValidationFailedText($translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $elDialog->fetch();

        if ($result === 'y') {
            $enable = '0';
            if ('enable' === $action) {
                $enable = '1';
            }
            PbxSettings::setValueByKey(PbxSettings::PBX_FIREWALL_ENABLED, $enable);
            PbxSettings::setValueByKey(PbxSettings::PBX_FAIL2BAN_ENABLED, $enable);
            IptablesConf::reloadFirewall();

            $fail2ban = new Fail2BanConf();
            $fail2ban->reStart();
            echo "Firewall is {$action}d...";
        }
        $this->start();
    }

    /**
     * Setting up a disk for data storage
     * @param CliMenuBuilder $b
     * @return void
     */
    public function setupStorage(CliMenuBuilder $b): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $b->setTitle($translation->_('cm_ChooseAction'))
            ->addItem(
                '[1] ' . $translation->_('cm_ConnectStorage'),
                function (CliMenu $menu) {
                    // Code for connecting storage
                    $menu->close();
                    Storage::selectAndConfigureStorageDisk();
                    sleep(1);
                    exit(0);
                }
            )
            ->addItem(
                '[2] ' . $translation->_('cm_CheckStorage'),
                function (CliMenu $menu) {
                    $di = Di::getDefault();
                    $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

                    // Code for checking storage
                    /** @var StorageModel $data */
                    $data = StorageModel::findFirst();
                    if (!$data) {
                        echo "\n " . $translation->_('cm_ValidDisksNotFound') . " \n";
                        return;
                    }
                    $style = (new MenuStyle())
                        ->setBg('white')
                        ->setFg('black');
                    $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
                        public function validate(string $input): bool
                        {
                            return ($input === 'y' || $input === 'n');
                        }
                    };
                    $elDialog = $input_ip
                        ->setPromptText($translation->_('cm_AllProcessesWillBeCompleted'))
                        ->setValidationFailedText($translation->_('cm_WarningYesNo'))
                        ->ask();
                    $result = $elDialog->fetch();
                    $menu->close();
                    if ($result !== 'y') {
                        sleep(2);
                        exit(0);
                    }
                    $dev_name = file_exists("{$data->device}4") ? "{$data->device}4" : "{$data->device}1";

                    passthru('/sbin/freestorage');
                    passthru('e2fsck -f -p ' . escapeshellarg($dev_name), $return_var);
                    echo "check return $return_var";
                    sleep(2);
                    system('/sbin/pbx_reboot');
                }
            )
            ->addItem(
                '[3] ' . $translation->_('cm_ResizeStorage'),
                function (CliMenu $menu) {
                    $di = Di::getDefault();
                    $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

                    // Code for resizing storage
                    /** @var StorageModel $data */
                    $data = StorageModel::findFirst();
                    if ($data === null) {
                        echo "\n " . $translation->_('cm_ValidDisksNotFound') . " \n";
                        return;
                    }
                    $style = (new MenuStyle())
                        ->setBg('white')
                        ->setFg('black');

                    $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
                        public function validate(string $input): bool
                        {
                            return ($input === 'y' || $input === 'n');
                        }
                    };
                    $elDialog = $input_ip
                        ->setPromptText($translation->_('cm_AllProcessesWillBeCompleted'))
                        ->setValidationFailedText($translation->_('cm_WarningYesNo'))
                        ->ask();
                    $result = $elDialog->fetch();
                    $menu->close();
                    if ($result !== 'y') {
                        sleep(2);
                        exit(0);
                    }
                    passthru('/etc/rc/resize_storage_part ' . escapeshellarg($data->device), $return_var);
                    echo "resize storage return $return_var";
                    sleep(2);
                    if ($return_var === 0) {
                        file_put_contents('/tmp/ejectcd', '');
                        $pbx_rebootPath = Util::which('pbx_reboot');
                        Processes::mwExecBg($pbx_rebootPath);
                    }
                }
            )
            ->setWidth(75)
            ->enableAutoShortcuts()
            ->setForegroundColour('white', 'white')
            ->setBackgroundColour('black', 'black')
            ->disableDefaultItems()
            ->addItem('[4] ' . $translation->_('cm_Cancel'), new GoBackAction());
    }

    /**
     * Reset web password
     * @param CliMenu $menu
     * @return void
     */
    public function resetPassword(CliMenu $menu): void
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Code for resetting admin password
        $style = (new MenuStyle())
            ->setBg('white')
            ->setFg('black');

        $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };
        $elResetPassword = $input_ip
            ->setPromptText($translation->_('cm_DoYouWantResetPassword'))
            ->setValidationFailedText($translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $elResetPassword->fetch();
        if ($result !== 'y') {
            return;
        }
        try {
            $menu->close();
        } catch (Exception $e) {
        }

        PbxSettings::resetValueToDefault(PbxSettings::WEB_ADMIN_LOGIN);
        PbxSettings::resetValueToDefault(PbxSettings::WEB_ADMIN_PASSWORD);

        $newLogin = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LOGIN);
        $newPassword = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD);
        echo $translation->_('cm_PasswordSuccessfullyReset', ['login' => $newLogin, 'password' => $newPassword]);
        sleep(2);
        $this->start();
    }

    /**
     * System Installation or Recovery action
     * @param CliMenu $menu
     * @return void
     */
    public function installRecoveryAction(CliMenu $menu): void
    {
        echo "\e[?25h";
        try {
            $menu->close();
        } catch (Exception $e) {
        }
        file_put_contents('/tmp/ejectcd', '');
        $recovery = new PBXRecovery();
        $recovery->run();
        exit(0);
    }

    /**
     * System Installation
     * @param CliMenu $menu
     * @return void
     */
    public function installAction(CliMenu $menu): void
    {
        echo "\e[?25h";
        try {
            $menu->close();
        } catch (Exception $e) {
        }
        file_put_contents('/tmp/ejectcd', '');
        $installer = new PBXInstaller();
        $installer->run();
        exit(0);
    }

    /**
     * Console Opening Action
     * @param CliMenu $menu
     * @return void
     */
    public function consoleAction(CliMenu $menu): void
    {
        // Enable cursor
        echo "\e[?25h";
        try {
            $menu->close();
        } catch (Exception $e) {
        }
        file_put_contents('/tmp/start_sh', '');
        exit(0);
    }
}
