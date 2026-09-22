<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\LicenseV2;

use RuntimeException;

/**
 * Session or seat error with the licensing server's error code, so the PBX translations keep working.
 */
class SeatException extends RuntimeException
{
    public const int NO_SESSION = 1021;
    public const int NO_SEATS = 1051;
    public const int NOT_LICENSED = 2011;

    public function __construct(string $message, public readonly int $extcode)
    {
        parent::__construct("$message ($extcode)", $extcode);
    }
}
