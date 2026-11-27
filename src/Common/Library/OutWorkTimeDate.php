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

namespace MikoPBX\Common\Library;

use DateTimeImmutable;
use DateTimeZone;
use MikoPBX\Common\Models\PbxSettings;
use Throwable;

/**
 * Calendar dates of off-work time rules (m_OutWorkTimes.date_from / date_to).
 *
 * A date is stored as 'Y-m-d' and means a calendar day in the PBX timezone:
 * date_from covers the day from 00:00:00, date_to up to 23:59:59. Storing a
 * unix timestamp instead tied the day to the timezone of the browser that
 * saved the rule and to the PBX timezone at that moment, so the period moved
 * by a day when either differed.
 */
final class OutWorkTimeDate
{
    public const string FORMAT = 'Y-m-d';

    /**
     * Timezone the stored dates are interpreted in.
     */
    public static function pbxTimezone(): DateTimeZone
    {
        try {
            return new DateTimeZone(PbxSettings::getValueByKey(PbxSettings::PBX_TIMEZONE));
        } catch (Throwable) {
            return new DateTimeZone(date_default_timezone_get());
        }
    }

    /**
     * Whether the value is a real calendar date in 'Y-m-d' form.
     */
    public static function isDate(string $value): bool
    {
        $date = DateTimeImmutable::createFromFormat('!' . self::FORMAT, $value);
        return $date !== false && $date->format(self::FORMAT) === $value;
    }

    /**
     * Brings a value to the stored form.
     *
     * Accepts '' (no date), 'Y-m-d', or a unix timestamp of the former storage format,
     * which becomes the day it was entered for (see enteredDay()).
     *
     * @param string $value Date value.
     * @param DateTimeZone $timezone The PBX timezone.
     * @param bool $isEnd True for date_to.
     *
     * @return string|null The 'Y-m-d' date or '', null when the value is not a date.
     */
    public static function normalize(string $value, DateTimeZone $timezone, bool $isEnd = false): ?string
    {
        $value = trim($value);
        if ($value === '' || self::isDate($value)) {
            return $value;
        }
        if (ctype_digit($value)) {
            return self::enteredDay((int)$value, $isEnd, $timezone);
        }
        return null;
    }

    /**
     * Restores the calendar day a timestamp of the former storage format was entered for.
     *
     * The web form saved the start as 00:00:00 and the end as 23:59:59 of the browser
     * timezone: a boundary of the picked day shifted by the difference between the PBX and
     * the browser offsets. Browser offsets lie within UTC-12..UTC+14 and are whole quarters
     * of an hour, so such a boundary is a PBX time of HH:MM:00 (end: HH:MM:59) and lies
     * between 14 hours before and 12 hours after a PBX midnight shifted by the PBX offset.
     * A start-style value in date_to marks the start of the day (the 2025.1.15 migration
     * stored 'Y-m-d' strings as midnight). Any other timestamp keeps the day it falls on
     * in the PBX timezone.
     *
     * @param int $timestamp Unix timestamp.
     * @param bool $isEnd True for date_to.
     * @param DateTimeZone $timezone The PBX timezone.
     *
     * @return string The 'Y-m-d' date.
     */
    public static function enteredDay(int $timestamp, bool $isEnd, DateTimeZone $timezone): string
    {
        $moment = (new DateTimeImmutable('@' . $timestamp))->setTimezone($timezone);
        $minute = (int)$moment->format('i');
        $second = (int)$moment->format('s');

        if ($second === 0 && $minute % 15 === 0) {
            $midnight = self::pickedMidnight($moment);
            if ($midnight !== null) {
                return $midnight->format(self::FORMAT);
            }
        } elseif ($isEnd && $second === 59 && $minute % 15 === 14) {
            $midnight = self::pickedMidnight($moment->modify('+1 second'));
            if ($midnight !== null) {
                return $midnight->modify('-1 day')->format(self::FORMAT);
            }
        }
        return $moment->format(self::FORMAT);
    }

    /**
     * PBX midnight a browser midnight stands for.
     *
     * The boundary is the PBX midnight plus (PBX offset - browser offset), and browser offsets
     * lie within UTC-12..UTC+14. That window is 26 hours wide, so a browser at +12..+14 cannot
     * be told from one 24 hours behind (-12..-10). The populated side is taken: offsets from
     * -10:00 to +13:45 (Hawaii rather than Kiritimati, New Zealand and Tonga rather than
     * the Pacific west of Hawaii).
     *
     * @param DateTimeImmutable $boundary Browser midnight in the PBX timezone.
     *
     * @return DateTimeImmutable|null Null when no midnight fits.
     */
    private static function pickedMidnight(DateTimeImmutable $boundary): ?DateTimeImmutable
    {
        $pbxOffset = $boundary->getOffset();
        $sameDay = $boundary->setTime(0, 0);
        $fallback = null;
        foreach ([$sameDay->modify('-1 day'), $sameDay, $sameDay->modify('+1 day')] as $midnight) {
            $browserOffset = $pbxOffset - ($boundary->getTimestamp() - $midnight->getTimestamp());
            if ($browserOffset >= -10 * 3600 && $browserOffset <= 13 * 3600 + 45 * 60) {
                return $midnight;
            }
            if ($browserOffset >= -12 * 3600 && $browserOffset <= 14 * 3600) {
                $fallback = $midnight;
            }
        }
        return $fallback;
    }

    /**
     * 00:00:00 of the stored date in $timezone.
     *
     * @return DateTimeImmutable|null Null when the value is not a 'Y-m-d' date.
     */
    public static function dayStart(string $date, DateTimeZone $timezone): ?DateTimeImmutable
    {
        if (!self::isDate($date)) {
            return null;
        }
        $start = DateTimeImmutable::createFromFormat('!' . self::FORMAT, $date, $timezone);
        return $start === false ? null : $start;
    }

    /**
     * 23:59:59 of the stored date in $timezone.
     *
     * @return DateTimeImmutable|null Null when the value is not a 'Y-m-d' date.
     */
    public static function dayEnd(string $date, DateTimeZone $timezone): ?DateTimeImmutable
    {
        return self::dayStart($date, $timezone)?->setTime(23, 59, 59);
    }

    /**
     * Formats a stored date for display, e.g. 'd.m.Y'.
     *
     * @return string The formatted date, or the value as is when it is not a 'Y-m-d' date.
     */
    public static function format(string $date, string $format): string
    {
        $day = DateTimeImmutable::createFromFormat('!' . self::FORMAT, $date);
        return ($day === false || !self::isDate($date)) ? $date : $day->format($format);
    }
}
