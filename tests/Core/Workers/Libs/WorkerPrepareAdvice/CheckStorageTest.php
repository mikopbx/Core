<?php

namespace MikoPBX\Tests\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckStorage;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class CheckStorageTest extends AbstractUnitTest
{

    public function testProcess()
    {
            $class = new CheckStorage();
            $class->process();
            $this->assertTrue(true);
    }
}
