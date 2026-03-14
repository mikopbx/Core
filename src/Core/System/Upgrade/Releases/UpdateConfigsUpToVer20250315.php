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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer20250315
 *
 * Migrates Fail2Ban findtime and bantime from arbitrary seconds values
 * to predefined slider values used by the new UI.
 *
 * Slider values:
 *   findtime: 600, 1800, 3600, 10800 (10m, 30m, 1h, 3h)
 *   bantime:  10800, 43200, 86400, 259200, 604800 (3h, 12h, 24h, 3d, 7d)
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer20250315 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2025.3.15';

    /**
     * Allowed findtime values in seconds
     */
    private const array FIND_TIME_VALUES = [600, 1800, 3600, 10800];

    /**
     * Allowed bantime values in seconds
     */
    private const array BAN_TIME_VALUES = [10800, 43200, 86400, 259200, 604800];

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $this->migrateFail2BanTimers();
    }

    /**
     * Migrate findtime and bantime to nearest allowed slider values
     *
     * @return void
     */
    private function migrateFail2BanTimers(): void
    {
        $db = $this->di->getShared('db');

        $sql = "SELECT id, findtime, bantime FROM m_Fail2BanRules LIMIT 1";
        $result = $db->query($sql);
        $record = $result->fetch(\PDO::FETCH_ASSOC);

        if ($record === false) {
            return;
        }

        $currentFindtime = (int)$record['findtime'];
        $currentBantime = (int)$record['bantime'];

        $newFindtime = self::findNearest($currentFindtime, self::FIND_TIME_VALUES);
        $newBantime = self::findNearest($currentBantime, self::BAN_TIME_VALUES);

        $updates = [];
        $binds = ['id' => $record['id']];

        if ($newFindtime !== $currentFindtime) {
            $updates[] = 'findtime = :findtime';
            $binds['findtime'] = $newFindtime;
            echo "Migrated Fail2Ban findtime: {$currentFindtime}s → {$newFindtime}s\n";
        }

        if ($newBantime !== $currentBantime) {
            $updates[] = 'bantime = :bantime';
            $binds['bantime'] = $newBantime;
            echo "Migrated Fail2Ban bantime: {$currentBantime}s → {$newBantime}s\n";
        }

        if (!empty($updates)) {
            $updateSql = "UPDATE m_Fail2BanRules SET " . implode(', ', $updates) . " WHERE id = :id";
            $db->execute($updateSql, $binds);
        }
    }

    /**
     * Find the nearest allowed value to the given value
     *
     * @param int $value Current value
     * @param array $allowed Array of allowed values (sorted ascending)
     * @return int Nearest allowed value
     */
    private static function findNearest(int $value, array $allowed): int
    {
        $closest = $allowed[0];
        $minDiff = PHP_INT_MAX;

        foreach ($allowed as $candidate) {
            $diff = abs($value - $candidate);
            if ($diff < $minDiff) {
                $minDiff = $diff;
                $closest = $candidate;
            }
        }

        return $closest;
    }
}
