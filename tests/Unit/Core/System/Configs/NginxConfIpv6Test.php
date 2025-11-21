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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Core\System\Configs\NginxConf;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * Unit tests for NginxConf IPv6 support.
 *
 * Tests IPv6 listener generation in Nginx configuration.
 *
 * @package MikoPBX\Tests\Unit\Core\System\Configs
 */
class NginxConfIpv6Test extends TestCase
{
    /**
     * Helper method to access private method hasIpv6Interfaces() via reflection.
     *
     * @param NginxConf $nginxConf The NginxConf instance
     * @return bool True if IPv6 interfaces exist
     */
    private function invokeHasIpv6Interfaces(NginxConf $nginxConf): bool
    {
        $reflection = new ReflectionClass($nginxConf);
        $method = $reflection->getMethod('hasIpv6Interfaces');
        $method->setAccessible(true);

        return $method->invoke($nginxConf);
    }

    /**
     * Test hasIpv6Interfaces() returns false when no IPv6 interfaces configured.
     */
    public function testHasIpv6InterfacesReturnsFalseWhenNoIpv6(): void
    {
        // Find all interfaces and temporarily disable IPv6
        $interfaces = LanInterfaces::find();
        $originalModes = [];

        foreach ($interfaces as $interface) {
            $originalModes[$interface->id] = $interface->ipv6_mode;
            $interface->ipv6_mode = '0'; // Off
            $interface->save();
        }

        try {
            $nginxConf = new NginxConf();
            $result = $this->invokeHasIpv6Interfaces($nginxConf);

            $this->assertFalse($result, 'hasIpv6Interfaces should return false when all interfaces have IPv6 mode = 0');
        } finally {
            // Restore original modes
            foreach ($interfaces as $interface) {
                $interface->ipv6_mode = $originalModes[$interface->id];
                $interface->save();
            }
        }
    }

    /**
     * Test hasIpv6Interfaces() returns true when IPv6 Auto mode is enabled.
     */
    public function testHasIpv6InterfacesReturnsTrueForAutoMode(): void
    {
        $interfaces = LanInterfaces::find();
        if (count($interfaces) === 0) {
            $this->markTestSkipped('No LAN interfaces available for testing');
        }

        $testInterface = $interfaces[0];
        $originalMode = $testInterface->ipv6_mode;

        // Set to Auto mode
        $testInterface->ipv6_mode = '1';
        $testInterface->save();

        try {
            $nginxConf = new NginxConf();
            $result = $this->invokeHasIpv6Interfaces($nginxConf);

            $this->assertTrue($result, 'hasIpv6Interfaces should return true when at least one interface has IPv6 mode = 1 (Auto)');
        } finally {
            // Restore original mode
            $testInterface->ipv6_mode = $originalMode;
            $testInterface->save();
        }
    }

    /**
     * Test hasIpv6Interfaces() returns true when IPv6 Manual mode is enabled.
     */
    public function testHasIpv6InterfacesReturnsTrueForManualMode(): void
    {
        $interfaces = LanInterfaces::find();
        if (count($interfaces) === 0) {
            $this->markTestSkipped('No LAN interfaces available for testing');
        }

        $testInterface = $interfaces[0];
        $originalMode = $testInterface->ipv6_mode;

        // Set to Manual mode
        $testInterface->ipv6_mode = '2';
        $testInterface->ipv6addr = '2001:db8::1';
        $testInterface->ipv6_subnet = '64';
        $testInterface->save();

        try {
            $nginxConf = new NginxConf();
            $result = $this->invokeHasIpv6Interfaces($nginxConf);

            $this->assertTrue($result, 'hasIpv6Interfaces should return true when at least one interface has IPv6 mode = 2 (Manual)');
        } finally {
            // Restore original mode
            $testInterface->ipv6_mode = $originalMode;
            $testInterface->ipv6addr = '';
            $testInterface->ipv6_subnet = '';
            $testInterface->save();
        }
    }

