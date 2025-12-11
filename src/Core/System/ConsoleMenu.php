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

namespace MikoPBX\Core\System;

use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\System\ConsoleMenu\Menus\MainMenu;

/**
 * Console Menu - Main entry point for SSH/console interface
 *
 * This is a lightweight orchestrator that delegates to modular components:
 * - Menus: MainMenu provides hierarchical navigation
 * - Actions: Handlers for specific operations (network, system, diagnostics)
 * - Wizards: Multi-step configuration flows (network setup)
 * - Utilities: Helpers for logging, network info, environment detection
 *
 * Usage:
 * - `/etc/rc/welcome_banner` - Show banner with auto-refresh
 * - `/etc/rc/console_menu` - Start settings menu
 *
 * @see ConsoleMenu/Banners/ - Banner display components
 * @see ConsoleMenu/Menus/ - Menu hierarchy
 * @see ConsoleMenu/Actions/ - Action handlers
 * @see ConsoleMenu/Wizards/ - Configuration wizards
 * @see ConsoleMenu/Utilities/ - Helper utilities
 */
class ConsoleMenu
{
    /**
     * Ensure terminal type is valid, fallback to xterm-256color for unknown terminals.
     * Fixes issue with Ghostty and other modern terminals not recognized by remote system.
     */
    private function ensureValidTerminal(): void
    {
        exec('tput cols 2>&1', $output, $exitCode);

        if ($exitCode !== 0 || empty($output[0]) || (int)$output[0] === 0) {
            putenv('TERM=xterm-256color');
        }
    }

    /**
     * Launch the console menu system
     *
     * Entry point that:
     * 1. Validates terminal environment
     * 2. Initializes DI services
     * 3. Sets up Cyrillic font support
     * 4. Shows the main menu
     *
     * @return void
     */
    public function start(): void
    {
        // Ensure terminal type is recognized
        $this->ensureValidTerminal();

        // Initialize dependency injection services
        RegisterDIServices::init();

        // Set Cyrillic font for proper display
        Util::setCyrillicFont();

        // Show the main menu
        $mainMenu = new MainMenu();
        $mainMenu->show();
    }
}
