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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\CallQueues;

use MikoPBX\Tests\AdminCabinet\Tests\CreateCallQueueTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\CallQueueDataFactory;

/**
 * Test class for creating Sales department Call Queue
 * docker exec -it mikopbx-php83 /bin/sh -c "/offload/rootfs/usr/www/vendor/bin/phpunit --configuration /offload/rootfs/usr/www/tests/AdminCabinet/debug-unit.xml /offload/rootfs/usr/www/tests/AdminCabinet/Tests/CallQueues/SalesDepartmentTest.php"
 */
class SalesDepartmentTest extends CreateCallQueueTest
{
    protected function getCallQueueData(): array
    {
        return CallQueueDataFactory::getCallQueueData('sales.department');
    }

    public function testCreateCallQueue(): void
    {
        parent::testCreateCallQueue();
    }
}
