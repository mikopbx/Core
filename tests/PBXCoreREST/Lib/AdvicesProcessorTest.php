<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 9 2020
 *
 */

namespace MikoPBX\Tests\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\AdvicesProcessor;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class AdvicesProcessorTest extends AbstractUnitTest
{

    public function testAdvicesCallBack()
    {
        $res = AdvicesProcessor::advicesCallBack(['action'=>'getList']);
        $this->assertTrue($res->success);

    }
}
