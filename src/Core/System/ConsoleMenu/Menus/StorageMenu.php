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
 * Storage configuration menu
 *
 * Provides access to:
 * - Connect storage disk
 * - Check storage (fsck)
 * - Resize storage partition
 */
class StorageMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_Storage');
    }

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool
    {
        return $this->env->canConfigureStorage();
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;
        $actions = new SystemActions();

        // [1] Connect storage
        $builder->addItem("[$index] " . $this->translation->_('cm_ConnectStorage'), function (CliMenu $menu) use ($actions) {
            $actions->connectStorage($menu);
        });
        $index++;

        // [2] Check storage
        $builder->addItem("[$index] " . $this->translation->_('cm_CheckStorage'), function (CliMenu $menu) use ($actions) {
            $actions->checkStorage($menu);
        });
        $index++;

        // [3] Resize storage
        $builder->addItem("[$index] " . $this->translation->_('cm_ResizeStorage'), function (CliMenu $menu) use ($actions) {
            $actions->resizeStorage($menu);
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
