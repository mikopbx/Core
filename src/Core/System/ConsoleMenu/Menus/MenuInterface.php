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

use PhpSchool\CliMenu\CliMenu;

/**
 * Interface for console menus
 *
 * Menus provide navigation and action selection in the console interface.
 * They support environment-specific item visibility (Docker/LiveCD/Normal).
 */
interface MenuInterface
{
    /**
     * Build and display the menu
     *
     * @param CliMenu|null $parentMenu Optional parent menu for navigation
     * @return void
     */
    public function show(?CliMenu $parentMenu = null): void;

    /**
     * Get menu title for display
     *
     * @return string The localized menu title
     */
    public function getTitle(): string;

    /**
     * Check if this menu should be available in current environment
     *
     * @return bool True if menu should be shown
     */
    public function isAvailable(): bool;
}
