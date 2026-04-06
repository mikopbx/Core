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

use MikoPBX\Core\System\System;
use PhpSchool\CliMenu\CliMenu;

/**
 * Reboot and shutdown menu
 *
 * Provides options to:
 * - Reboot system
 * - Power off system
 */
class RebootMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_RebootSystem');
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder($this->translation->_('cm_ChooseAction'));
        $index = 1;

        // [1] Reboot
        $builder->addItem("[$index] " . $this->translation->_('cm_Reboot'), function (CliMenu $menu) {
            try {
                $menu->close();
            } catch (\Exception $e) {
                // Ignore
            }

            // Show reboot message to user
            echo "\n\n";
            echo "  " . $this->translation->_('cm_SystemRebooting') . "\n\n  ";

            System::reboot();

            // Wait indefinitely with progress indicator - system will reboot before loop completes
            while (true) {
                echo ".";
                sleep(1);
            }
        });
        $index++;

        // [2] Power off
        $builder->addItem("[$index] " . $this->translation->_('cm_PowerOff'), function (CliMenu $menu) {
            try {
                $menu->close();
            } catch (\Exception $e) {
                // Ignore
            }

            // Show shutdown message to user
            echo "\n\n";
            echo "  " . $this->translation->_('cm_SystemShuttingDown') . "\n\n  ";

            System::shutdown();

            // Wait indefinitely with progress indicator - system will shutdown before loop completes
            while (true) {
                echo ".";
                sleep(1);
            }
        });
        $index++;

        // [3] Cancel
        $this->addCancelItem($builder, $index, $parentMenu);

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }
}
