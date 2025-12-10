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
use MikoPBX\Core\System\ConsoleMenu\Actions\MonitoringActions;
use PhpSchool\CliMenu\CliMenu;

/**
 * Monitoring and diagnostics menu
 *
 * Provides access to:
 * - Log viewer (system, asterisk, php, nginx, fail2ban)
 * - Asterisk diagnostics (sngrep, CLI, channels, endpoints)
 * - File manager (mc)
 */
class MonitoringMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_MonitoringAndDiagnostics');
    }

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool
    {
        return $this->env->canViewLogs() || $this->env->canRunDiagnostics();
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;

        // [1] View logs (not in LiveCD)
        if ($this->env->canViewLogs()) {
            $builder->addItem("[$index] " . $this->translation->_('cm_ViewLogs'), function (CliMenu $menu) {
                $menu->close();
                $logsMenu = new LogsMenu();
                $logsMenu->show($menu);
            });
            $index++;
        }

        // [2] Asterisk diagnostics (not in LiveCD)
        if ($this->env->canRunDiagnostics()) {
            $builder->addItem("[$index] " . $this->translation->_('cm_AsteriskDiagnostics'), function (CliMenu $menu) {
                $menu->close();
                $diagnosticsMenu = new AsteriskDiagnosticsMenu();
                $diagnosticsMenu->show($menu);
            });
            $index++;
        }

        // [3] File manager (mc) - available everywhere
        $builder->addItem("[$index] " . $this->translation->_('cm_FileManager'), function (CliMenu $menu) {
            $menu->close();
            $actions = new DiagnosticActions();
            $actions->runFileManager();
            $menu->open();
        });
        $index++;

        // [4] Back
        $this->addBackItem($builder, $index, $parentMenu);

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }
}
