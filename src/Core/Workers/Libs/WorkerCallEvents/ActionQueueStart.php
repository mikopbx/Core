<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionQueueStart
 * Handles the event of starting a queue.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionQueueStart
{

    /**
     * Executes the action for the queue start event.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        if ($data['transfer'] === '1') {
            // If it's a transfer, perform a search for related data.
            ActionTransferCheck::execute($worker, $data);
        }
        if (isset($data['start'])) {
            // It's a new row.
            InsertDataToDB::execute($data);
        } else {
            // Only data update is required.
            UpdateDataInDB::execute($data);
        }
        ActionAppEnd::execute($worker, $data);
    }
}