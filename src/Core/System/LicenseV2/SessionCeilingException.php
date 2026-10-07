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
 * The ledger holds as many sessions as it may. This is a protective cap of this PBX and not a
 * refusal of the licensing server, so it carries no error code of its own (those belong to the
 * server) and the REST layer answers 429: the caller is asked to come back, not told it is
 * unlicensed, and the PBX is not at fault either.
 */
class SessionCeilingException extends RuntimeException
{
}
