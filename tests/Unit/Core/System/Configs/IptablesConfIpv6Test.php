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

namespace MikoPBX\Tests\Unit\Core\System\Configs;

require_once 'Globals.php';

use MikoPBX\Core\System\Configs\IptablesConf;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * Unit tests for IptablesConf IPv6 support.
 *
 * Tests dual-stack firewall rule generation (iptables and ip6tables).
 *
 * @package MikoPBX\Tests\Unit\Core\System\Configs
 */
class IptablesConfIpv6Test extends TestCase
{
    /**
     * Helper method to access private method getFirewallRule() via reflection.
     *
     * @param IptablesConf $iptablesConf The IptablesConf instance
     * @param string $subnet Subnet or IP address
     * @param string $protocol Protocol (tcp, udp, icmp)
     * @param string $otherData Additional parameters
     * @param string $action Action (ACCEPT, DROP, etc.)
     * @return string The generated firewall rule
     */
    private function invokeGetFirewallRule(
        IptablesConf $iptablesConf,
        string $subnet,
        string $protocol,
        string $otherData = '',
        string $action = 'ACCEPT'
    ): string {
        $reflection = new ReflectionClass($iptablesConf);
        $method = $reflection->getMethod('getFirewallRule');
        $method->setAccessible(true);

        return $method->invoke($iptablesConf, $subnet, $protocol, $otherData, $action);
    }

    /**
     * Test getFirewallRule() generates iptables command for IPv4 address.
     */
    public function testGetFirewallRuleGeneratesIptablesForIpv4(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '192.168.1.100',
            'tcp',
            '-m multiport --dport 80,443',
            'ACCEPT'
        );

