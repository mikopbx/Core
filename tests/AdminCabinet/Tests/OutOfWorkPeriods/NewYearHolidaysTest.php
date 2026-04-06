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

namespace MikoPBX\Tests\AdminCabinet\Tests\OutOfWorkPeriods;

use MikoPBX\Tests\AdminCabinet\Tests\CreateOutOfWorkPeriodTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\OutOfWorkPeriodsDataFactory;

/**
* Test class for creating New Year Holidays period
*
* Description: New year holidays
* Type: Date Range
* Time: From 1 January, 2020 to 5 January, 2020
* Action: Forward to extension 201
*/
class NewYearHolidaysTest extends CreateOutOfWorkPeriodTest
{
    protected function getPeriodData(): array
    {
        return OutOfWorkPeriodsDataFactory::getPeriodData('new.year.holidays');
    }
}
