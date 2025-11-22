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

namespace MikoPBX\Tests\Core\System\Configs;

require_once 'Globals.php';

use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Configs\IptablesConf;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class IptablesConfTest extends TestCase
{

    public function testApplyConfig()
    {
        $firewall = new IptablesConf();
        $firewall->applyConfig();

        $fail2ban = new Fail2BanConf();
        $fail2ban->reStart();
    }

    public function testUpdateFirewallRules()
    {
        IptablesConf::updateFirewallRules();
        $this->assertTrue(true);
    }

    /**
     * Helper to call private getFirewallRule method via reflection
     */
    private function callGetFirewallRule(string $subnet, string $protocol, string $otherData = '', string $action = 'ACCEPT'): string
    {
        $iptablesConf = new IptablesConf();
        $reflection = new ReflectionClass($iptablesConf);
        $method = $reflection->getMethod('getFirewallRule');
        $method->setAccessible(true);

        return $method->invoke($iptablesConf, $subnet, $protocol, $otherData, $action);
    }

    /**
     * Test IPv4 generates iptables command
     */
    public function testGetFirewallRuleIPv4()
    {
        $rule = $this->callGetFirewallRule('192.168.1.0/24', 'tcp', '--dport 22');

        $this->assertStringContainsString('iptables', $rule, 'IPv4 should use iptables');
        $this->assertStringNotContainsString('ip6tables', $rule, 'IPv4 should not use ip6tables');
        $this->assertStringContainsString('192.168.1.0/24', $rule, 'Should contain IPv4 subnet');
    }

    /**
     * Test IPv6 generates ip6tables command
     */
    public function testGetFirewallRuleIPv6()
    {
        $rule = $this->callGetFirewallRule('2001:db8::/64', 'tcp', '--dport 22');

        $this->assertStringContainsString('ip6tables', $rule, 'IPv6 should use ip6tables');
        $this->assertStringNotContainsString('iptables -A', $rule, 'IPv6 should not use plain iptables');
        $this->assertStringContainsString('2001:db8::/64', $rule, 'Should contain IPv6 subnet');
    }

    /**
     * Test IPv6 CIDR notation with various prefix lengths
     */
    public function testGetFirewallRuleIPv6CIDR()
    {
        $testCases = [
            '2001:db8::/48',
            '2001:db8::/64',
            'fe80::/10',
            '::1/128',
        ];

        foreach ($testCases as $cidr) {
            $rule = $this->callGetFirewallRule($cidr, 'udp');
            $this->assertStringContainsString('ip6tables', $rule, "CIDR $cidr should use ip6tables");
            $this->assertStringContainsString($cidr, $rule, "Should contain CIDR notation $cidr");
        }
    }

    /**
     * Test localhost IPv6 handling
     */
    public function testGetFirewallRuleLocalhost()
    {
        $rule = $this->callGetFirewallRule('::1', 'tcp');

        $this->assertStringContainsString('ip6tables', $rule, 'IPv6 localhost should use ip6tables');
        $this->assertStringContainsString('::1', $rule, 'Should contain IPv6 localhost address');
    }
}
