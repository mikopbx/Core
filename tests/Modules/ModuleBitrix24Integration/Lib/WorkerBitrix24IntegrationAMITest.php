<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleBitrix24Integration\Lib;

use MikoPBX\Tests\Unit\AbstractUnitTest;
use Modules\ModuleBitrix24Integration\Lib\WorkerBitrix24IntegrationAMI;
use PHPUnit\Framework\TestCase;

class WorkerBitrix24IntegrationAMITest extends AbstractUnitTest
{

    public function testCallback()
    {
    }

    public function testStart()
    {
        $worker = new WorkerBitrix24IntegrationAMI();
        $worker->start(['start']);

    }
}
