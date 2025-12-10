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

use MikoPBX\Core\System\ConsoleMenu\Actions\SystemActions;
use PhpSchool\CliMenu\CliMenu;

/**
 * System configuration menu
 *
 * Provides access to:
 * - Storage management
 * - Password reset
 * - Reboot/shutdown
 */
class SystemMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_System');
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;
        $actions = new SystemActions();

        // [1] Storage (Normal mode only)
        if ($this->env->canConfigureStorage()) {
            $storageLabel = $this->translation->_('cm_Storage') . $this->getStorageStatus();
            $builder->addItem("[$index] $storageLabel", function (CliMenu $menu) {
                $menu->close();
                $storageMenu = new StorageMenu();
                $storageMenu->show($menu);
            });
            $index++;
        }

        // [4] Reset password (not in LiveCD)
        if ($this->env->canResetPassword()) {
            $builder->addItem("[$index] " . $this->translation->_('cm_ResetAdminPassword'), function (CliMenu $menu) use ($actions) {
                $actions->resetPassword($menu);
            });
            $index++;
        }

        // [5] Reboot/Shutdown - always available
        $builder->addItem("[$index] " . $this->translation->_('cm_RebootSystem'), function (CliMenu $menu) {
            $menu->close();
            $rebootMenu = new RebootMenu();
            $rebootMenu->show($menu);
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
     * Get storage status indicator
     *
     * @return string Status text with color
     */
    private function getStorageStatus(): string
    {
        if (!$this->env->isLiveCd() && !\MikoPBX\Core\System\Storage::isStorageDiskMounted()) {
            return "    \033[01;31m (" . $this->translation->_('cm_StorageUnmounted') . ") \033[39m";
        }
        return '';
    }
}
