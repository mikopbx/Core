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

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer2026185
 *
 * Sets initial priority values for NetworkFilters.
 * Regular subnets get sequential priorities starting from 1.
 * The 0.0.0.0/0 (Internet) rule gets the highest number (lowest priority)
 * so it appears last in iptables before the final DROP.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer2026185 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.1.85';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $this->setInitialPriorities();
    }

    /**
     * Set initial priority values for existing NetworkFilters records.
     *
     * Assigns sequential priorities to regular subnets,
     * and pushes 0.0.0.0/0 and ::/0 to the end.
     *
     * @return void
     */
    private function setInitialPriorities(): void
    {
        $filters = NetworkFilters::find(['order' => 'id']);
        if ($filters->count() === 0) {
            return;
        }

        $regularFilters = [];
        $catchAllFilters = [];

        foreach ($filters as $filter) {
            // Already has a non-zero priority — skip this record
            if ((int)$filter->priority > 0) {
                continue;
            }

            $permit = trim($filter->permit);
            if ($permit === '0.0.0.0/0' || $permit === '::/0') {
                $catchAllFilters[] = $filter;
            } else {
                $regularFilters[] = $filter;
            }
        }

        $priority = 1;

        // Regular subnets get lower numbers (higher priority)
        foreach ($regularFilters as $filter) {
            $filter->priority = (string)$priority;
            $filter->save();
            $priority++;
        }

        // Catch-all rules (0.0.0.0/0, ::/0) get highest numbers (lowest priority)
        foreach ($catchAllFilters as $filter) {
            $filter->priority = (string)$priority;
            $filter->save();
            $priority++;
        }

        $total = count($regularFilters) + count($catchAllFilters);
        echo "Set initial priorities for {$total} network filters\n";
    }
}
