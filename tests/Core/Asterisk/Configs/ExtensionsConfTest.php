<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use PHPUnit\Framework\TestCase;

class ExtensionsConfTest extends TestCase
{

    public function testGenerateIncomingContextPeers()
    {
        $conf = ExtensionsConf::generateIncomingContextPeers('none', '', '');
        $this->assertStringContainsStringIgnoringCase('add-trim-prefix-clid', $conf);
    }
}
