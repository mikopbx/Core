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

namespace MikoPBX\PBXCoreREST\Lib\Cdr;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

/**
 * Period bounds of CDR filters (dateFrom / dateTo).
 *
 * cdr_general.start is the PBX wall-clock time as a string, 'Y-m-d H:i:s.v' or 'Y-m-d H:i:s',
 * without a timezone, and is compared as a string. A filter value is read as the same wall-clock
 * time; a value with a timezone or offset cannot be mapped onto it and is rejected.
 *
 * dateFrom gives the first moment included, dateTo the last day, second or millisecond included;
 * the query uses "start >= lower AND start < upper", so a call at 23:59:59.977 of the last day
 * is included whatever the precision of the stored value.
 */
final class CdrDateRange
{
    /**
     * Accepted formats with the length of the period each value covers.
     */
    private const array FORMATS = [
        'Y-m-d' => '+1 day',
        'Y-m-d H:i:s' => '+1 second',
        'Y-m-d\TH:i:s' => '+1 second',
        'Y-m-d H:i:s.v' => '+1 msec',
        'Y-m-d\TH:i:s.v' => '+1 msec',
    ];

    /**
     * Reads a dateFrom/dateTo request parameter.
     *
     * @param mixed $value Raw parameter.
     * @return string|null The trimmed value, null when absent, empty or not a string (no bound).
     */
    public static function readParameter(mixed $value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        return trim($value);
    }

    /**
     * First moment a dateFrom value includes.
     *
     * @throws InvalidArgumentException When the value is not a supported date/time.
     */
    public static function start(string $value): DateTimeImmutable
    {
        return self::parse($value)[0];
    }

    /**
     * First moment after the period a dateTo value includes.
     *
     * @throws InvalidArgumentException When the value is not a supported date/time.
     */
    public static function endExclusive(string $value): DateTimeImmutable
    {
        [$moment, $period] = self::parse($value);
        return $moment->modify($period);
    }

    /**
     * Bound for comparison with cdr_general.start.
     *
     * Whole seconds are written without milliseconds: '... 00:00:00' sorts before both
     * '... 00:00:00' and '... 00:00:00.000' as stored, while '... 00:00:00.000' would sort
     * after the former.
     */
    public static function toSql(DateTimeImmutable $moment): string
    {
        return $moment->format('v') === '000' ? $moment->format('Y-m-d H:i:s') : $moment->format('Y-m-d H:i:s.v');
    }

    /**
     * Number of whole days a filter covers, for the range limit.
     */
    public static function days(DateTimeImmutable $start, DateTimeImmutable $endExclusive): int
    {
        return (int)$start->diff($endExclusive->modify('-1 msec'))->days;
    }

    /**
     * @return array{DateTimeImmutable, string} The moment and the period it covers.
     * @throws InvalidArgumentException
     */
    private static function parse(string $value): array
    {
        $value = trim($value);
        // Wall-clock arithmetic: UTC has no daylight-saving gaps that would move the hour.
        $utc = new DateTimeZone('UTC');
        foreach (self::FORMATS as $format => $period) {
            $moment = DateTimeImmutable::createFromFormat('!' . $format, $value, $utc);
            if ($moment !== false && $moment->format($format) === $value) {
                return [$moment, $period];
            }
        }
        throw new InvalidArgumentException(
            'Invalid date format. Expected YYYY-MM-DD, YYYY-MM-DD HH:MM:SS or YYYY-MM-DDTHH:MM:SS '
            . 'in PBX local time without a timezone'
        );
    }
}
