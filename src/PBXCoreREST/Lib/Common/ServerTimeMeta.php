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

namespace MikoPBX\PBXCoreREST\Lib\Common;

use DateTimeImmutable;

/**
 * Server timezone metadata for API responses, read by the web UI through PbxDateTime.setServerMeta()
 * so that times and "today" follow the PBX timezone rather than the browser one.
 */
final class ServerTimeMeta
{
    /**
     * Timezone of the PBX; safe to cache together with the payload.
     *
     * @return array{server_timezone: string, server_timezone_offset: int}
     */
    public static function build(): array
    {
        return [
            'server_timezone' => date_default_timezone_get(),
            'server_timezone_offset' => (new DateTimeImmutable())->getOffset(),
        ];
    }

    /**
     * Timezone plus the current PBX wall-clock time, which does not depend on the browser clock.
     * Not for payloads that are cached: server_now would go stale.
     *
     * @return array{server_timezone: string, server_timezone_offset: int, server_now: string}
     */
    public static function buildWithNow(): array
    {
        $now = new DateTimeImmutable();
        return [
            'server_timezone' => date_default_timezone_get(),
            'server_timezone_offset' => $now->getOffset(),
            'server_now' => $now->format('Y-m-d H:i:s'),
        ];
    }
}
