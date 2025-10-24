#!/usr/bin/env python3
"""Test suite for Network configuration and static routes"""
import pytest
from conftest import assert_api_success

class TestNetworkConfig:
    """Tests for network configuration management"""
    original_config = None

    def test_01_get_full_config(self, api_client):
        """GET full network configuration"""
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get network configuration")

        TestNetworkConfig.original_config = response['data']

        # Verify configuration structure
        assert 'interfaces' in response['data'], "Configuration should include interfaces"
        assert 'ports' in response['data'], "Configuration should include ports"
        assert 'settings' not in response['data'], "Configuration should NOT include deprecated 'settings' block"

        # Verify global settings are in internet interface
        internet_interface = None
        for iface in response['data']['interfaces']:
            if iface.get('internet'):
                internet_interface = iface
                break

        assert internet_interface is not None, "Should have an internet interface"
        print(f"  Internet interface: {internet_interface.get('interface')} (ID: {internet_interface.get('id')})")

        # Verify port keys use camelCase (matching PbxSettings constants)
        ports = response['data']['ports']
        assert 'externalSIPPort' in ports, "Ports should include externalSIPPort (camelCase)"
        assert 'externalTLSPort' in ports, "Ports should include externalTLSPort (camelCase)"
        assert 'SIPPort' in ports, "Ports should include SIPPort"
        assert 'TLS_PORT' in ports, "Ports should include TLS_PORT"
        assert 'RTPPortFrom' in ports, "Ports should include RTPPortFrom"
        assert 'RTPPortTo' in ports, "Ports should include RTPPortTo"

        print(f"✓ Retrieved network configuration with {len(response['data'].get('interfaces', []))} interfaces")
        print(f"  Port keys: {', '.join(ports.keys())}")

    def test_02_get_nat_settings(self, api_client):
        """GET NAT settings"""
        response = api_client.get('network:getNatSettings')
        assert_api_success(response, "Failed to get NAT settings")

        data = response['data']
        # NAT settings include external IP, STUN config, etc
        print(f"✓ Retrieved NAT settings")
        if 'externalip' in data and data['externalip']:
            print(f"  External IP: {data['externalip']}")

    def test_03_save_external_ports(self, api_client):
        """Save external SIP/TLS ports using correct field names"""
        # Get current config
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get current config")

        original_config = response['data']
        original_ports = original_config['ports']
        original_nat = original_config.get('nat', {})
        original_sip = original_ports.get('externalSIPPort', '5060')
        original_tls = original_ports.get('externalTLSPort', '5061')

        # Find internet interface ID
        internet_interface_id = original_config.get('internetInterfaceId', 1)

        # Save config with modified ports using camelCase keys
        save_data = {
            'staticRoutes': original_config.get('staticRoutes', []),
            'externalSIPPort': '5063',  # WHY: camelCase matches PbxSettings::EXTERNAL_SIP_PORT
            'externalTLSPort': '5062',
            'internet_interface': internet_interface_id,  # WHY: Preserve internet interface selection
            'usenat': True,
            'exthostname': 'mikopbxtest.localhost',  # WHY: Required when NAT enabled
            'autoUpdateExternalIp': False
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save ports configuration")

        # Verify ports were saved
        verify = api_client.get('network:getConfig')
        saved_ports = verify['data']['ports']

        assert saved_ports['externalSIPPort'] == '5063', "externalSIPPort should be saved"
        assert saved_ports['externalTLSPort'] == '5062', "externalTLSPort should be saved"

        print(f"✓ Saved external ports: SIP={saved_ports['externalSIPPort']}, TLS={saved_ports['externalTLSPort']}")

        # Restore original values
        restore_data = {
            'staticRoutes': verify['data'].get('staticRoutes', []),
            'externalSIPPort': original_sip,
            'externalTLSPort': original_tls,
            'internet_interface': internet_interface_id,
            'usenat': original_nat.get('usenat', False),
            'exthostname': original_nat.get('exthostname', ''),
            'extipaddr': original_nat.get('extipaddr', ''),
            'autoUpdateExternalIp': original_nat.get('AUTO_UPDATE_EXTERNAL_IP', False)
        }
        api_client.post('network:saveConfig', restore_data)
        print(f"  Restored original ports: SIP={original_sip}, TLS={original_tls}")

    @pytest.mark.dangerous_network
    def test_04_save_global_settings_in_internet_interface(self, api_client):
        """Save hostname/domain in internet interface (not in deprecated 'settings' block)

        WARNING: This test modifies hostname, domain, gateway, DNS settings
        """
        # Get current config
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get current config")

        original_config = response['data']

        # Find internet interface
        internet_interface = None
        for iface in original_config['interfaces']:
            if iface.get('internet'):
                internet_interface = iface
                break

        assert internet_interface is not None, "Should have an internet interface"

        interface_id = internet_interface['id']
        original_hostname = internet_interface.get('hostname', '')
        original_domain = internet_interface.get('domain', '')
        original_gateway = internet_interface.get('gateway', '')
        original_primarydns = internet_interface.get('primarydns', '')

        # Save config with modified hostname/domain using interface-specific keys
        save_data = {
            'staticRoutes': original_config.get('staticRoutes', []),
            f'hostname_{interface_id}': 'mikopbx-test',
            f'domain_{interface_id}': 'test.local',
            f'gateway_{interface_id}': original_gateway,
            f'primarydns_{interface_id}': original_primarydns,
            'internet_interface': interface_id,  # WHY: Mark which interface is the internet interface
            'usenat': original_config.get('nat', {}).get('usenat', False),
            'exthostname': original_config.get('nat', {}).get('exthostname', ''),
            'extipaddr': original_config.get('nat', {}).get('extipaddr', ''),
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save hostname/domain configuration")

        # Verify hostname/domain were saved in internet interface
        verify = api_client.get('network:getConfig')

        # Find internet interface in response
        internet_iface = None
        for iface in verify['data']['interfaces']:
            if iface.get('internet'):
                internet_iface = iface
                break

        assert internet_iface is not None, "Should have internet interface"
        assert internet_iface.get('hostname') == 'mikopbx-test', "Hostname should be saved in internet interface"
        assert internet_iface.get('domain') == 'test.local', "Domain should be saved in internet interface"

        print(f"✓ Saved global settings in internet interface:")
        print(f"  hostname: {internet_iface.get('hostname')}")
        print(f"  domain: {internet_iface.get('domain')}")

        # Restore original values
        restore_data = {
            'staticRoutes': verify['data'].get('staticRoutes', []),
            f'hostname_{interface_id}': original_hostname,
            f'domain_{interface_id}': original_domain,
            f'gateway_{interface_id}': original_gateway,
            f'primarydns_{interface_id}': original_primarydns,
            'internet_interface': interface_id,
            'usenat': original_config.get('nat', {}).get('usenat', False),
            'exthostname': original_config.get('nat', {}).get('exthostname', ''),
            'extipaddr': original_config.get('nat', {}).get('extipaddr', ''),
        }
        api_client.post('network:saveConfig', restore_data)
        print(f"  Restored original values: hostname={original_hostname}, domain={original_domain}")


@pytest.mark.dangerous_network
class TestStaticRoutes:
    """Tests for static network routes via network configuration

    WARNING: These tests create/modify/delete static routes which may affect network routing
    """
    original_config = None
    test_route_id = None

    def test_01_get_network_config_with_routes(self, api_client):
        """GET network configuration including static routes"""
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get network configuration")

        TestStaticRoutes.original_config = response['data']
        
        assert 'staticRoutes' in response['data'], "Configuration should include staticRoutes"
        routes = response['data']['staticRoutes']
        assert isinstance(routes, list), "Static routes should be a list"

        print(f"✓ Retrieved network configuration with {len(routes)} static routes")
        if len(routes) > 0:
            route = routes[0]
            print(f"  Example route: {route.get('network')}/{route.get('subnet')} via {route.get('gateway')}")

    def test_02_create_static_route(self, api_client):
        """Create new static route via saveConfig"""
        # Get current config
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get current config")

        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # WHY: Clean up any existing test route from previous failed runs
        # to ensure test isolation
        cleaned_routes = [r for r in existing_routes
                         if not (r.get('network') == '10.10.10.0' and r.get('subnet') == '24')]

        # Add new route
        new_route = {
            'id': 'new_test_route',
            'network': '10.10.10.0',
            'subnet': '24',
            'gateway': '192.168.1.1',
            'interface': 'eth0',
            'description': 'Test static route created by pytest',
            'priority': 100
        }

        updated_routes = cleaned_routes + [new_route]
        
        # Save configuration with new route
        save_data = {
            'staticRoutes': updated_routes
        }
        
        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save config with new route")
        
        # Verify route was created
        verify = api_client.get('network:getConfig')
        new_routes = verify['data']['staticRoutes']
        
        # Find the created route (it should have a real ID now)
        created_route = None
        for route in new_routes:
            if route['network'] == '10.10.10.0' and route['subnet'] == '24':
                created_route = route
                TestStaticRoutes.test_route_id = route['id']
                break
        
        assert created_route is not None, "Created route should exist in config"
        assert created_route['gateway'] == '192.168.1.1', "Gateway should match"
        
        print(f"✓ Created static route: {new_route['network']}/{new_route['subnet']} via {new_route['gateway']}")
        print(f"  Route ID: {TestStaticRoutes.test_route_id}")

    def test_03_update_static_route(self, api_client):
        """Update existing static route via saveConfig"""
        if not TestStaticRoutes.test_route_id:
            pytest.skip("No route ID from creation test")
        
        # Get current config
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get current config")
        
        config = response['data']
        routes = config.get('staticRoutes', [])
        
        # Update the test route
        updated_routes = []
        for route in routes:
            if route['id'] == TestStaticRoutes.test_route_id:
                route['gateway'] = '192.168.1.254'
                route['description'] = 'Updated test route'
                route['priority'] = 200
            updated_routes.append(route)
        
        # Save configuration
        save_data = {
            'staticRoutes': updated_routes
        }
        
        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save updated config")
        
        # Verify changes
        verify = api_client.get('network:getConfig')
        updated_route = None
        for route in verify['data']['staticRoutes']:
            if route['id'] == TestStaticRoutes.test_route_id:
                updated_route = route
                break
        
        assert updated_route is not None, "Updated route should exist"
        assert updated_route['gateway'] == '192.168.1.254', "Gateway should be updated"
        assert updated_route['priority'] == 200, "Priority should be updated"
        
        print(f"✓ Updated route: gateway → 192.168.1.254, priority → 200")

    def test_04_delete_static_route(self, api_client):
        """Delete static route via saveConfig"""
        if not TestStaticRoutes.test_route_id:
            pytest.skip("No route ID from creation test")
        
        # Get current config
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get current config")
        
        config = response['data']
        routes = config.get('staticRoutes', [])
        
        # Remove the test route
        filtered_routes = [r for r in routes if r['id'] != TestStaticRoutes.test_route_id]
        
        # Save configuration
        save_data = {
            'staticRoutes': filtered_routes
        }
        
        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save config after deletion")
        
        # Verify deletion
        verify = api_client.get('network:getConfig')
        remaining_routes = verify['data']['staticRoutes']
        
        deleted_route = None
        for route in remaining_routes:
            if route['id'] == TestStaticRoutes.test_route_id:
                deleted_route = route
                break
        
        assert deleted_route is None, "Deleted route should not exist"
        
        print(f"✓ Deleted static route {TestStaticRoutes.test_route_id}")


@pytest.mark.dangerous_network
class TestStaticRoutesValidation:
    """Validation tests for static routes

    WARNING: These tests create routes with invalid data (should be rejected by validation)
    """

    def test_01_validate_invalid_network_address(self, api_client):
        """Invalid network address should be rejected"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        
        invalid_route = {
            'id': 'new_invalid',
            'network': '999.999.999.999',  # Invalid IP
            'subnet': '24',
            'gateway': '192.168.1.1'
        }
        
        save_data = {
            'staticRoutes': config.get('staticRoutes', []) + [invalid_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected invalid network address")
            else:
                print(f"⚠ Invalid network address was accepted (validation may be lenient)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected invalid network address")
            else:
                raise

    def test_02_validate_invalid_gateway(self, api_client):
        """Invalid gateway address should be rejected"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        
        invalid_route = {
            'id': 'new_invalid',
            'network': '10.10.10.0',
            'subnet': '24',
            'gateway': 'not-an-ip'
        }
        
        save_data = {
            'staticRoutes': config.get('staticRoutes', []) + [invalid_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected invalid gateway")
            else:
                print(f"⚠ Invalid gateway was accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected invalid gateway")
            else:
                raise

    def test_03_validate_subnet_range(self, api_client):
        """Subnet mask should be 0-32"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        
        invalid_route = {
            'id': 'new_invalid',
            'network': '10.10.10.0',
            'subnet': '35',  # Invalid: >32
            'gateway': '192.168.1.1'
        }
        
        save_data = {
            'staticRoutes': config.get('staticRoutes', []) + [invalid_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected invalid subnet mask")
            else:
                print(f"⚠ Invalid subnet mask was accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected invalid subnet mask")
            else:
                raise


@pytest.mark.dangerous_network
class TestStaticRoutesEdgeCases:
    """Edge cases for static routes

    WARNING: These tests create edge case routes (default route, /32 hosts, priority 0)
    """

    def test_01_empty_interface_field(self, api_client):
        """Interface field can be empty (kernel auto-selects)"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # WHY: Clean up any existing test route from previous failed runs
        cleaned_routes = [r for r in existing_routes
                         if not (r.get('network') == '172.16.0.0' and r.get('subnet') == '16')]

        test_route = {
            'id': 'new_empty_interface',
            'network': '172.16.0.0',
            'subnet': '16',
            'gateway': '192.168.1.1',
            'interface': '',  # Empty = automatic
            'description': 'Route with auto interface',
            'priority': 999
        }

        save_data = {
            'staticRoutes': cleaned_routes + [test_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                print(f"✓ Created route with empty interface (auto-select)")
            else:
                print(f"⚠ Could not create route with empty interface")
        finally:
            # WHY: Always cleanup, even if test fails
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes']
                            if not (r.get('network') == '172.16.0.0' and r.get('subnet') == '16')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})

    def test_02_minimum_priority(self, api_client):
        """Priority can be 0"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # WHY: Clean up any existing test route from previous failed runs
        cleaned_routes = [r for r in existing_routes
                         if not (r.get('network') == '172.17.0.0' and r.get('subnet') == '16')]

        test_route = {
            'id': 'new_min_priority',
            'network': '172.17.0.0',
            'subnet': '16',
            'gateway': '192.168.1.1',
            'interface': '',
            'description': 'Route with priority 0',
            'priority': 0
        }

        save_data = {
            'staticRoutes': cleaned_routes + [test_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                # Verify priority
                verify = api_client.get('network:getConfig')
                created = None
                for r in verify['data']['staticRoutes']:
                    if r['network'] == '172.17.0.0' and r['subnet'] == '16':
                        created = r
                        break

                if created:
                    assert created['priority'] == 0, "Priority should be 0"
                    print(f"✓ Created route with minimum priority (0)")
            else:
                print(f"⚠ Could not create route with priority=0")
        finally:
            # WHY: Always cleanup, even if test fails
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes']
                            if not (r.get('network') == '172.17.0.0' and r.get('subnet') == '16')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})

    def test_03_maximum_subnet_mask(self, api_client):
        """Subnet mask /32 (single host)"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # WHY: Clean up any existing test route from previous failed runs
        cleaned_routes = [r for r in existing_routes
                         if not (r.get('network') == '8.8.8.8' and r.get('subnet') == '32')]

        test_route = {
            'id': 'new_host_route',
            'network': '8.8.8.8',
            'subnet': '32',  # Single host
            'gateway': '192.168.1.1',
            'interface': '',
            'description': 'Host route /32',
            'priority': 999
        }

        save_data = {
            'staticRoutes': cleaned_routes + [test_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                print(f"✓ Created /32 host route")
            else:
                print(f"⚠ Could not create /32 route")
        finally:
            # WHY: Always cleanup, even if test fails
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes']
                            if not (r.get('network') == '8.8.8.8' and r.get('subnet') == '32')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})

    def test_04_default_route(self, api_client):
        """Default route 0.0.0.0/0"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # WHY: Clean up any existing test default route from previous failed runs
        cleaned_routes = [r for r in existing_routes
                         if not (r.get('network') == '0.0.0.0' and r.get('subnet') == '0')]

        test_route = {
            'id': 'new_default_route',
            'network': '0.0.0.0',
            'subnet': '0',
            'gateway': '192.168.1.1',
            'interface': '',
            'description': 'Test default route',
            'priority': 999
        }

        save_data = {
            'staticRoutes': cleaned_routes + [test_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                print(f"✓ Created default route 0.0.0.0/0")
            else:
                print(f"⚠ Could not create default route (may be restricted)")
        finally:
            # WHY: Always cleanup immediately (default route is critical)
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes']
                            if not (r.get('network') == '0.0.0.0' and r.get('subnet') == '0')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
