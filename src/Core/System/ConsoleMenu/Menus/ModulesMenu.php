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

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\ConsoleMenu\Actions\ModulesActions;
use PhpSchool\CliMenu\CliMenu;

/**
 * Modules management menu
 *
 * Displays list of installed modules with their status
 * and allows enabling/disabling them
 */
class ModulesMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_ManageModules');
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $modules = PbxExtensionModules::getModulesArray(false);

        if (empty($modules)) {
            $this->showNoModulesMessage($parentMenu);
            return;
        }

        $builder = $this->createMenuBuilder();
        $index = 1;
        $actions = new ModulesActions();

        foreach ($modules as $module) {
            $uniqid = $module['uniqid'];
            $name = $module['name'] ?: $uniqid;
            $isEnabled = $module['disabled'] !== '1';

            // Status indicator: ● (enabled) or ○ (disabled)
            $statusIndicator = $isEnabled ? '●' : '○';
            $statusText = $isEnabled
                ? $this->translation->_('cm_ModuleEnabled')
                : $this->translation->_('cm_ModuleDisabled');

            $label = "[$index] $name $statusIndicator ($statusText)";

            $builder->addItem($label, function (CliMenu $menu) use ($actions, $uniqid, $parentMenu) {
                $menu->close();
                $actions->showModuleDetails($uniqid, $this, $parentMenu);
            });
            $index++;
        }

        // Back item
        $this->addBackItem($builder, $index, $parentMenu);

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }

    /**
     * Show message when no modules are installed
     *
     * @param CliMenu|null $parentMenu Parent menu for navigation
     */
    private function showNoModulesMessage(?CliMenu $parentMenu): void
    {
        echo "\n";
        echo $this->translation->_('cm_NoModulesInstalled');
        echo "\n\n";
        echo $this->translation->_('cm_PressEnterToContinue');
        fgets(STDIN);

        if ($parentMenu !== null) {
            $parentMenu->open();
        }
    }
}
