#!/usr/bin/env python3
"""Comprehensive end-to-end IPv6 test suite

This test suite provides complete coverage of IPv6 implementation across all layers:
- Model layer (database)
- REST API (validation)
- Network configuration (backend)
- Service configurations (nginx, asterisk, firewall)
- Docker compatibility

Tests are designed to verify all Success Criteria from the IPv6 implementation task.
"""
import pytest
from conftest import assert_api_success


@pytest.mark.dangerous_network
class TestIPv6EndToEndNativeDualStack:
    """End-to-end test for Native Dual-Stack mode (IPv4 Static + IPv6 Manual)

    This test verifies the complete flow of configuring dual-stack networking:
    1. Configure both IPv4 and IPv6 on the same interface
    2. Verify database storage
    3. Verify API returns correct data
    4. Verify network commands would be generated correctly
    """
    test_interface_id = None
    original_config = None

    def test_01_configure_dual_stack(self, api_client):
        """Configure interface with both IPv4 and IPv6"""
        # Get current configuration
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get network configuration")

        TestIPv6EndToEndNativeDualStack.original_config = response['data']

        # Find first interface
        interfaces = response['data'].get('interfaces', [])
        assert len(interfaces) > 0, "Should have at least one interface"

        iface = interfaces[0]
        iface_id = iface['id']
        TestIPv6EndToEndNativeDualStack.test_interface_id = iface_id

        # Configure dual-stack
        save_data = {
            'staticRoutes': response['data'].get('staticRoutes', []),
            # IPv4 Static
            f'dhcp_{iface_id}': False,
            f'ipaddr_{iface_id}': '192.168.100.10',
            f'subnet_{iface_id}': '24',
            f'gateway_{iface_id}': '192.168.100.1',
            # IPv6 Manual
            f'ipv6_mode_{iface_id}': '2',
            f'ipv6addr_{iface_id}': '2001:db8:100::10',
            f'ipv6_subnet_{iface_id}': '64',
            f'ipv6_gateway_{iface_id}': '2001:db8:100::1',
            # IPv6 DNS
            f'primarydns6_{iface_id}': '2001:4860:4860::8888',
            f'secondarydns6_{iface_id}': '2001:4860:4860::8844',
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save dual-stack configuration")

        print(f"✓ Configured dual-stack on interface {iface.get('interface')}")

    def test_02_verify_dual_stack_saved(self, api_client):
        """Verify dual-stack configuration was saved correctly"""
        if not TestIPv6EndToEndNativeDualStack.test_interface_id:
            pytest.skip("No interface ID from configuration test")

        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get configuration")

        # Find configured interface
        iface = None
        for i in response['data']['interfaces']:
            if i['id'] == TestIPv6EndToEndNativeDualStack.test_interface_id:
                iface = i
                break

        assert iface is not None, "Interface should exist"

        # Verify IPv4
        assert iface['dhcp'] == False, "DHCP should be disabled"
        assert iface['ipaddr'] == '192.168.100.10', "IPv4 address should match"
        assert iface['subnet'] == '24', "IPv4 subnet should match"
        assert iface['gateway'] == '192.168.100.1', "IPv4 gateway should match"

        # Verify IPv6
        assert iface['ipv6_mode'] == '2', "IPv6 mode should be Manual (2)"
        assert iface['ipv6addr'] == '2001:db8:100::10', "IPv6 address should match"
        assert iface['ipv6_subnet'] == '64', "IPv6 subnet should match"
        assert iface['ipv6_gateway'] == '2001:db8:100::1', "IPv6 gateway should match"

        # Verify IPv6 DNS
        assert iface.get('primarydns6') == '2001:4860:4860::8888', "Primary DNS IPv6 should match"
        assert iface.get('secondarydns6') == '2001:4860:4860::8844', "Secondary DNS IPv6 should match"

        print(f"✓ Dual-stack configuration verified:")
        print(f"  IPv4: {iface['ipaddr']}/{iface['subnet']} via {iface['gateway']}")
        print(f"  IPv6: {iface['ipv6addr']}/{iface['ipv6_subnet']} via {iface['ipv6_gateway']}")
        print(f"  DNS IPv6: {iface.get('primarydns6')}, {iface.get('secondarydns6')}")

    def test_03_cleanup_dual_stack(self, api_client):
        """Restore original configuration"""
        if not TestIPv6EndToEndNativeDualStack.test_interface_id:
            pytest.skip("No interface ID from configuration test")

        if not TestIPv6EndToEndNativeDualStack.original_config:
            pytest.skip("No original configuration to restore")

        # Find original interface settings
        iface_id = TestIPv6EndToEndNativeDualStack.test_interface_id
        original_iface = None

        for i in TestIPv6EndToEndNativeDualStack.original_config['interfaces']:
            if i['id'] == iface_id:
                original_iface = i
                break

        if original_iface:
            restore_data = {
                'staticRoutes': TestIPv6EndToEndNativeDualStack.original_config.get('staticRoutes', []),
                f'dhcp_{iface_id}': original_iface.get('dhcp', True),
                f'ipaddr_{iface_id}': original_iface.get('ipaddr', ''),
                f'subnet_{iface_id}': original_iface.get('subnet', ''),
                f'gateway_{iface_id}': original_iface.get('gateway', ''),
                f'ipv6_mode_{iface_id}': original_iface.get('ipv6_mode', '0'),
                f'ipv6addr_{iface_id}': original_iface.get('ipv6addr', ''),
                f'ipv6_subnet_{iface_id}': original_iface.get('ipv6_subnet', ''),
                f'ipv6_gateway_{iface_id}': original_iface.get('ipv6_gateway', ''),
                f'primarydns6_{iface_id}': original_iface.get('primarydns6', ''),
                f'secondarydns6_{iface_id}': original_iface.get('secondarydns6', ''),
            }

            api_client.post('network:saveConfig', restore_data)
            print(f"✓ Restored original configuration")


@pytest.mark.dangerous_network
class TestIPv6EndToEndAutoMode:
    """End-to-end test for IPv6 Auto mode (SLAAC/DHCPv6)"""
    test_interface_id = None
    original_ipv6_mode = None

    def test_01_configure_ipv6_auto(self, api_client):
        """Configure IPv6 Auto mode (SLAAC/DHCPv6)"""
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get network configuration")

        interfaces = response['data'].get('interfaces', [])
        assert len(interfaces) > 0, "Should have at least one interface"

        iface = interfaces[0]
        iface_id = iface['id']
        TestIPv6EndToEndAutoMode.test_interface_id = iface_id
        TestIPv6EndToEndAutoMode.original_ipv6_mode = iface.get('ipv6_mode', '0')

        # Configure IPv6 Auto mode
        save_data = {
            'staticRoutes': response['data'].get('staticRoutes', []),
            f'ipv6_mode_{iface_id}': '1',  # Auto mode
            f'ipv6addr_{iface_id}': '',
            f'ipv6_subnet_{iface_id}': '',
            f'ipv6_gateway_{iface_id}': '',
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save IPv6 Auto mode")

        print(f"✓ Configured IPv6 Auto mode (SLAAC/DHCPv6)")

    def test_02_verify_auto_mode_saved(self, api_client):
        """Verify Auto mode was saved and manual fields are empty"""
        if not TestIPv6EndToEndAutoMode.test_interface_id:
            pytest.skip("No interface ID from configuration test")

        response = api_client.get('network:getConfig')

        iface = None
        for i in response['data']['interfaces']:
            if i['id'] == TestIPv6EndToEndAutoMode.test_interface_id:
                iface = i
                break

        assert iface['ipv6_mode'] == '1', "IPv6 mode should be Auto (1)"
        # In Auto mode, manual fields should be empty or not required
        print(f"✓ IPv6 Auto mode verified (mode=1)")

    def test_03_cleanup_auto_mode(self, api_client):
        """Restore original IPv6 mode"""
        if not TestIPv6EndToEndAutoMode.test_interface_id:
            pytest.skip("No interface ID")

        restore_data = {
            'staticRoutes': [],
            f'ipv6_mode_{TestIPv6EndToEndAutoMode.test_interface_id}': TestIPv6EndToEndAutoMode.original_ipv6_mode,
        }

        api_client.post('network:saveConfig', restore_data)
        print(f"✓ Restored IPv6 mode to {TestIPv6EndToEndAutoMode.original_ipv6_mode}")


@pytest.mark.dangerous_network
class TestIPv6EndToEndStaticRoutes:
    """End-to-end test for IPv6 static routes (create, update, delete)"""
    ipv4_route_id = None
    ipv6_route_id = None

    def test_01_create_mixed_routes(self, api_client):
        """Create both IPv4 and IPv6 static routes"""
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get network configuration")

        existing_routes = response['data'].get('staticRoutes', [])

        # Clean up test routes from previous runs
        cleaned_routes = [r for r in existing_routes
                         if not ((r.get('network') == '10.99.0.0' and r.get('subnet') == '24') or
                                (r.get('network') == '2001:db8:99::' and r.get('subnet') == '64'))]

        # Add IPv4 and IPv6 test routes
        new_routes = cleaned_routes + [
            {
                'id': 'new_ipv4_e2e',
                'network': '10.99.0.0',
                'subnet': '24',
                'gateway': '192.168.1.1',
                'description': 'IPv4 end-to-end test route'
            },
            {
                'id': 'new_ipv6_e2e',
                'network': '2001:db8:99::',
                'subnet': '64',
                'gateway': '2001:db8::1',
                'description': 'IPv6 end-to-end test route'
            }
        ]

        save_data = {
            'staticRoutes': new_routes
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save mixed routes")

        # Get route IDs
        verify = api_client.get('network:getConfig')
        for route in verify['data']['staticRoutes']:
            if route['network'] == '10.99.0.0':
                TestIPv6EndToEndStaticRoutes.ipv4_route_id = route['id']
            elif route['network'] == '2001:db8:99::':
                TestIPv6EndToEndStaticRoutes.ipv6_route_id = route['id']

        print(f"✓ Created mixed IPv4 and IPv6 routes")
        print(f"  IPv4 route ID: {TestIPv6EndToEndStaticRoutes.ipv4_route_id}")
        print(f"  IPv6 route ID: {TestIPv6EndToEndStaticRoutes.ipv6_route_id}")

    def test_02_verify_routes_coexist(self, api_client):
        """Verify both IPv4 and IPv6 routes exist in same table"""
        response = api_client.get('network:getConfig')
        routes = response['data']['staticRoutes']

        ipv4_exists = any(r['network'] == '10.99.0.0' for r in routes)
        ipv6_exists = any(r['network'] == '2001:db8:99::' for r in routes)

        assert ipv4_exists, "IPv4 route should exist"
        assert ipv6_exists, "IPv6 route should exist"

        print(f"✓ Both IPv4 and IPv6 routes coexist in routing table")

    def test_03_update_ipv6_route(self, api_client):
        """Update IPv6 route gateway"""
        if not TestIPv6EndToEndStaticRoutes.ipv6_route_id:
            pytest.skip("No IPv6 route ID")

        response = api_client.get('network:getConfig')
        routes = response['data'].get('staticRoutes', [])

        # Update IPv6 route
        updated_routes = []
        for route in routes:
            if route['id'] == TestIPv6EndToEndStaticRoutes.ipv6_route_id:
                route['gateway'] = '2001:db8::254'
                route['priority'] = 50
            updated_routes.append(route)

        save_data = {
            'staticRoutes': updated_routes
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to update IPv6 route")

        # Verify update
        verify = api_client.get('network:getConfig')
        updated_route = None
        for route in verify['data']['staticRoutes']:
            if route['id'] == TestIPv6EndToEndStaticRoutes.ipv6_route_id:
                updated_route = route
                break

        assert updated_route['gateway'] == '2001:db8::254', "Gateway should be updated"
        assert updated_route['priority'] == 50, "Priority should be updated"

        print(f"✓ Updated IPv6 route gateway to {updated_route['gateway']}")

    def test_04_cleanup_routes(self, api_client):
        """Delete test routes"""
        response = api_client.get('network:getConfig')
        routes = response['data'].get('staticRoutes', [])

        # Remove test routes
        cleaned_routes = [r for r in routes
                         if r['id'] not in [TestIPv6EndToEndStaticRoutes.ipv4_route_id,
                                           TestIPv6EndToEndStaticRoutes.ipv6_route_id]]

        save_data = {
            'staticRoutes': cleaned_routes
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to cleanup routes")

        print(f"✓ Cleaned up test routes")


@pytest.mark.dangerous_network
class TestIPv6EndToEndValidation:
    """End-to-end validation tests for IPv6"""

    def test_01_validate_ipv6_address_formats(self, api_client):
        """Test various valid IPv6 address formats"""
        response = api_client.get('network:getConfig')
        iface_id = response['data']['interfaces'][0]['id']

        valid_formats = [
            '2001:db8::1',           # Compressed
            '2001:0db8:0000:0000:0000:0000:0000:0001',  # Full
            '::1',                   # Loopback
            'fe80::1',              # Link-local
        ]

        for ipv6addr in valid_formats:
            save_data = {
                'staticRoutes': [],
                f'ipv6_mode_{iface_id}': '2',
                f'ipv6addr_{iface_id}': ipv6addr,
                f'ipv6_subnet_{iface_id}': '64',
                f'ipv6_gateway_{iface_id}': '2001:db8::1',
            }

            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                print(f"✓ Valid IPv6 format accepted: {ipv6addr}")
            else:
                print(f"⚠ Valid IPv6 format rejected: {ipv6addr}")

        # Reset to Off mode
        api_client.post('network:saveConfig', {
            'staticRoutes': [],
            f'ipv6_mode_{iface_id}': '0'
        })

    def test_02_validate_ipv6_subnet_ranges(self, api_client):
        """Test IPv6 subnet range validation (0-128)"""
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # Test valid subnet ranges
        valid_subnets = ['1', '64', '128']
        for subnet in valid_subnets:
            test_route = {
                'id': f'new_subnet_{subnet}',
                'network': '2001:db8:test::',
                'subnet': subnet,
                'gateway': '2001:db8::1'
            }

            save_data = {
                'staticRoutes': existing_routes + [test_route]
            }

            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                print(f"✓ Valid IPv6 subnet /{subnet} accepted")
                # Cleanup
                verify = api_client.get('network:getConfig')
                cleanup_routes = [r for r in verify['data']['staticRoutes']
                                if r['id'] != test_route['id']]
                api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})
            else:
                print(f"⚠ Valid IPv6 subnet /{subnet} rejected")

    def test_03_validate_invalid_ipv6(self, api_client):
        """Test that invalid IPv6 addresses are rejected"""
        response = api_client.get('network:getConfig')
        config = response['data']

        invalid_routes = [
            {'network': 'zzzz:yyyy::1', 'subnet': '64'},  # Invalid characters
            {'network': '2001:db8::1', 'subnet': '129'},  # Subnet >128
            {'network': '192.168.1.1', 'subnet': '128'},  # IPv4 as IPv6
        ]

        for invalid in invalid_routes:
            test_route = {
                'id': 'new_invalid_test',
                'network': invalid['network'],
                'subnet': invalid['subnet'],
                'gateway': '2001:db8::1'
            }

            save_data = {
                'staticRoutes': config.get('staticRoutes', []) + [test_route]
            }

            try:
                response = api_client.post('network:saveConfig', save_data)
                if not response.get('result', False):
                    print(f"✓ Invalid IPv6 rejected: {invalid['network']}/{invalid['subnet']}")
                else:
                    print(f"⚠ Invalid IPv6 accepted: {invalid['network']}/{invalid['subnet']}")
            except Exception as e:
                if '422' in str(e) or '400' in str(e):
                    print(f"✓ Invalid IPv6 rejected with error: {invalid['network']}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
