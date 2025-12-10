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
use MikoPBX\Core\System\ConsoleMenu\Banners\WelcomeBanner;
use MikoPBX\Core\System\PBXInstaller;
use MikoPBX\Core\System\PBXRecovery;
use PhpSchool\CliMenu\CliMenu;

/**
 * Main menu with ESXi-style layout
 *
 * This is the first-level menu shown after the banner.
 * Directly provides access to all major sections:
 * - Network and Connection
 * - Monitoring and Diagnostics
 * - System
 * - Installation (LiveCD only)
 * - Console (exit to shell)
 */
class MainMenu extends AbstractMenu
{
    private WelcomeBanner $banner;

    public function __construct()
    {
        parent::__construct();
        $this->banner = new WelcomeBanner();
    }

    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->banner->renderCompact();
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;

        // Add separator line
        $titleWidth = $this->styleConfig->getMenuWidth();
        $separator = '-';
        $title = str_repeat($separator, 2) . '  ' . $this->translation->_('cm_PbxConsoleSetup') . '  ';
        $titleSeparator = mb_substr($title . str_repeat($separator, $titleWidth - mb_strlen($title)), 0, $titleWidth);
        $builder->setTitleSeparator($titleSeparator);

        // Empty line for spacing
        $builder->addItem(' ', static function (CliMenu $menu) {
        });

        // [1] Change language - always available at the top
        $builder->addItem("[$index] " . $this->translation->_('cm_ChangeLanguage'), function (CliMenu $menu) {
            $menu->close();
            $actions = new SystemActions();
            $actions->setupLanguage();
        });
        $index++;

        // [2] Network and Connection (if available)
        if ($this->env->canConfigureNetwork() || $this->env->isDocker()) {
            $networkMenu = new NetworkMenu();
            $builder->addItem("[$index] " . $networkMenu->getTitle(), function (CliMenu $menu) {
                $menu->close();
                $networkMenu = new NetworkMenu();
                $networkMenu->show($menu);
            });
            $index++;
        }

        // [2] Monitoring and Diagnostics (if available)
        if ($this->env->canViewLogs() || $this->env->canRunDiagnostics()) {
            $monitoringMenu = new MonitoringMenu();
            $builder->addItem("[$index] " . $monitoringMenu->getTitle(), function (CliMenu $menu) {
                $menu->close();
                $monitoringMenu = new MonitoringMenu();
                $monitoringMenu->show($menu);
            });
            $index++;
        }

        // [3] System
        $systemMenu = new SystemMenu();
        $builder->addItem("[$index] " . $systemMenu->getTitle(), function (CliMenu $menu) {
            $menu->close();
            $systemMenu = new SystemMenu();
            $systemMenu->show($menu);
        });
        $index++;

        // [4] Installation (LiveCD only)
        if ($this->env->canInstall()) {
            $installLabel = $this->env->hasRecoveryConfig()
                ? $this->translation->_('cm_InstallOrRecover')
                : $this->translation->_('cm_InstallOnHardDrive');

            $builder->addItem("[$index] $installLabel", function (CliMenu $menu) {
                $this->runInstallation($menu);
            });
            $index++;
        }

        // [N] Back to status screen (banner with auto-refresh)
        $builder->addItem("[$index] " . $this->translation->_('cm_BackToBanner'), function (CliMenu $menu) {
            $menu->close();
            $key = $this->banner->runWithAutoRefresh();
            // If user pressed a key (not Ctrl+C), return to menu
            if ($key !== null) {
                $this->show();
            } else {
                // Ctrl+C - exit to shell
                echo "\e[?25h";
                file_put_contents('/tmp/start_sh', '');
                exit(0);
            }
        });
        $index++;

        // [N] Console (exit to shell)
        $builder->addItem("[$index] " . $this->translation->_('cm_Console'), function (CliMenu $menu) {
            echo "\e[?25h"; // Enable cursor
            $menu->close();
            file_put_contents('/tmp/start_sh', '');
            exit(0);
        });

        $menu = $builder->build();

        if ($menu->getTerminal()->isInteractive()) {
            echo str_repeat(PHP_EOL, $menu->getTerminal()->getHeight());
            try {
                $menu->open();
            } catch (\Throwable $e) {
                // Log error and continue
            }
        }
    }

    /**
     * Run installation or recovery
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    private function runInstallation(CliMenu $menu): void
    {
        echo "\e[?25h"; // Enable cursor
        $menu->close();
        file_put_contents('/tmp/ejectcd', '');

        if ($this->env->hasRecoveryConfig()) {
            $recovery = new PBXRecovery();
            $recovery->run();
        } else {
            $installer = new PBXInstaller();
            $installer->run();
        }
        exit(0);
    }
}
