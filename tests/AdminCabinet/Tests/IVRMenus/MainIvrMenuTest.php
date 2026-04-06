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

namespace MikoPBX\Tests\AdminCabinet\Tests\IVRMenus;

use MikoPBX\Tests\AdminCabinet\Tests\CreateIVRMenuTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\IVRMenuDataFactory;

/**
 * Test class for creating Main IVR menu
 * docker exec -it mikopbx-php83 /bin/sh -c "/offload/rootfs/usr/www/vendor/bin/phpunit --configuration /offload/rootfs/usr/www/tests/AdminCabinet/debug-unit.xml /offload/rootfs/usr/www/tests/AdminCabinet/Tests/IVRMenus/MainIvrMenuTest.php"
 */
class MainIvrMenuTest extends CreateIVRMenuTest
{
    protected function getIVRMenuData(): array
    {
        return IVRMenuDataFactory::getIVRMenuData('main.ivr.menu');
    }

    public function testCreateIVRMenu(): void
    {
        parent::testCreateIVRMenu();
    }
}
