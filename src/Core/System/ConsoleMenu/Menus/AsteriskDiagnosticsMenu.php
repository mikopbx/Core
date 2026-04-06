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

use MikoPBX\Core\System\ConsoleMenu\Actions\DiagnosticActions;
use PhpSchool\CliMenu\CliMenu;

/**
 * Asterisk diagnostics menu
 *
 * Provides access to:
 * - Sngrep (SIP packet capture)
 * - Active channels display
 * - PJSIP endpoints display
 * - PJSIP registrations (providers)
 */
class AsteriskDiagnosticsMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_AsteriskDiagnostics');
    }

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool
    {
        return $this->env->canRunDiagnostics();
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;
        $actions = new DiagnosticActions();

        // [1] Sngrep (SIP packet capture)
        $builder->addItem("[$index] " . $this->translation->_('cm_Sngrep'), function (CliMenu $menu) use ($actions) {
            $menu->close();
            $actions->runSngrep();
            $menu->open();
        });
        $index++;

        // [2] Active channels
        $builder->addItem("[$index] " . $this->translation->_('cm_ActiveChannels'), function (CliMenu $menu) use ($actions) {
            $menu->close();
            $actions->showActiveChannels();
            echo "\033[2J\033[H";
            $menu->open();
        });
        $index++;

        // [3] PJSIP endpoints
        $builder->addItem("[$index] " . $this->translation->_('cm_PjsipEndpoints'), function (CliMenu $menu) use ($actions) {
            $menu->close();
            $actions->showPjsipEndpoints();
            echo "\033[2J\033[H";
            $menu->open();
        });
        $index++;

        // [4] PJSIP registrations (providers)
        $builder->addItem("[$index] " . $this->translation->_('cm_PjsipRegistrations'), function (CliMenu $menu) use ($actions) {
            $menu->close();
            $actions->showPjsipRegistrations();
            echo "\033[2J\033[H";
            $menu->open();
        });
        $index++;

        // [5] Back
        $this->addBackItem($builder, $index, $parentMenu);

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }
}
