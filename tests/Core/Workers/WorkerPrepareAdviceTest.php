<?php

namespace MikoPBX\Tests\Core\Workers;

use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerPrepareAdviceTest extends AbstractUnitTest
{

    public function testStart()
    {
        $worker = new WorkerPrepareAdvice();
        $worker->start(['start']);
        $this->assertTrue(true);
    }
}
