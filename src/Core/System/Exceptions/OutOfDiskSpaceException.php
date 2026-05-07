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

namespace MikoPBX\Core\System\Exceptions;

use RuntimeException;

/**
 * Thrown when an I/O operation cannot complete because the underlying
 * filesystem is out of space (errno=28 ENOSPC) or out of inodes (errno=28
 * ENOSPC reported by some filesystems for inode exhaustion as well).
 *
 * Distinguishes a recoverable, environment-driven failure from a generic
 * RuntimeException so call sites can:
 *   - skip Sentry capture (the error is operational, not a code defect);
 *   - emit a single rate-limited alert via syslog;
 *   - back off rather than restart-loop until disk is freed.
 *
 * Introduced for issue #1051: ENOSPC in Processes::savePidFile() caused
 * 50k+ Sentry events/day from a single host because every worker respawn
 * crashed on the same disk-full condition.
 */
class OutOfDiskSpaceException extends RuntimeException
{
}
