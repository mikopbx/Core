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

namespace MikoPBX\Core\System\Upgrade\Releases;

use DateTimeImmutable;
use DateTimeZone;
use MikoPBX\Common\Library\OutWorkTimeDate;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use PDO;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer20261012
 *
 * Stores the dates of off-work time rules as 'Y-m-d' calendar days of the PBX timezone.
 *
 * The web interface used to save date_from as 00:00:00 and date_to as 23:59:59 of the
 * browser timezone as unix timestamps, while the dialplan read them in the PBX timezone.
 * A browser west of the PBX extended the period by a day at its end, one east of it by a
 * day at its start, and the edit form hid it by converting back in the browser timezone.
 *
 * The migration restores the day the user picked (OutWorkTimeDate::enteredDay()); other
 * timestamps keep the day they fall on in the PBX timezone.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer20261012 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.10.12';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $db = $this->di->getShared('db');
        $timezone = OutWorkTimeDate::pbxTimezone();

        $records = $db->query(
            "SELECT id, date_from, date_to FROM m_OutWorkTimes WHERE date_from != '' OR date_to != ''"
        )->fetchAll(PDO::FETCH_ASSOC);

        foreach ($records as $record) {
            $updates = [];
            $binds = ['id' => $record['id']];
            foreach (['date_from' => false, 'date_to' => true] as $field => $isEnd) {
                $value = (string)($record[$field] ?? '');
                $date = self::convertDate($value, $isEnd, $timezone);
                if ($date === null) {
                    echo "Off-work time rule {$record['id']}: cannot read $field '$value', left as is\n";
                    continue;
                }
                if ($date === $value) {
                    continue;
                }
                $updates[] = "$field = :$field";
                $binds[$field] = $date;
                $dayInPbxTimezone = self::dayInTimezone($value, $timezone);
                if ($dayInPbxTimezone !== null && $dayInPbxTimezone !== $date) {
                    echo "Off-work time rule {$record['id']}: $field $dayInPbxTimezone -> $date"
                        . " (restored the date entered in a browser of another timezone)\n";
                }
            }
            if (!empty($updates)) {
                $db->execute('UPDATE m_OutWorkTimes SET ' . implode(', ', $updates) . ' WHERE id = :id', $binds);
            }
        }
    }

    /**
     * Converts a stored date_from/date_to value to 'Y-m-d'.
     *
     * @param string $value Stored value: '', 'Y-m-d', unix timestamp or another date string.
     * @param bool $isEnd True for date_to.
     * @param DateTimeZone $timezone The PBX timezone.
     *
     * @return string|null The date, '' for no date, null when the value cannot be read.
     */
    public static function convertDate(string $value, bool $isEnd, DateTimeZone $timezone): ?string
    {
        $value = trim($value);
        if ($value === '' || OutWorkTimeDate::isDate($value)) {
            return $value;
        }
        if (ctype_digit($value)) {
            return OutWorkTimeDate::enteredDay((int)$value, $isEnd, $timezone);
        }
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return null;
        }
        return (new DateTimeImmutable('@' . $timestamp))->setTimezone($timezone)->format(OutWorkTimeDate::FORMAT);
    }

    /**
     * The day a numeric stored value falls on in the PBX timezone, as the dialplan used it.
     *
     * @return string|null Null when the value is not a unix timestamp.
     */
    private static function dayInTimezone(string $value, DateTimeZone $timezone): ?string
    {
        if (!ctype_digit(trim($value))) {
            return null;
        }
        return (new DateTimeImmutable('@' . trim($value)))->setTimezone($timezone)->format(OutWorkTimeDate::FORMAT);
    }
}