    /**
     * Test that generated HTTP configuration includes IPv6 listener when IPv6 is enabled.
     */
    public function testGenerateConfIncludesIpv6ListenerForHttp(): void
    {
        $interfaces = LanInterfaces::find();
        if (count($interfaces) === 0) {
            $this->markTestSkipped('No LAN interfaces available for testing');
        }

        $testInterface = $interfaces[0];
        $originalMode = $testInterface->ipv6_mode;

        // Enable IPv6 Manual mode
        $testInterface->ipv6_mode = '2';
        $testInterface->ipv6addr = '2001:db8::100';
        $testInterface->ipv6_subnet = '64';
        $testInterface->save();

        try {
            $nginxConf = new NginxConf();
            $nginxConf->generateConf();

            // Read generated HTTP configuration
            $confPath = '/etc/nginx/mikopbx/conf.d/http-server.conf';
            if (!file_exists($confPath)) {
                $this->markTestSkipped("Configuration file $confPath does not exist");
            }

            $config = file_get_contents($confPath);

            // Check for IPv6 listener
            $this->assertStringContainsString('listen      [::]:',  $config, 'HTTP config should include IPv6 listener [::]:port');
        } finally {
            // Restore original mode
            $testInterface->ipv6_mode = $originalMode;
            $testInterface->ipv6addr = '';
            $testInterface->ipv6_subnet = '';
            $testInterface->save();
        }
    }

    /**
     * Test that generated HTTPS configuration includes IPv6 listener when IPv6 is enabled.
     */
    public function testGenerateConfIncludesIpv6ListenerForHttps(): void
    {
        $interfaces = LanInterfaces::find();
        if (count($interfaces) === 0) {
            $this->markTestSkipped('No LAN interfaces available for testing');
        }

        $testInterface = $interfaces[0];
        $originalMode = $testInterface->ipv6_mode;

        // Enable IPv6 Auto mode
        $testInterface->ipv6_mode = '1';
        $testInterface->save();

        try {
            $nginxConf = new NginxConf();
            $nginxConf->generateConf();

            // Read generated HTTPS configuration
            $confPath = '/etc/nginx/mikopbx/conf.d/https-server.conf';
            if (!file_exists($confPath)) {
                $this->markTestSkipped("Configuration file $confPath does not exist (SSL not configured)");
            }

            $config = file_get_contents($confPath);

            // Check for IPv6 listener with SSL
            $this->assertStringContainsString('listen       [::]:',  $config, 'HTTPS config should include IPv6 listener [::]:port ssl');
        } finally {
            // Restore original mode
            $testInterface->ipv6_mode = $originalMode;
            $testInterface->save();
        }
    }

    /**
     * Test that generated HTTP configuration does NOT include IPv6 listener when IPv6 is disabled.
     */
    public function testGenerateConfExcludesIpv6ListenerWhenDisabled(): void
    {
        $interfaces = LanInterfaces::find();
        $originalModes = [];

        // Disable IPv6 on all interfaces
        foreach ($interfaces as $interface) {
            $originalModes[$interface->id] = $interface->ipv6_mode;
            $interface->ipv6_mode = '0'; // Off
            $interface->save();
        }

        try {
            $nginxConf = new NginxConf();
            $nginxConf->generateConf();

            // Read generated HTTP configuration
            $confPath = '/etc/nginx/mikopbx/conf.d/http-server.conf';
            if (!file_exists($confPath)) {
                $this->markTestSkipped("Configuration file $confPath does not exist");
            }

            $config = file_get_contents($confPath);

            // IPv6 listener should NOT be present
            $this->assertStringNotContainsString('listen      [::]:',  $config, 'HTTP config should NOT include IPv6 listener when IPv6 is disabled');
        } finally {
            // Restore original modes
            foreach ($interfaces as $interface) {
                $interface->ipv6_mode = $originalModes[$interface->id];
                $interface->save();
            }
        }
    }
}
