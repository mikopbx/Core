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
 * Class ActionDial
 * This class is responsible for handling the event of a phone call start.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionDial
{

    /**
     * Handles the event of the start of a phone call.
     *
     * @param WorkerCallEvents $worker Instance of WorkerCallEvents.
     * @param array $data Data related to the event.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, array $data): void
    {
        // Retrieve source channel from the data
        $chan = $data['src_chan'] ?? '';

        // If the source channel is not empty, add it to the active channels
        if (!empty($chan)) {
            $worker->addActiveChan($chan, $data['linkedid']);
        }

        // Insert the data to the database
        InsertDataToDB::execute($data);

        // Execute the end application action
        ActionAppEnd::execute($worker, $data);
    }
}