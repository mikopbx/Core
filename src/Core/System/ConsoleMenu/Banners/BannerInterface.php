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

namespace MikoPBX\Core\System\ConsoleMenu\Banners;

/**
 * Interface for console banners
 *
 * Banners display system information and status in the console.
 * They support auto-refresh and terminal width adaptation.
 */
interface BannerInterface
{
    /**
     * Render the banner content
     *
     * @return string The formatted banner text with ANSI colors
     */
    public function render(): string;

    /**
     * Get the minimum terminal width required for this banner
     *
     * @return int Minimum width in characters
     */
    public function getMinWidth(): int;

    /**
     * Check if the banner should be displayed
     *
     * Some banners may not be shown in certain environments (Docker, LiveCD)
     *
     * @return bool True if banner should be displayed
     */
    public function shouldDisplay(): bool;
}
