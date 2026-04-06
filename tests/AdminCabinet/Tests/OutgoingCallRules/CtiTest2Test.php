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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\OutgoingCallRules;

use MikoPBX\Tests\AdminCabinet\Tests\CreateOutgoingCallRuleTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\OutgoingCallRulesDataFactory;

/**
 * Test class for creating Outgoing calls for CTI tests 2
 * 
 * Rule Type: Test
 * Name: Outgoing calls for CTI tests 2
 * Pattern: (7|8)
 * Provider: Provider for CTI tests
 * Description: Complex CTI test rule with IVR logic
 * 
 * Number Handling:
 * - Rest Numbers: 10
 * - Trim From Begin: 0
 * - Prepend: None
 */
class CtiTest2Test extends CreateOutgoingCallRuleTest
{
    protected function getRuleData(): array
    {
        return OutgoingCallRulesDataFactory::getRuleData('cti.test.2');
    }

    public function testCreateOutgoingCallRule(): void
    {   
        parent::testCreateOutgoingCallRule();
    }
}