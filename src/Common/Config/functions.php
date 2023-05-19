<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\Common\Config;

use function function_exists;

if (true !== function_exists('MikoPBX\Common\Config\appPath')) {

    /**
     * Get the application path.
     *
     * @param string $path The optional path to append to the application path.
     * @return string The complete application path.
     */
    function appPath(string $path = ''): string
    {
        return dirname(__DIR__,3) . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}
