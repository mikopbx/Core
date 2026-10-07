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
 * The installation key pair does not exist yet and this user may not create it: the web server
 * user on a fresh PBX, before the first root worker runs. The one failure of LicenseV2 the service
 * provider answers with the legacy License; every other one (a corrupted key, a broken state
 * directory) is a fault and must not pass as "v2 is running".
 */
class KeyPairNotReadyException extends RuntimeException
{
}
