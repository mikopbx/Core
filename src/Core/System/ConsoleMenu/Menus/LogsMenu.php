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

use MikoPBX\Core\System\ConsoleMenu\Utilities\LogViewer;
use PhpSchool\CliMenu\CliMenu;

/**
 * Log viewer menu
 *
 * Provides access to view different system logs using vi in read-only mode.
 * All logs: system, asterisk, php, nginx, fail2ban
 */
class LogsMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_ViewLogs') . "\n" .
               "   vi: G=" . $this->translation->_('cm_ViGoEnd') .
               ", :q=" . $this->translation->_('cm_ViExit') .
               ", :e=" . $this->translation->_('cm_ViReload');
    }

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool
    {
        return $this->env->canViewLogs();
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;
        $logViewer = new LogViewer();

        // Log options - all use vi -R
        $logOptions = [
            'system' => $this->translation->_('cm_LogSystem'),
            'asterisk' => $this->translation->_('cm_LogAsterisk'),
            'php' => $this->translation->_('cm_LogPHP'),
            'nginx' => $this->translation->_('cm_LogNginx'),
            'fail2ban' => $this->translation->_('cm_LogFail2ban'),
        ];

        foreach ($logOptions as $logType => $label) {
            $builder->addItem(
                "[$index] $label",
                function (CliMenu $menu) use ($logViewer, $logType) {
                    $menu->close();

                    $success = $logViewer->viewFromEnd($logType);

                    if (!$success) {
                        echo "\n" . $this->translation->_('cm_LogFileNotFound') . "\n";
                        echo $this->translation->_('cm_PressEnterToContinue') . "\n";
                        fgets(STDIN);
                    }

                    echo "\033[2J\033[H";
                    $menu->open();
                }
            );
            $index++;
        }

        // Back
        $this->addBackItem($builder, $index, $parentMenu);

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }
}
