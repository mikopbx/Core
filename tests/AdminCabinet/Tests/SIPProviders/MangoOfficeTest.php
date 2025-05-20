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

namespace MikoPBX\Tests\AdminCabinet\Tests\SIPProviders;

use MikoPBX\Tests\AdminCabinet\Tests\CreateSIPProviderTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\SIPProviderDataFactory;

/**
 * Test class for creating Mango office SIP provider
 */
class MangoOfficeTest extends CreateSIPProviderTest
{
    protected function getSIPProviderData(): array
    {
        return SIPProviderDataFactory::getSIPProviderData('mango.office');
    }
    
    public function testCreateSIPProvider(): void
    {
        parent::testCreateSIPProvider();
    }
}