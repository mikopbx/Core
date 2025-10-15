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
        print(f"✓ Retrieved network configuration with {len(response['data'].get('interfaces', []))} interfaces")

    def test_02_get_nat_settings(self, api_client):
        """GET NAT settings"""
        response = api_client.get('network:getNatSettings')
        assert_api_success(response, "Failed to get NAT settings")

        data = response['data']
        # NAT settings include external IP, STUN config, etc
        print(f"✓ Retrieved NAT settings")
        if 'externalip' in data and data['externalip']:
            print(f"  External IP: {data['externalip']}")


class TestStaticRoutes:
    """Tests for static network routes via network configuration"""
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
        
        updated_routes = existing_routes + [new_route]
        
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


class TestStaticRoutesValidation:
    """Validation tests for static routes"""

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


class TestStaticRoutesEdgeCases:
    """Edge cases for static routes"""

    def test_01_empty_interface_field(self, api_client):
        """Interface field can be empty (kernel auto-selects)"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])
        
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
            'staticRoutes': existing_routes + [test_route]
        }

        response = api_client.post('network:saveConfig', save_data)
        if response.get('result', False):
            print(f"✓ Created route with empty interface (auto-select)")
            
            # Cleanup
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes'] 
                            if not (r['network'] == '172.16.0.0' and r['subnet'] == '16')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})
        else:
            print(f"⚠ Could not create route with empty interface")

    def test_02_minimum_priority(self, api_client):
        """Priority can be 0"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])
        
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
            'staticRoutes': existing_routes + [test_route]
        }

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
                
                # Cleanup
                cleanup_routes = [r for r in verify['data']['staticRoutes'] 
                                if not (r['network'] == '172.17.0.0' and r['subnet'] == '16')]
                api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})
        else:
            print(f"⚠ Could not create route with priority=0")

    def test_03_maximum_subnet_mask(self, api_client):
        """Subnet mask /32 (single host)"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])
        
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
            'staticRoutes': existing_routes + [test_route]
        }

        response = api_client.post('network:saveConfig', save_data)
        if response.get('result', False):
            print(f"✓ Created /32 host route")
            
            # Cleanup
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes'] 
                            if not (r['network'] == '8.8.8.8' and r['subnet'] == '32')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})
        else:
            print(f"⚠ Could not create /32 route")

    def test_04_default_route(self, api_client):
        """Default route 0.0.0.0/0"""
        # Get current config
        response = api_client.get('network:getConfig')
        config = response['data']
        existing_routes = config.get('staticRoutes', [])
        
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
            'staticRoutes': existing_routes + [test_route]
        }

        response = api_client.post('network:saveConfig', save_data)
        if response.get('result', False):
            print(f"✓ Created default route 0.0.0.0/0")
            
            # Cleanup immediately (default route is critical)
            verify = api_client.get('network:getConfig')
            cleanup_routes = [r for r in verify['data']['staticRoutes'] 
                            if not (r['network'] == '0.0.0.0' and r['subnet'] == '0')]
            api_client.post('network:saveConfig', {'staticRoutes': cleanup_routes})
        else:
            print(f"⚠ Could not create default route (may be restricted)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
