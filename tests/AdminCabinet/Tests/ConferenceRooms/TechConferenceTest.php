<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Tests\ConferenceRooms;

use MikoPBX\Tests\AdminCabinet\Tests\Data\ConferenceRoomsDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\CreateConferenceRoomsTest;

/**
 * Test class for creating conference room: Tech Team Conference
 */
class TechConferenceTest extends CreateConferenceRoomsTest
{
    /**
     * Get conference room test data
     *
     * @return array
     */
    protected function getConferenceRoomData(): array
    {
        return ConferenceRoomsDataFactory::getConferenceRoomData('tech.conference');
    }
}
