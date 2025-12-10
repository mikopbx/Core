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
use MikoPBX\Core\System\ConsoleMenu\Banners\WelcomeBanner;
use MikoPBX\Core\System\ConsoleMenu\Menus\MainMenu;

/**
 * Console Menu - Main entry point for SSH/console interface
 *
 * This is a lightweight orchestrator that delegates to modular components:
 * - Banners: WelcomeBanner displays system info with auto-refresh
 * - Menus: MainMenu provides hierarchical navigation
 * - Actions: Handlers for specific operations (network, system, diagnostics)
 * - Wizards: Multi-step configuration flows (network setup)
 * - Utilities: Helpers for logging, network info, environment detection
 *
 * Usage:
 * - `console-menu` - Start directly in settings menu (no banner)
 * - `console-menu --banner` - Show banner with auto-refresh, then menu on keypress
 *
 * @see ConsoleMenu/Banners/ - Banner display components
 * @see ConsoleMenu/Menus/ - Menu hierarchy
 * @see ConsoleMenu/Actions/ - Action handlers
 * @see ConsoleMenu/Wizards/ - Configuration wizards
 * @see ConsoleMenu/Utilities/ - Helper utilities
 */
class ConsoleMenu
{
    private bool $showBanner = false;

    /**
     * Parse command line arguments
     *
     * Supported flags:
     * - --banner: Show welcome banner with auto-refresh before menu
     */
    private function parseArguments(): void
    {
        $args = $_SERVER['argv'] ?? [];
        $this->showBanner = in_array('--banner', $args, true);
    }

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
     * 1. Parses command line arguments
     * 2. Validates terminal environment
     * 3. Initializes DI services
     * 4. Sets up Cyrillic font support
     * 5. If --banner flag: displays welcome banner with auto-refresh
     * 6. Shows the main menu
     *
     * @return void
     */
    public function start(): void
    {
        // Parse command line arguments
        $this->parseArguments();

        // Ensure terminal type is recognized
        $this->ensureValidTerminal();

        // Initialize dependency injection services
        RegisterDIServices::init();

        // Set Cyrillic font for proper display
        Util::setCyrillicFont();

        // Display welcome banner (if requested) and start menu
        $this->showWelcomeBannerAndMenu();
    }

    /**
     * Display welcome banner (if requested) and show main menu
     *
     * In banner mode (--banner flag):
     * - Banner refreshes every 60 seconds with system info
     * - Any key press → enters main menu
     * - Ctrl+C → exits to shell
     *
     * In normal mode (no flag):
     * - Goes directly to main menu without banner
     *
     * @return void
     */
    private function showWelcomeBannerAndMenu(): void
    {
        if ($this->showBanner) {
            // Show banner with auto-refresh loop
            $banner = new WelcomeBanner();
            $result = $banner->runWithAutoRefresh();

            // Ctrl+C pressed - exit to shell
            if ($result === null) {
                file_put_contents('/tmp/start_sh', '');
                exit(0);
            }
        }

        // Show the main menu
        $mainMenu = new MainMenu();
        $mainMenu->show();
    }
}
