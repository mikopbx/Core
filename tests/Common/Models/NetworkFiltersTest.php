<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\Common\Models;

require_once 'Globals.php';

use MikoPBX\Common\Models\NetworkFilters;
use PHPUnit\Framework\TestCase;

/**
 * Test NetworkFilters model IPv6 CIDR validation
 */
class NetworkFiltersTest extends TestCase
{
    /**
     * Test valid IPv4 CIDR passes validation
     */
    public function testValidateIPv4CIDR(): void
    {
        $filter = new NetworkFilters();
        $filter->permit = '192.168.1.0/24';
        $filter->description = 'Test IPv4 network';

        $this->assertTrue($filter->save(), 'Valid IPv4 CIDR should pass validation');

        // Cleanup
        if ($filter->id) {
            $filter->delete();
        }
    }

    /**
     * Test valid IPv6 CIDR passes validation
     */
    public function testValidateIPv6CIDR(): void
    {
        $filter = new NetworkFilters();
        $filter->permit = '2001:db8::/64';
        $filter->description = 'Test IPv6 network';

        $this->assertTrue($filter->save(), 'Valid IPv6 CIDR should pass validation');

        // Cleanup
        if ($filter->id) {
            $filter->delete();
        }
    }

    /**
     * Test invalid IPv6 CIDR is rejected
     */
    public function testRejectInvalidIPv6CIDR(): void
    {
        $filter = new NetworkFilters();
        $filter->permit = '2001:db8::gggg/64'; // Invalid hex in IPv6
        $filter->description = 'Test invalid IPv6';

        $this->assertFalse($filter->save(), 'Invalid IPv6 CIDR should be rejected');

        $messages = $filter->getMessages();
        $this->assertNotEmpty($messages, 'Should have validation error messages');
    }

    /**
     * Test various IPv6 CIDR formats
     */
    public function testIPv6CIDRFormats(): void
    {
        $testCases = [
            // Valid cases
            '2001:db8::/32' => true,
            '2001:db8::/48' => true,
            '2001:db8::/64' => true,
            '2001:db8::/128' => true,
            'fe80::/10' => true,
            '::1/128' => true,
            '::/0' => true,

            // Invalid cases
            'not-an-ip/64' => false,
            '192.168.1.0/24' => true, // IPv4 should still work
            '2001:db8::/129' => false, // Prefix too large
            '2001:db8::' => false, // Missing prefix
        ];

        foreach ($testCases as $cidr => $shouldPass) {
            $filter = new NetworkFilters();
            $filter->permit = $cidr;
            $filter->description = "Test case: $cidr";

            $result = $filter->save();

            if ($shouldPass) {
                $this->assertTrue($result, "CIDR '$cidr' should pass validation");
                // Cleanup
                if ($filter->id) {
                    $filter->delete();
                }
            } else {
                $this->assertFalse($result, "CIDR '$cidr' should fail validation");
            }
        }
    }

    /**
     * Test deny field validation works same as permit
     */
    public function testDenyFieldValidation(): void
    {
        $filter = new NetworkFilters();
        $filter->deny = '2001:db8:bad::/48';
        $filter->description = 'Test IPv6 deny rule';

        $this->assertTrue($filter->save(), 'Valid IPv6 CIDR in deny field should pass');

        // Cleanup
        if ($filter->id) {
            $filter->delete();
        }

        // Test invalid
        $filter2 = new NetworkFilters();
        $filter2->deny = 'invalid-ipv6/64';
        $filter2->description = 'Test invalid IPv6 deny rule';
        $this->assertFalse($filter2->save(), 'Invalid IPv6 CIDR in deny field should fail');
    }

    /**
     * Test empty permit/deny fields are allowed
     */
    public function testEmptyFieldsAllowed(): void
    {
        $filter = new NetworkFilters();
        $filter->permit = '';
        $filter->deny = '';
        $filter->description = 'Test empty fields';

        $this->assertTrue($filter->save(), 'Empty permit/deny fields should be allowed');

        // Cleanup
        if ($filter->id) {
            $filter->delete();
        }
    }
}
