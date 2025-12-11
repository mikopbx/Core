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

namespace MikoPBX\Core\System\ConsoleMenu\Actions;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\ConsoleMenu\Menus\ModulesMenu;
use MikoPBX\Core\System\ConsoleMenu\Utilities\MenuStyleConfig;
use MikoPBX\Modules\PbxExtensionState;
use Phalcon\Di\Di;
use Phalcon\Translate\Adapter\NativeArray;
use PhpSchool\CliMenu\Builder\CliMenuBuilder;
use PhpSchool\CliMenu\CliMenu;

/**
 * Module management actions for console menu
 *
 * Handles:
 * - Displaying module details
 * - Enabling modules
 * - Disabling modules
 */
class ModulesActions
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
     * Show module details and toggle options
     *
     * @param string $moduleUniqId Module unique ID
     * @param ModulesMenu $modulesMenu Parent modules menu
     * @param CliMenu|null $parentMenu Parent menu for navigation
     */
    public function showModuleDetails(string $moduleUniqId, ModulesMenu $modulesMenu, ?CliMenu $parentMenu = null): void
    {
        $module = PbxExtensionModules::findFirstByUniqid($moduleUniqId);
        if ($module === null) {
            echo "\n" . $this->translation->_('cm_ModuleNotFound') . "\n";
            echo $this->translation->_('cm_PressEnterToContinue');
            fgets(STDIN);
            $modulesMenu->show($parentMenu);
            return;
        }

        $name = $module->name ?: $moduleUniqId;
        $isEnabled = $module->disabled !== '1';

        // Build title with module info
        $statusText = $isEnabled
            ? $this->translation->_('cm_ModuleEnabled')
            : $this->translation->_('cm_ModuleDisabled');

        $title = "=== $name ===\n";
        $title .= $this->translation->_('cm_ModuleStatus') . ": $statusText";

        // Show disable reason if exists
        if (!$isEnabled && !empty($module->disableReasonText)) {
            $title .= "\n" . $this->translation->_('cm_DisableReason') . ": " . $module->disableReasonText;
        }

        $builder = new CliMenuBuilder();
        $builder->setTitle($title);
        $this->styleConfig->applySubmenuStyle($builder);

        $index = 1;

        if ($isEnabled) {
            // Show disable option
            $builder->addItem(
                "[$index] " . $this->translation->_('cm_DisableModule'),
                function (CliMenu $menu) use ($moduleUniqId, $modulesMenu, $parentMenu) {
                    $menu->close();
                    $this->disableModule($moduleUniqId, $modulesMenu, $parentMenu);
                }
            );
        } else {
            // Show enable option
            $builder->addItem(
                "[$index] " . $this->translation->_('cm_EnableModule'),
                function (CliMenu $menu) use ($moduleUniqId, $modulesMenu, $parentMenu) {
                    $menu->close();
                    $this->enableModule($moduleUniqId, $modulesMenu, $parentMenu);
                }
            );
        }
        $index++;

        // Back to modules list
        $builder->addItem(
            "[$index] " . $this->translation->_('cm_GoBack'),
            function (CliMenu $menu) use ($modulesMenu, $parentMenu) {
                $menu->close();
                $modulesMenu->show($parentMenu);
            }
        );

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }

    /**
     * Enable a module
     *
     * @param string $moduleUniqId Module unique ID
     * @param ModulesMenu $modulesMenu Parent modules menu
     * @param CliMenu|null $parentMenu Parent menu for navigation
     */
    private function enableModule(string $moduleUniqId, ModulesMenu $modulesMenu, ?CliMenu $parentMenu): void
    {
        echo "\n";
        echo MenuStyleConfig::colorize(
            $this->translation->_('cm_EnablingModule') . "...",
            MenuStyleConfig::COLOR_YELLOW
        );
        echo "\n\n";

        $moduleState = new PbxExtensionState($moduleUniqId);
        $result = $moduleState->enableModule();

        if ($result) {
            // Recreate modules provider to apply changes
            PBXConfModulesProvider::recreateModulesProvider();

            echo MenuStyleConfig::colorize(
                $this->translation->_('cm_ModuleEnabledSuccess'),
                MenuStyleConfig::COLOR_GREEN
            );
        } else {
            echo MenuStyleConfig::colorize(
                $this->translation->_('cm_ModuleEnableFailed'),
                MenuStyleConfig::COLOR_RED
            );

            $messages = $moduleState->getMessages();
            if (!empty($messages)) {
                echo "\n\n";
                $this->printMessages($messages);
            }
        }

        echo "\n\n";
        echo $this->translation->_('cm_PressEnterToContinue');
        fgets(STDIN);

        $modulesMenu->show($parentMenu);
    }

    /**
     * Disable a module
     *
     * @param string $moduleUniqId Module unique ID
     * @param ModulesMenu $modulesMenu Parent modules menu
     * @param CliMenu|null $parentMenu Parent menu for navigation
     */
    private function disableModule(string $moduleUniqId, ModulesMenu $modulesMenu, ?CliMenu $parentMenu): void
    {
        echo "\n";
        echo MenuStyleConfig::colorize(
            $this->translation->_('cm_DisablingModule') . "...",
            MenuStyleConfig::COLOR_YELLOW
        );
        echo "\n\n";

        $moduleState = new PbxExtensionState($moduleUniqId);
        $result = $moduleState->disableModule(
            PbxExtensionState::DISABLED_BY_USER,
            'Disabled via console menu'
        );

        if ($result) {
            // Recreate modules provider to apply changes
            PBXConfModulesProvider::recreateModulesProvider();

            echo MenuStyleConfig::colorize(
                $this->translation->_('cm_ModuleDisabledSuccess'),
                MenuStyleConfig::COLOR_GREEN
            );
        } else {
            echo MenuStyleConfig::colorize(
                $this->translation->_('cm_ModuleDisableFailed'),
                MenuStyleConfig::COLOR_RED
            );

            $messages = $moduleState->getMessages();
            if (!empty($messages)) {
                echo "\n\n";
                $this->printMessages($messages);
            }
        }

        echo "\n\n";
        echo $this->translation->_('cm_PressEnterToContinue');
        fgets(STDIN);

        $modulesMenu->show($parentMenu);
    }

    /**
     * Print error/info messages
     *
     * @param array $messages Messages array (can be nested)
     * @param int $indent Indentation level
     */
    private function printMessages(array $messages, int $indent = 0): void
    {
        $prefix = str_repeat('  ', $indent);
        foreach ($messages as $key => $message) {
            if (is_array($message)) {
                if (!is_numeric($key)) {
                    echo "$prefix$key:\n";
                }
                $this->printMessages($message, $indent + 1);
            } else {
                echo "$prefix- $message\n";
            }
        }
    }
}
