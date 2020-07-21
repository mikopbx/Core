<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Core\Asterisk;

use MikoPBX\PBXCoreREST\Lib\CdrDBProcessor;
use PHPUnit\Framework\TestCase;

class CdrDbTest extends TestCase
{

    public function testGetActiveChannels()
    {
        $result = CdrDBProcessor::getActiveChannels();
        self::assertIsArray($result);
    }
}