        $this->assertStringContainsString('iptables', $rule, 'Rule should use iptables for IPv4');
        $this->assertStringNotContainsString('ip6tables', $rule, 'Rule should NOT use ip6tables for IPv4');
        $this->assertStringContainsString('-s 192.168.1.100', $rule, 'Rule should include source IP');
        $this->assertStringContainsString('-p tcp', $rule, 'Rule should include protocol');
        $this->assertStringContainsString('-m multiport --dport 80,443', $rule, 'Rule should include port specification');
        $this->assertStringContainsString('-j ACCEPT', $rule, 'Rule should include action');
    }

    /**
     * Test getFirewallRule() generates iptables command for IPv4 CIDR subnet.
     */
    public function testGetFirewallRuleGeneratesIptablesForIpv4Cidr(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '192.168.1.0/24',
            'udp',
            '--dport 5060',
            'ACCEPT'
        );

        $this->assertStringContainsString('iptables', $rule, 'Rule should use iptables for IPv4 CIDR');
        $this->assertStringContainsString('-s 192.168.1.0/24', $rule, 'Rule should include CIDR notation');
        $this->assertStringContainsString('-p udp', $rule, 'Rule should include protocol');
    }

    /**
     * Test getFirewallRule() generates ip6tables command for IPv6 address.
     */
    public function testGetFirewallRuleGeneratesIp6tablesForIpv6(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '2001:db8::1',
            'tcp',
            '-m multiport --dport 80,443',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables', $rule, 'Rule should use ip6tables for IPv6');
        $this->assertStringNotContainsString('iptables -A', $rule, 'Rule should NOT use plain iptables for IPv6');
        $this->assertStringContainsString('-s 2001:db8::1', $rule, 'Rule should include IPv6 source');
        $this->assertStringContainsString('-p tcp', $rule, 'Rule should include protocol');
    }

    /**
     * Test getFirewallRule() generates ip6tables command for IPv6 CIDR subnet.
     */
    public function testGetFirewallRuleGeneratesIp6tablesForIpv6Cidr(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '2001:db8::/64',
            'udp',
            '--dport 5060',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables', $rule, 'Rule should use ip6tables for IPv6 CIDR');
        $this->assertStringContainsString('-s 2001:db8::/64', $rule, 'Rule should include IPv6 CIDR notation');
        $this->assertStringContainsString('-p udp', $rule, 'Rule should include protocol');
    }

    /**
     * Test getFirewallRule() handles compressed IPv6 address.
     */
    public function testGetFirewallRuleHandlesCompressedIpv6(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '::1',
            'tcp',
            '--dport 22',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables', $rule, 'Rule should use ip6tables for compressed IPv6 ::1');
        $this->assertStringContainsString('-s ::1', $rule, 'Rule should preserve compressed IPv6 format');
    }

    /**
     * Test getFirewallRule() handles full IPv6 address.
     */
    public function testGetFirewallRuleHandlesFullIpv6(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '2001:0db8:0000:0000:0000:0000:0000:0001',
            'tcp',
            '--dport 443',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables', $rule, 'Rule should use ip6tables for full IPv6 address');
        $this->assertStringContainsString('-p tcp', $rule, 'Rule should include protocol');
    }

    /**
     * Test getFirewallRule() handles DROP action.
     */
    public function testGetFirewallRuleHandlesDropAction(): void
    {
        $iptablesConf = new IptablesConf();

        $ruleIpv4 = $this->invokeGetFirewallRule(
            $iptablesConf,
            '10.0.0.1',
            'tcp',
            '',
            'DROP'
        );

        $ruleIpv6 = $this->invokeGetFirewallRule(
            $iptablesConf,
            'fe80::1',
            'tcp',
            '',
            'DROP'
        );

        $this->assertStringContainsString('-j DROP', $ruleIpv4, 'IPv4 rule should include DROP action');
        $this->assertStringContainsString('-j DROP', $ruleIpv6, 'IPv6 rule should include DROP action');
    }

    /**
     * Test getFirewallRule() handles link-local IPv6 address.
     */
    public function testGetFirewallRuleHandlesLinkLocalIpv6(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            'fe80::1',
            'tcp',
            '--dport 5060',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables', $rule, 'Rule should use ip6tables for link-local IPv6 fe80::1');
        $this->assertStringContainsString('-s fe80::1', $rule, 'Rule should include link-local address');
    }

    /**
     * Test getFirewallRule() handles IPv4-mapped IPv6 address.
     */
    public function testGetFirewallRuleHandlesIpv4MappedIpv6(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '::ffff:192.0.2.1',
            'tcp',
            '--dport 80',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables', $rule, 'Rule should use ip6tables for IPv4-mapped IPv6');
        $this->assertStringContainsString('-s ::ffff:192.0.2.1', $rule, 'Rule should include IPv4-mapped address');
    }

    /**
     * Test getFirewallRule() with empty other_data parameter.
     */
    public function testGetFirewallRuleWithEmptyOtherData(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '2001:db8::100',
            'tcp',
            '',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables -A INPUT -s 2001:db8::100 -p tcp', $rule, 'Rule should handle empty other_data');
        $this->assertStringContainsString('-j ACCEPT', $rule, 'Rule should include action');
    }

    /**
     * Test getFirewallRule() with ICMP protocol for IPv4.
     */
    public function testGetFirewallRuleWithIcmpIpv4(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '192.168.1.0/24',
            'icmp',
            '--icmp-type echo-request',
            'ACCEPT'
        );

        $this->assertStringContainsString('iptables', $rule, 'ICMP rule should use iptables for IPv4');
        $this->assertStringContainsString('-p icmp', $rule, 'Rule should specify ICMP protocol');
        $this->assertStringContainsString('--icmp-type echo-request', $rule, 'Rule should include ICMP type');
    }

    /**
     * Test getFirewallRule() with ICMPv6 protocol for IPv6.
     */
    public function testGetFirewallRuleWithIcmpv6(): void
    {
        $iptablesConf = new IptablesConf();

        $rule = $this->invokeGetFirewallRule(
            $iptablesConf,
            '2001:db8::/64',
            'icmp',
            '--icmp-type echo-request',
            'ACCEPT'
        );

        $this->assertStringContainsString('ip6tables', $rule, 'ICMPv6 rule should use ip6tables for IPv6');
        $this->assertStringContainsString('-p icmp', $rule, 'Rule should specify protocol (ICMPv6 in ip6tables)');
    }

    /**
     * Test getFirewallRule() with multiport for TCP (dual-stack scenario).
     */
    public function testGetFirewallRuleWithMultiportDualStack(): void
    {
        $iptablesConf = new IptablesConf();

        $ruleIpv4 = $this->invokeGetFirewallRule(
            $iptablesConf,
            '192.168.1.100',
            'tcp',
            '-m multiport --dport 5060,5061',
            'ACCEPT'
        );

        $ruleIpv6 = $this->invokeGetFirewallRule(
            $iptablesConf,
            '2001:db8::100',
            'tcp',
            '-m multiport --dport 5060,5061',
            'ACCEPT'
        );

        $this->assertStringContainsString('iptables', $ruleIpv4, 'IPv4 multiport rule should use iptables');
        $this->assertStringContainsString('-m multiport --dport 5060,5061', $ruleIpv4, 'IPv4 rule should include multiport specification');

        $this->assertStringContainsString('ip6tables', $ruleIpv6, 'IPv6 multiport rule should use ip6tables');
        $this->assertStringContainsString('-m multiport --dport 5060,5061', $ruleIpv6, 'IPv6 rule should include multiport specification');
    }
}
