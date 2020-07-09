<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModulePhoneBook\Lib;

use Modules\ModulePhoneBook\Lib\PhoneBookConf;
use PHPUnit\Framework\TestCase;

class PhoneBookConfTest extends TestCase
{

    public function testGenerateIncomingRoutBeforeDial()
    {
        $appClass = new PhoneBookConf();
        $result = $appClass->generateIncomingRoutBeforeDial('X!');
        $this->assertStringContainsString('agi-bin/agi_phone_book.php', $result);

    }

}
