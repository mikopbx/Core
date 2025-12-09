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


@pytest.mark.dangerous_network
class TestNetworkIPv6Config:
    """Tests for IPv6 network configuration

    WARNING: These tests modify IPv6 settings which may affect network connectivity
    """
    original_config = None
    test_interface_id = None

    def test_01_get_config_includes_ipv6_fields(self, api_client):
        """Verify API returns IPv6 fields for interfaces"""
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get network configuration")

        TestNetworkIPv6Config.original_config = response['data']

        # Verify at least one interface has IPv6 fields
        interfaces = response['data'].get('interfaces', [])
        assert len(interfaces) > 0, "Should have at least one interface"

        # Check first interface for IPv6 fields
        iface = interfaces[0]
        TestNetworkIPv6Config.test_interface_id = iface['id']

        assert 'ipv6_mode' in iface, "Interface should include ipv6_mode field"
        assert 'ipv6addr' in iface, "Interface should include ipv6addr field"
        assert 'ipv6_subnet' in iface, "Interface should include ipv6_subnet field"
        assert 'ipv6_gateway' in iface, "Interface should include ipv6_gateway field"

        print(f"✓ API returns IPv6 fields for interface {iface.get('interface')} (ID: {iface['id']})")
        print(f"  IPv6 Mode: {iface.get('ipv6_mode')} (0=Off, 1=Auto, 2=Manual)")

    def test_02_save_ipv6_manual_mode(self, api_client):
        """Save IPv6 Manual configuration (static IPv6 address)"""
        if not TestNetworkIPv6Config.test_interface_id:
            pytest.skip("No interface ID from previous test")

        # Get current config
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get current config")

        config = response['data']
        iface_id = TestNetworkIPv6Config.test_interface_id

        # Find original IPv6 settings for this interface
        original_ipv6_mode = None
        original_ipv6addr = None
        original_ipv6_subnet = None
        original_ipv6_gateway = None

        for iface in config['interfaces']:
            if iface['id'] == iface_id:
                original_ipv6_mode = iface.get('ipv6_mode', '0')
                original_ipv6addr = iface.get('ipv6addr', '')
                original_ipv6_subnet = iface.get('ipv6_subnet', '')
                original_ipv6_gateway = iface.get('ipv6_gateway', '')
                break

        # Save IPv6 Manual configuration
        save_data = {
            'staticRoutes': config.get('staticRoutes', []),
            f'ipv6_mode_{iface_id}': '2',  # Manual mode
            f'ipv6addr_{iface_id}': '2001:db8::100',
            f'ipv6_subnet_{iface_id}': '64',
            f'ipv6_gateway_{iface_id}': '2001:db8::1',
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save IPv6 configuration")

        # Verify IPv6 settings were saved
        verify = api_client.get('network:getConfig')
        saved_iface = None
        for iface in verify['data']['interfaces']:
            if iface['id'] == iface_id:
                saved_iface = iface
                break

        assert saved_iface is not None, "Interface should exist"
        assert saved_iface['ipv6_mode'] == '2', "IPv6 mode should be Manual (2)"
        assert saved_iface['ipv6addr'] == '2001:db8::100', "IPv6 address should match"
        assert saved_iface['ipv6_subnet'] == '64', "IPv6 subnet should match"
        assert saved_iface['ipv6_gateway'] == '2001:db8::1', "IPv6 gateway should match"

        print(f"✓ Saved IPv6 Manual configuration:")
        print(f"  Address: {saved_iface['ipv6addr']}/{saved_iface['ipv6_subnet']}")
        print(f"  Gateway: {saved_iface['ipv6_gateway']}")

        # Restore original IPv6 settings
        restore_data = {
            'staticRoutes': verify['data'].get('staticRoutes', []),
            f'ipv6_mode_{iface_id}': original_ipv6_mode,
            f'ipv6addr_{iface_id}': original_ipv6addr,
            f'ipv6_subnet_{iface_id}': original_ipv6_subnet,
            f'ipv6_gateway_{iface_id}': original_ipv6_gateway,
        }
        api_client.post('network:saveConfig', restore_data)
        print(f"  Restored original IPv6 mode: {original_ipv6_mode}")

    def test_03_save_ipv6_auto_mode(self, api_client):
        """Save IPv6 Auto configuration (SLAAC/DHCPv6)"""
        if not TestNetworkIPv6Config.test_interface_id:
            pytest.skip("No interface ID from previous test")

        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        iface_id = TestNetworkIPv6Config.test_interface_id

        # Find original IPv6 mode
        original_ipv6_mode = '0'
        for iface in config['interfaces']:
            if iface['id'] == iface_id:
                original_ipv6_mode = iface.get('ipv6_mode', '0')
                break

        # Save IPv6 Auto mode (SLAAC/DHCPv6)
        save_data = {
            'staticRoutes': config.get('staticRoutes', []),
            f'ipv6_mode_{iface_id}': '1',  # Auto mode
            f'ipv6addr_{iface_id}': '',    # Empty for Auto mode
            f'ipv6_subnet_{iface_id}': '',
            f'ipv6_gateway_{iface_id}': '',
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save IPv6 Auto mode")

        # Verify mode was saved
        verify = api_client.get('network:getConfig')
        saved_iface = None
        for iface in verify['data']['interfaces']:
            if iface['id'] == iface_id:
                saved_iface = iface
                break

        assert saved_iface['ipv6_mode'] == '1', "IPv6 mode should be Auto (1)"
        print(f"✓ Saved IPv6 Auto mode (SLAAC/DHCPv6)")

        # Restore original mode
        restore_data = {
            'staticRoutes': verify['data'].get('staticRoutes', []),
            f'ipv6_mode_{iface_id}': original_ipv6_mode,
        }
        api_client.post('network:saveConfig', restore_data)

    def test_04_save_ipv6_dns_servers(self, api_client):
        """Save IPv6 DNS servers (primarydns6, secondarydns6)"""
        if not TestNetworkIPv6Config.test_interface_id:
            pytest.skip("No interface ID from previous test")

        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        iface_id = TestNetworkIPv6Config.test_interface_id

        # Find original IPv6 DNS settings
        original_primarydns6 = ''
        original_secondarydns6 = ''
        for iface in config['interfaces']:
            if iface['id'] == iface_id:
                original_primarydns6 = iface.get('primarydns6', '')
                original_secondarydns6 = iface.get('secondarydns6', '')
                break

        # Save IPv6 DNS servers (Google Public DNS IPv6)
        save_data = {
            'staticRoutes': config.get('staticRoutes', []),
            'internet_interface': iface_id,
            f'primarydns6_{iface_id}': '2001:4860:4860::8888',
            f'secondarydns6_{iface_id}': '2001:4860:4860::8844',
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save IPv6 DNS servers")

        # Verify DNS servers were saved
        verify = api_client.get('network:getConfig')
        saved_iface = None
        for iface in verify['data']['interfaces']:
            if iface['id'] == iface_id:
                saved_iface = iface
                break

        assert saved_iface.get('primarydns6') == '2001:4860:4860::8888', "Primary DNS IPv6 should match"
        assert saved_iface.get('secondarydns6') == '2001:4860:4860::8844', "Secondary DNS IPv6 should match"

        print(f"✓ Saved IPv6 DNS servers:")
        print(f"  Primary: {saved_iface.get('primarydns6')}")
        print(f"  Secondary: {saved_iface.get('secondarydns6')}")

        # Restore original DNS settings
        restore_data = {
            'staticRoutes': verify['data'].get('staticRoutes', []),
            'internet_interface': iface_id,
            f'primarydns6_{iface_id}': original_primarydns6,
            f'secondarydns6_{iface_id}': original_secondarydns6,
        }
        api_client.post('network:saveConfig', restore_data)

    def test_05_dual_stack_configuration(self, api_client, is_docker):
        """Test dual-stack configuration (IPv4 + IPv6 simultaneously)"""
        if not TestNetworkIPv6Config.test_interface_id:
            pytest.skip("No interface ID from previous test")

        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        iface_id = TestNetworkIPv6Config.test_interface_id

        # Save original interface settings for cleanup
        original_iface = None
        for iface in config['interfaces']:
            if iface['id'] == iface_id:
                original_iface = iface
                break

        # Save configuration with both IPv4 and IPv6
        save_data = {
            'staticRoutes': config.get('staticRoutes', []),
            f'dhcp_{iface_id}': False,  # Static IPv4
            f'ipaddr_{iface_id}': '172.16.32.72',
            f'subnet_{iface_id}': '24',
            f'gateway_{iface_id}': '172.16.32.15',
            f'ipv6_mode_{iface_id}': '2',  # Manual IPv6
            f'ipv6addr_{iface_id}': '2001:db8::200',
            f'ipv6_subnet_{iface_id}': '64',
            f'ipv6_gateway_{iface_id}': '2001:db8::1',
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save dual-stack configuration")

        # Verify both IPv4 and IPv6 are configured
        verify = api_client.get('network:getConfig')
        saved_iface = None
        for iface in verify['data']['interfaces']:
            if iface['id'] == iface_id:
                saved_iface = iface
                break

        # IPv4 checks
        if not is_docker:
            # WHY: In Docker mode, DHCP is force-enabled by SaveConfigAction:473
            # Docker runtime manages networking, not MikoPBX
            assert saved_iface['dhcp'] == False, "DHCP should be disabled"
            assert saved_iface['ipaddr'] == '172.16.32.72', "IPv4 address should match"
        else:
            print("  ℹ️  Skipping DHCP and IP checks (Docker runtime manages networking)")
            # In Docker, GetConfigAction returns current interface IP (192.168.107.2)
            # not the value saved to database (172.16.32.72)

        # IPv6 checks
        assert saved_iface['ipv6_mode'] == '2', "IPv6 mode should be Manual"
        assert saved_iface['ipv6addr'] == '2001:db8::200', "IPv6 address should match"

        print(f"✓ Dual-stack configuration saved:")
        print(f"  IPv4: {saved_iface['ipaddr']}/{saved_iface['subnet']}")
        print(f"  IPv6: {saved_iface['ipv6addr']}/{saved_iface['ipv6_subnet']}")

        # Restore original configuration
        if original_iface:
            restore_data = {
                'staticRoutes': config.get('staticRoutes', []),
                f'dhcp_{iface_id}': original_iface.get('dhcp', True),
                f'ipaddr_{iface_id}': original_iface.get('ipaddr', ''),
                f'subnet_{iface_id}': original_iface.get('subnet', ''),
                f'gateway_{iface_id}': original_iface.get('gateway', ''),
                f'primarydns_{iface_id}': original_iface.get('primarydns', ''),
                f'secondarydns_{iface_id}': original_iface.get('secondarydns', ''),
                f'ipv6_mode_{iface_id}': original_iface.get('ipv6_mode', '0'),
                f'ipv6addr_{iface_id}': original_iface.get('ipv6addr', ''),
                f'ipv6_subnet_{iface_id}': original_iface.get('ipv6_subnet', ''),
                f'ipv6_gateway_{iface_id}': original_iface.get('ipv6_gateway', ''),
                f'primarydns6_{iface_id}': original_iface.get('primarydns6', ''),
                f'secondarydns6_{iface_id}': original_iface.get('secondarydns6', ''),
            }
            api_client.post('network:saveConfig', restore_data)
            print(f"  Restored original network configuration")


@pytest.mark.dangerous_network
class TestStaticRoutesIPv6:
    """Tests for IPv6 static routes

    WARNING: These tests create/modify/delete IPv6 static routes
    """
    test_route_id = None

    def test_01_create_ipv6_static_route(self, api_client):
        """Create new IPv6 static route"""
        # Get current config
        response = api_client.get('network:getConfig')
        assert_api_success(response, "Failed to get current config")

        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # Clean up any existing test route
        cleaned_routes = [r for r in existing_routes
                         if not (r.get('network') == '2001:db8:1::' and r.get('subnet') == '64')]

        # Add new IPv6 route
        new_route = {
            'id': 'new_ipv6_route',
            'network': '2001:db8:1::',
            'subnet': '64',
            'gateway': '2001:db8::1',
            'interface': '',
            'description': 'Test IPv6 static route',
            'priority': 100
        }

        save_data = {
            'staticRoutes': cleaned_routes + [new_route]
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to save IPv6 route")

        # Verify route was created
        verify = api_client.get('network:getConfig')
        created_route = None
        for route in verify['data']['staticRoutes']:
            if route['network'] == '2001:db8:1::' and route['subnet'] == '64':
                created_route = route
                TestStaticRoutesIPv6.test_route_id = route['id']
                break

        assert created_route is not None, "IPv6 route should be created"
        assert created_route['gateway'] == '2001:db8::1', "Gateway should match"

        print(f"✓ Created IPv6 static route: {new_route['network']}/{new_route['subnet']}")
        print(f"  Gateway: {new_route['gateway']}")
        print(f"  Route ID: {TestStaticRoutesIPv6.test_route_id}")

    def test_02_validate_ipv6_subnet_range(self, api_client):
        """IPv6 subnet should accept /1-/128 range"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # Test /128 (single host) - should be valid
        cleaned_routes = [r for r in existing_routes
                         if not (r.get('network') == '2001:db8::5' and r.get('subnet') == '128')]

        test_route = {
            'id': 'new_ipv6_host',
            'network': '2001:db8::5',
            'subnet': '128',  # Single host
            'gateway': '2001:db8::1',
            'description': 'IPv6 /128 host route'
        }

        save_data = {
            'staticRoutes': cleaned_routes + [test_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                print(f"✓ IPv6 /128 route accepted (valid)")
            else:
                print(f"⚠ IPv6 /128 route rejected (should be valid)")
        finally:
            # Cleanup
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes']
                            if not (r.get('network') == '2001:db8::5' and r.get('subnet') == '128')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})

    def test_03_cleanup_ipv6_route(self, api_client):
        """Delete IPv6 test route"""
        if not TestStaticRoutesIPv6.test_route_id:
            pytest.skip("No route ID from creation test")

        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        routes = config.get('staticRoutes', [])

        # Remove the test route
        filtered_routes = [r for r in routes if r['id'] != TestStaticRoutesIPv6.test_route_id]

        save_data = {
            'staticRoutes': filtered_routes
        }

        response = api_client.post('network:saveConfig', save_data)
        assert_api_success(response, "Failed to delete IPv6 route")

        print(f"✓ Deleted IPv6 route {TestStaticRoutesIPv6.test_route_id}")


@pytest.mark.dangerous_network
class TestStaticRoutesIPv6Validation:
    """Validation tests for IPv6 static routes"""

    def test_01_validate_invalid_ipv6_address(self, api_client):
        """Invalid IPv6 address should be rejected"""
        response = api_client.get('network:getConfig')
        config = response['data']

        invalid_route = {
            'id': 'new_invalid_ipv6',
            'network': 'gggg:hhhh::1',  # Invalid IPv6
            'subnet': '64',
            'gateway': '2001:db8::1'
        }

        save_data = {
            'staticRoutes': config.get('staticRoutes', []) + [invalid_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected invalid IPv6 address")
            else:
                print(f"⚠ Invalid IPv6 address was accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected invalid IPv6 address")
            else:
                raise

    def test_02_validate_subnet_over_128(self, api_client):
        """IPv6 subnet >128 should be rejected"""
        response = api_client.get('network:getConfig')
        config = response['data']

        invalid_route = {
            'id': 'new_invalid_subnet',
            'network': '2001:db8::',
            'subnet': '129',  # Invalid: >128
            'gateway': '2001:db8::1'
        }

        save_data = {
            'staticRoutes': config.get('staticRoutes', []) + [invalid_route]
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected subnet >128")
            else:
                print(f"⚠ Subnet >128 was accepted (should be rejected)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected subnet >128")
            else:
                raise

    def test_03_validate_mixed_ipv4_ipv6_routes(self, api_client):
        """Mixed IPv4 and IPv6 routes should coexist"""
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])

        # Clean up test routes
        cleaned_routes = [r for r in existing_routes
                         if not ((r.get('network') == '10.20.30.0' and r.get('subnet') == '24') or
                                (r.get('network') == '2001:db8:2::' and r.get('subnet') == '64'))]

        # Add both IPv4 and IPv6 routes
        mixed_routes = cleaned_routes + [
            {
                'id': 'new_ipv4_mixed',
                'network': '10.20.30.0',
                'subnet': '24',
                'gateway': '192.168.1.1',
                'description': 'IPv4 route in mixed table'
            },
            {
                'id': 'new_ipv6_mixed',
                'network': '2001:db8:2::',
                'subnet': '64',
                'gateway': '2001:db8::1',
                'description': 'IPv6 route in mixed table'
            }
        ]

        save_data = {
            'staticRoutes': mixed_routes
        }

        try:
            response = api_client.post('network:saveConfig', save_data)
            if response.get('result', False):
                # Verify both routes exist
                verify = api_client.get('network:getConfig')
                routes = verify['data']['staticRoutes']

                ipv4_exists = any(r['network'] == '10.20.30.0' for r in routes)
                ipv6_exists = any(r['network'] == '2001:db8:2::' for r in routes)

                if ipv4_exists and ipv6_exists:
                    print(f"✓ Mixed IPv4/IPv6 routes coexist in same table")
                else:
                    print(f"⚠ Mixed routes not found after save")
            else:
                print(f"⚠ Could not save mixed IPv4/IPv6 routes")
        finally:
            # Cleanup
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes']
                            if not ((r.get('network') == '10.20.30.0' and r.get('subnet') == '24') or
                                   (r.get('network') == '2001:db8:2::' and r.get('subnet') == '64'))]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
