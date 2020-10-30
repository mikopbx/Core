<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 9 2020
 *
 */

namespace MikoPBX\Tests\Core\System\Upgrade;

use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class UpdateDatabaseTest extends AbstractUnitTest
{

    public function testUpdateDatabaseStructure()
    {
        $updater= new UpdateDatabase();
        $updater->updateDatabaseStructure();
        $this->assertTrue(true);
    }
}
