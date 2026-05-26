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
     * @param int|null $defaultIndex 1-based index of the option to pre-select (optional)
     * @return int|null Returns 1-based index of selected option, or null if cancelled
     */
    public function showArrowChoiceMenu(
        CliMenu $parentMenu,
        string $title,
        array $options,
        ?string $currentValue = null,
        ?int $defaultIndex = null
    ): ?int {
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

            // Digit hotkeys: pressing 1..min(9, count) selects the matching option.
            $hotkeyLimit = min(9, count($options));
            for ($position = 1; $position <= $hotkeyLimit; $position++) {
                $digit = (string)$position;
                $menu->addCustomControlMapping(
                    $digit,
                    function (CliMenu $hotkeyMenu) use ($position, &$selectedIndex) {
                        $selectedIndex = $position;
                        $hotkeyMenu->close();
                    }
                );
            }

            // Pre-select a specific item if requested (e.g. "Keep current").
            if ($defaultIndex !== null && $defaultIndex >= 1 && $defaultIndex <= count($options)) {
                $item = $menu->getItemByIndex($defaultIndex - 1);
                if ($item->canSelect()) {
                    $menu->setSelectedItem($item);
                }
            }
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
                $input = strtolower(trim($input));
                return in_array($input, ['y', 'n', 'yes', 'no']);
            }
        };

        $dialog = $input->setPromptText($prompt)
            ->setValidationFailedText($this->translation->_('cm_WarningYesNo'))
            ->ask();
        $result = strtolower(trim($dialog->fetch()));
        return ($result === 'y' || $result === 'yes') ? true : (($result === 'n' || $result === 'no') ? false : null);
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
     * Render the pending configuration as a diff against the current DB record.
     *
     * Returns a multi-line string (no trailing newline) suitable for handing
     * straight to CliMenu::setTitle, so the box is drawn inside the same
     * alternate-screen frame as the menu items and doesn't get cleared on open.
     *
     * Shows only fields that actually change (old → new). Headline carries the
     * interface name on the right. When nothing changes, returns a single line
     * stating that Apply will only refresh DNS.
     *
     * Width is 64 to leave room for CliMenu's margin/border/padding on terminals
     * down to 80 columns.
     *
     * @param array $config Pending configuration from the wizard
     * @param LanInterfaces|null $current Existing record for the interface, or null if new
     * @return string Box ready to be used as menu title
     */
    public function renderChangesBoxed(array $config, ?LanInterfaces $current): string
    {
        // 60 leaves comfortable headroom for CliMenu's margin/border/padding when
        // the title is rendered as a StaticItem on terminals down to ~76 cols.
        $width = 60;
        $interface = (string)($config['interface'] ?? '');
        $diff = $this->buildConfigDiff($config, $current);
        $title = $current === null ? 'NEW INTERFACE' : 'CHANGES TO APPLY';

        $lines = [];
        $lines[] = $this->boxTopLine($width, $title, $interface);
        $lines[] = $this->boxLine($width, '');

        if (empty($diff)) {
            $lines[] = $this->boxLine($width, '  no changes (Apply will refresh DNS only)');
        } else {
            foreach ($diff as [$field, $oldVal, $newVal]) {
                $lines[] = $this->boxLine($width, $this->formatDiffRow($field, $oldVal, $newVal));
            }
        }

        $lines[] = $this->boxLine($width, '');
        $lines[] = $this->boxBottomLine($width);

        return implode("\n", $lines);
    }

    /**
     * Build a list of [field, old, new] triples for fields that change.
     *
     * @param array $config Pending configuration
     * @param LanInterfaces|null $current Current record (null = new interface)
     * @return array<int, array{0:string,1:string,2:string}>
     */
    private function buildConfigDiff(array $config, ?LanInterfaces $current): array
    {
        $dash = '—';

        $currentIpv4Mode = $current !== null
            ? $this->labelIpv4Mode((string)$current->dhcp, (string)$current->ipaddr)
            : $dash;
        $newIpv4Mode = $this->labelIpv4Mode(
            (string)($config['dhcp'] ?? '0'),
            (string)($config['ipaddr'] ?? '')
        );

        $currentIpv4Addr = $current !== null && !empty($current->ipaddr)
            ? $current->ipaddr . (!empty($current->subnet) ? '/' . $current->subnet : '')
            : $dash;
        $newIpv4Addr = !empty($config['ipaddr'])
            ? $config['ipaddr'] . (!empty($config['subnet']) ? '/' . $config['subnet'] : '')
            : $dash;

        $currentIpv4Gw = $current !== null && !empty($current->gateway) ? (string)$current->gateway : $dash;
        $newIpv4Gw = !empty($config['gateway']) ? (string)$config['gateway'] : $dash;

        $currentIpv6Mode = $current !== null ? $this->labelIpv6Mode((string)$current->ipv6_mode) : $dash;
        $newIpv6Mode = $this->labelIpv6Mode((string)($config['ipv6_mode'] ?? '0'));

        $currentIpv6Addr = $current !== null && !empty($current->ipv6addr)
            ? $current->ipv6addr . (!empty($current->ipv6_subnet) ? '/' . $current->ipv6_subnet : '')
            : $dash;
        $newIpv6Addr = !empty($config['ipv6addr'])
            ? $config['ipv6addr'] . (!empty($config['ipv6_subnet']) ? '/' . $config['ipv6_subnet'] : '')
            : $dash;

        $currentIpv6Gw = $current !== null && !empty($current->ipv6_gateway) ? (string)$current->ipv6_gateway : $dash;
        $newIpv6Gw = !empty($config['ipv6_gateway']) ? (string)$config['ipv6_gateway'] : $dash;

        $currentIpv4Dns = $this->labelIpv4Dns(
            $current !== null ? (string)$current->dhcp : '0',
            $current !== null ? (string)$current->primarydns : '',
            $current !== null ? (string)$current->secondarydns : ''
        );
        $newIpv4Dns = $this->labelIpv4Dns(
            (string)($config['dhcp'] ?? '0'),
            (string)($config['primarydns'] ?? ''),
            (string)($config['secondarydns'] ?? '')
        );

        $currentIpv6Dns = $this->labelIpv6Dns(
            $current !== null ? (string)$current->ipv6_mode : '0',
            $current !== null ? (string)$current->primarydns6 : '',
            $current !== null ? (string)$current->secondarydns6 : ''
        );
        $newIpv6Dns = $this->labelIpv6Dns(
            (string)($config['ipv6_mode'] ?? '0'),
            (string)($config['primarydns6'] ?? ''),
            (string)($config['secondarydns6'] ?? '')
        );

        $currentInternet = $current !== null ? ((string)$current->internet === '1' ? 'yes' : 'no') : $dash;
        // NetworkWizard::configureDNS always sets $config['internet'] before this
        // step, so no fallback is needed.
        $newInternet = ($config['internet'] ?? '0') === '1' ? 'yes' : 'no';

        $candidates = [
            ['IPv4 mode',  $currentIpv4Mode, $newIpv4Mode],
            ['IPv4 addr',  $currentIpv4Addr, $newIpv4Addr],
            ['IPv4 gw',    $currentIpv4Gw,   $newIpv4Gw],
            ['IPv6 mode',  $currentIpv6Mode, $newIpv6Mode],
            ['IPv6 addr',  $currentIpv6Addr, $newIpv6Addr],
            ['IPv6 gw',    $currentIpv6Gw,   $newIpv6Gw],
            ['DNS (v4)',   $currentIpv4Dns,  $newIpv4Dns],
            ['DNS (v6)',   $currentIpv6Dns,  $newIpv6Dns],
            ['Internet',   $currentInternet, $newInternet],
        ];

        $diff = [];
        foreach ($candidates as [$field, $oldVal, $newVal]) {
            if ($oldVal !== $newVal) {
                $diff[] = [$field, $oldVal, $newVal];
            }
        }
        return $diff;
    }

    private function labelIpv4Mode(string $dhcp, string $ipaddr): string
    {
        if ($dhcp === '1') {
            return 'DHCP';
        }
        if ($ipaddr !== '') {
            return 'Static';
        }
        return 'Disabled';
    }

    private function labelIpv6Mode(string $mode): string
    {
        return match ($mode) {
            '1' => 'Auto (DHCPv6+SLAAC)',
            '2' => 'Manual',
            default => 'Disabled',
        };
    }

    private function labelIpv4Dns(string $dhcp, string $primary, string $secondary): string
    {
        if ($dhcp === '1') {
            return 'via DHCP';
        }
        $parts = array_values(array_filter([$primary, $secondary], static fn (string $v) => $v !== ''));
        return $parts === [] ? 'auto (fallback)' : implode(', ', $parts);
    }

    private function labelIpv6Dns(string $ipv6Mode, string $primary, string $secondary): string
    {
        if ($ipv6Mode === '0') {
            return $primary === '' && $secondary === '' ? 'disabled' : implode(', ', array_filter([$primary, $secondary]));
        }
        if ($ipv6Mode === '1') {
            return 'via DHCPv6';
        }
        // Mode 2 (Manual): show explicit values or note that nothing was set.
        $parts = array_values(array_filter([$primary, $secondary], static fn (string $v) => $v !== ''));
        return $parts === [] ? 'none' : implode(', ', $parts);
    }

    /**
     * Format a single diff row: field name + old value + arrow + new value.
     *
     * Uses character-aware padding (mb_strlen) so multi-byte glyphs like '—'
     * and '→' don't push columns sideways — sprintf '%-Ns' counts bytes, which
     * breaks alignment for UTF-8 box drawings.
     */
    private function formatDiffRow(string $field, string $oldVal, string $newVal): string
    {
        $fieldWidth = 10;
        $valWidth = 16;

        if (mb_strlen($oldVal) > $valWidth) {
            $oldVal = mb_substr($oldVal, 0, $valWidth - 1) . '…';
        }
        if (mb_strlen($newVal) > $valWidth) {
            $newVal = mb_substr($newVal, 0, $valWidth - 1) . '…';
        }

        return '  '
            . $this->padRight($field, $fieldWidth)
            . '  '
            . $this->padRight($oldVal, $valWidth)
            . '  →  '
            . $newVal;
    }

    /**
     * Right-pad a UTF-8 string to a visible character width.
     */
    private function padRight(string $s, int $width): string
    {
        $missing = $width - mb_strlen($s);
        return $missing > 0 ? $s . str_repeat(' ', $missing) : $s;
    }

    /**
     * Build the top border line: ╔══ <title> ═══...═══ <right> ══╗
     */
    private function boxTopLine(int $width, string $title = '', string $right = ''): string
    {
        if ($title === '' && $right === '') {
            return '╔' . str_repeat('═', $width - 2) . '╗';
        }
        $leftPiece = $title !== '' ? "╔══ {$title} " : '╔';
        $rightPiece = $right !== '' ? " {$right} ══╗" : '╗';
        $fill = $width - mb_strlen($leftPiece) - mb_strlen($rightPiece);
        return $leftPiece . str_repeat('═', max(0, $fill)) . $rightPiece;
    }

    /**
     * Build the bottom border line: ╚════...════╝
     */
    private function boxBottomLine(int $width): string
    {
        return '╚' . str_repeat('═', $width - 2) . '╝';
    }

    /**
     * Build a content line with vertical borders, padded to the box width.
     */
    private function boxLine(int $width, string $text): string
    {
        $clean = preg_replace('/\033\[[0-9;]+m/', '', $text);
        $textLength = mb_strlen($clean);
        $padding = max(0, $width - $textLength - 4);
        return '║ ' . $text . str_repeat(' ', $padding) . ' ║';
    }

}
