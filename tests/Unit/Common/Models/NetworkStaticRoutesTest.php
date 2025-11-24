<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\NetworkStaticRoutes;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Unit tests for NetworkStaticRoutes model with IPv6 support
 */
class NetworkStaticRoutesTest extends AbstractUnitTest
{
    /**
     * Test valid IPv4 static route
     */
    public function testValidIpv4StaticRoute(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.10.0';
        $route->subnet = '24';
        $route->gateway = '192.168.1.1';
        $route->interface = 'eth0';
        $route->description = 'Test IPv4 route';

        $this->assertTrue($route->validation());
    }

    /**
     * Test valid IPv6 static route
     */
    public function testValidIpv6StaticRoute(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '2001:db8::';
        $route->subnet = '64';
        $route->gateway = '2001:db8::1';
        $route->interface = 'eth0';
        $route->description = 'Test IPv6 route';

        $this->assertTrue($route->validation());
    }

    /**
     * Test IPv4 route with various valid subnet masks
     */
    public function testIpv4RouteWithValidSubnetMasks(): void
    {
        $validSubnets = [0, 8, 16, 24, 32];

        foreach ($validSubnets as $subnet) {
            $route = new NetworkStaticRoutes();
            $route->network = '192.168.1.0';
            $route->subnet = (string)$subnet;
            $route->gateway = '192.168.1.1';

            $this->assertTrue($route->validation(), "Subnet /$subnet should be valid for IPv4");
        }
    }

    /**
     * Test IPv6 route with various valid subnet masks
     */
    public function testIpv6RouteWithValidSubnetMasks(): void
    {
        $validSubnets = [0, 32, 64, 128];

        foreach ($validSubnets as $subnet) {
            $route = new NetworkStaticRoutes();
            $route->network = '2001:db8::';
            $route->subnet = (string)$subnet;
            $route->gateway = '2001:db8::1';

            $this->assertTrue($route->validation(), "Subnet /$subnet should be valid for IPv6");
        }
    }

    /**
     * Test IPv4 route with invalid subnet mask (too high)
     */
    public function testIpv4RouteWithInvalidSubnetMask(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.1.0';
        $route->subnet = '33'; // Invalid for IPv4
        $route->gateway = '192.168.1.1';

        $this->assertFalse($route->validation());
    }

    /**
     * Test IPv6 route with invalid subnet mask (too high)
     */
    public function testIpv6RouteWithInvalidSubnetMask(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '2001:db8::';
        $route->subnet = '129'; // Invalid for IPv6
        $route->gateway = '2001:db8::1';

        $this->assertFalse($route->validation());
    }

    /**
     * Test route with invalid network address
     */
    public function testRouteWithInvalidNetworkAddress(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = 'invalid';
        $route->subnet = '24';
        $route->gateway = '192.168.1.1';

        $this->assertFalse($route->validation());
    }

    /**
     * Test route with invalid gateway address
     */
    public function testRouteWithInvalidGatewayAddress(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.10.0';
        $route->subnet = '24';
        $route->gateway = 'invalid';

        $this->assertFalse($route->validation());
    }

    /**
     * Test route with empty network address
     */
    public function testRouteWithEmptyNetworkAddress(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '';
        $route->subnet = '24';
        $route->gateway = '192.168.1.1';

        $this->assertFalse($route->validation());
    }

    /**
     * Test route with empty gateway address
     */
    public function testRouteWithEmptyGatewayAddress(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.10.0';
        $route->subnet = '24';
        $route->gateway = '';

        $this->assertFalse($route->validation());
    }

    /**
     * Test route with empty subnet
     */
    public function testRouteWithEmptySubnet(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.10.0';
        $route->subnet = '';
        $route->gateway = '192.168.1.1';

        $this->assertFalse($route->validation());
    }

    /**
     * Test route with subnet "0" (valid - matches everything)
     */
    public function testRouteWithZeroSubnet(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.10.0';
        $route->subnet = '0';
        $route->gateway = '192.168.1.1';

        $this->assertTrue($route->validation());
    }

    /**
     * Test route with non-numeric subnet
     */
    public function testRouteWithNonNumericSubnet(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.10.0';
        $route->subnet = 'abc';
        $route->gateway = '192.168.1.1';

        $this->assertFalse($route->validation());
    }

    /**
     * Test route with negative subnet
     */
    public function testRouteWithNegativeSubnet(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '192.168.10.0';
        $route->subnet = '-1';
        $route->gateway = '192.168.1.1';

        $this->assertFalse($route->validation());
    }

    /**
     * Test IPv6 link-local route
     */
    public function testIpv6LinkLocalRoute(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = 'fe80::';
        $route->subnet = '10';
        $route->gateway = 'fe80::1';
        $route->interface = 'eth0';

        $this->assertTrue($route->validation());
    }

    /**
     * Test IPv4-mapped IPv6 address
     */
    public function testIpv4MappedIpv6Route(): void
    {
        $route = new NetworkStaticRoutes();
        $route->network = '::ffff:192.0.2.0';
        $route->subnet = '96';
        $route->gateway = '::ffff:192.0.2.1';

        $this->assertTrue($route->validation());
    }
}
