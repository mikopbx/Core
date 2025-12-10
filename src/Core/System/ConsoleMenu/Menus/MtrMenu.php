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

namespace MikoPBX\Core\System\ConsoleMenu\Menus;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Core\System\ConsoleMenu\Actions\DiagnosticActions;
use PhpSchool\CliMenu\CliMenu;
use PhpSchool\CliMenu\Input\InputIO;
use PhpSchool\CliMenu\Input\Text;

/**
 * MTR host selection menu
 *
 * Provides arrow-navigable menu to select MTR target:
 * - Gateway (from internet interface)
 * - Google DNS (8.8.8.8)
 * - Yandex DNS (77.88.8.8)
 * - Cloudflare DNS (1.1.1.1)
 * - Custom host input
 */
class MtrMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_MtrSelectHost');
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;
        $diagnosticActions = new DiagnosticActions();

        // Get gateway from internet interface
        $gateway = $this->getDefaultGateway();

        // [1] Gateway (if available)
        if (!empty($gateway)) {
            $label = $this->translation->_('cm_MtrGateway') . " ($gateway)";
            $builder->addItem("[$index] $label", function (CliMenu $menu) use ($diagnosticActions, $gateway, $parentMenu) {
                $menu->close();
                $diagnosticActions->runMtr($gateway);
                $parentMenu?->open();
            });
            $index++;
        }

        // [2] Google DNS
        $builder->addItem("[$index] Google DNS (8.8.8.8)", function (CliMenu $menu) use ($diagnosticActions, $parentMenu) {
            $menu->close();
            $diagnosticActions->runMtr('8.8.8.8');
            $parentMenu?->open();
        });
        $index++;

        // [3] Yandex DNS
        $builder->addItem("[$index] Yandex DNS (77.88.8.8)", function (CliMenu $menu) use ($diagnosticActions, $parentMenu) {
            $menu->close();
            $diagnosticActions->runMtr('77.88.8.8');
            $parentMenu?->open();
        });
        $index++;

        // [4] Cloudflare DNS
        $builder->addItem("[$index] Cloudflare DNS (1.1.1.1)", function (CliMenu $menu) use ($diagnosticActions, $parentMenu) {
            $menu->close();
            $diagnosticActions->runMtr('1.1.1.1');
            $parentMenu?->open();
        });
        $index++;

        // [5] Custom host
        $builder->addItem("[$index] " . $this->translation->_('cm_MtrCustomHost'), function (CliMenu $menu) use ($diagnosticActions, $parentMenu) {
            $host = $this->askCustomHost($menu);
            if (!empty($host)) {
                $menu->close();
                $diagnosticActions->runMtr($host);
                $parentMenu?->open();
            }
            // If host is empty (cancelled), menu stays open automatically
        });
        $index++;

        // [6] Back
        $this->addBackItem($builder, $index, $parentMenu);

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }

    /**
     * Get default gateway from internet interface
     *
     * @return string|null Gateway IP or null if not found
     */
    private function getDefaultGateway(): ?string
    {
        /** @var LanInterfaces|null $interface */
        $interface = LanInterfaces::findFirst("internet = '1'");
        if ($interface === null) {
            return null;
        }

        return !empty($interface->gateway) ? $interface->gateway : null;
    }

    /**
     * Ask user for custom host/IP address
     *
     * @param CliMenu $menu Current menu
     * @return string Entered host or empty string if cancelled
     */
    private function askCustomHost(CliMenu $menu): string
    {
        $style = $this->styleConfig->getInputStyle();

        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                // Allow any non-empty hostname or IP
                return !empty(trim($input));
            }
        };

        $dialog = $input
            ->setPromptText($this->translation->_('cm_EnterHostnameOrIp'))
            ->setValidationFailedText($this->translation->_('cm_Warning'))
            ->ask();

        return trim($dialog->fetch());
    }
}
