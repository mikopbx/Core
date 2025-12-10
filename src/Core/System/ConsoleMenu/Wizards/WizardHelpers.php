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

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\ConsoleMenu\Utilities\MenuStyleConfig;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Di;
use Phalcon\Translate\Adapter\NativeArray;
use PhpSchool\CliMenu\Builder\CliMenuBuilder;
use PhpSchool\CliMenu\CliMenu;
use PhpSchool\CliMenu\Input\InputIO;
use PhpSchool\CliMenu\Input\Text;
use PhpSchool\CliMenu\Style\SelectableStyle;

/**
 * Helper methods for network configuration wizard
 *
 * Provides reusable components for wizard steps:
 * - Arrow-based choice menus
 * - Yes/No prompts
 * - IP address input with validation
 * - Subnet mask input with validation
 * - Configuration summary display
 */
class WizardHelpers
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
     * Show arrow-based choice menu for better UX
     *
     * Creates a temporary submenu with arrow navigation instead of text input popup.
     *
     * @param CliMenu $parentMenu The parent menu context
     * @param string $title Menu title
     * @param array $options Array of options: ['key' => 'Display text', ...]
     * @param string|null $currentValue Current value to show (optional)
     * @return int|null Returns 1-based index of selected option, or null if cancelled
     */
    public function showArrowChoiceMenu(CliMenu $parentMenu, string $title, array $options, ?string $currentValue = null): ?int
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
            ->setWidth($this->styleConfig->getMenuWidth())
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
            SystemMessages::sysLogMsg('WizardHelpers', 'Arrow menu error: ' . $e->getMessage());
            return null;
        }

        return $selectedIndex;
    }

    /**
     * Ask yes/no question
     *
     * @param CliMenu $menu Current menu
     * @param string $prompt Question prompt
     * @return bool|null Returns true for yes, false for no, null if invalid
     */
    public function askYesNo(CliMenu $menu, string $prompt): ?bool
    {
        $style = $this->styleConfig->getInputStyle();
        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };

        $dialog = $input->setPromptText($prompt)
            ->setValidationFailedText($this->translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $dialog->fetch();
        return $result === 'y' ? true : ($result === 'n' ? false : null);
    }

    /**
     * Ask for IP address with validation
     *
     * @param CliMenu $menu Current menu
     * @param string $prompt Question prompt
     * @param string $ipVersion 'v4', 'v6', or 'both'
     * @param bool $allowEmpty Allow empty input (optional field)
     * @return string|null Returns IP address or null/empty if cancelled/skipped
     */
    public function askIPAddress(CliMenu $menu, string $prompt, string $ipVersion = 'both', bool $allowEmpty = false): ?string
    {
        $style = $this->styleConfig->getInputStyle();
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
            ->setValidationFailedText($this->translation->_('cm_Warning'))
            ->ask();
        $result = $dialog->fetch();
        return empty($result) && $allowEmpty ? '' : $result;
    }

    /**
     * Ask for subnet prefix length with validation
     *
     * @param CliMenu $menu Current menu
     * @param string $prompt Question prompt
     * @param string $ipVersion 'v4' or 'v6'
     * @return int|null Returns prefix length or null if cancelled
     */
    public function askSubnet(CliMenu $menu, string $prompt, string $ipVersion): ?int
    {
        $maxBits = $ipVersion === 'v6' ? 128 : 32;
        $style = $this->styleConfig->getInputStyle();
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
            ->setValidationFailedText($this->translation->_('cm_SubnetValidationFailed'))
            ->ask();
        $result = $dialog->fetch();
        return is_numeric($result) ? (int)$result : null;
    }

    /**
     * Show configuration summary before applying
     *
     * @param array $config Configuration to display
     * @return void
     */
    public function showConfigSummary(array $config): void
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
}
