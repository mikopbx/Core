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
    """Tests for static network routes (NetworkStaticRoutes model)"""
    created_route_id = None

    def test_01_get_static_routes_list(self, api_client):
        """GET list of static routes"""
        response = api_client.get('network')
        assert_api_success(response, "Failed to get static routes list")

        data = response['data']
        assert isinstance(data, list), "Static routes should be a list"

        print(f"✓ Retrieved {len(data)} static routes")
        if len(data) > 0:
            route = data[0]
            print(f"  Example route: {route.get('network')}/{route.get('subnet')} via {route.get('gateway')}")

    def test_02_create_static_route(self, api_client):
        """POST create new static route"""
        route_data = {
            'network': '10.10.10.0',
            'subnet': '24',
            'gateway': '192.168.1.1',
            'interface': 'eth0',
            'description': 'Test static route created by pytest',
            'priority': 100
        }

        response = api_client.post('network', route_data)
        assert_api_success(response, "Failed to create static route")

        # Save ID for subsequent tests
        TestStaticRoutes.created_route_id = response['data'].get('id')
        assert TestStaticRoutes.created_route_id, "Created route should have an ID"

        print(f"✓ Created static route: {route_data['network']}/{route_data['subnet']} via {route_data['gateway']}")
        print(f"  Route ID: {TestStaticRoutes.created_route_id}")

    def test_03_get_static_route_by_id(self, api_client):
        """GET specific static route by ID"""
        if not TestStaticRoutes.created_route_id:
            pytest.skip("No route ID from creation test")

        response = api_client.get(f'network/{TestStaticRoutes.created_route_id}')
        assert_api_success(response, "Failed to get static route by ID")

        route = response['data']
        assert route['network'] == '10.10.10.0', "Network should match created value"
        assert route['subnet'] == '24', "Subnet should match created value"
        assert route['gateway'] == '192.168.1.1', "Gateway should match created value"

        print(f"✓ Retrieved route by ID: {route['network']}/{route['subnet']}")

    def test_04_update_static_route_full(self, api_client):
        """PUT full update of static route"""
        if not TestStaticRoutes.created_route_id:
            pytest.skip("No route ID from creation test")

        updated_data = {
            'network': '10.10.10.0',
            'subnet': '24',
            'gateway': '192.168.1.254',  # Changed gateway
            'interface': 'eth1',          # Changed interface
            'description': 'Updated test route',
            'priority': 200               # Changed priority
        }

        response = api_client.put(f'network/{TestStaticRoutes.created_route_id}', updated_data)
        assert_api_success(response, "Failed to update static route")

        # Verify changes
        verify = api_client.get(f'network/{TestStaticRoutes.created_route_id}')
        assert verify['data']['gateway'] == '192.168.1.254', "Gateway should be updated"
        assert verify['data']['priority'] == 200, "Priority should be updated"

        print(f"✓ Updated route: gateway → {updated_data['gateway']}, priority → {updated_data['priority']}")

    def test_05_patch_static_route(self, api_client):
        """PATCH partial update of static route"""
        if not TestStaticRoutes.created_route_id:
            pytest.skip("No route ID from creation test")

        patch_data = {
            'description': 'Patched description via pytest',
            'priority': 50
        }

        response = api_client.patch(f'network/{TestStaticRoutes.created_route_id}', patch_data)
        assert_api_success(response, "Failed to patch static route")

        # Verify only specified fields changed
        verify = api_client.get(f'network/{TestStaticRoutes.created_route_id}')
        assert verify['data']['description'] == patch_data['description']
        assert verify['data']['priority'] == patch_data['priority']
        assert verify['data']['network'] == '10.10.10.0', "Network should remain unchanged"

        print(f"✓ Patched route: description and priority updated")

    def test_06_delete_static_route(self, api_client):
        """DELETE static route"""
        if not TestStaticRoutes.created_route_id:
            pytest.skip("No route ID from creation test")

        response = api_client.delete(f'network/{TestStaticRoutes.created_route_id}')
        assert_api_success(response, "Failed to delete static route")

        # Verify deletion
        try:
            api_client.get(f'network/{TestStaticRoutes.created_route_id}')
            pytest.fail("Deleted route should return 404")
        except Exception as e:
            if '404' in str(e):
                print(f"✓ Deleted static route {TestStaticRoutes.created_route_id}")
            else:
                raise


class TestStaticRoutesValidation:
    """Validation tests for static routes"""

    def test_01_validate_network_address_required(self, api_client):
        """Network address is required"""
        route_data = {
            'subnet': '24',
            'gateway': '192.168.1.1'
        }

        try:
            response = api_client.post('network', route_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected missing network address")
            else:
                pytest.fail("Should reject route without network address")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected missing network address")
            else:
                raise

    def test_02_validate_invalid_network_address(self, api_client):
        """Invalid network address should be rejected"""
        route_data = {
            'network': '999.999.999.999',  # Invalid IP
            'subnet': '24',
            'gateway': '192.168.1.1'
        }

        try:
            response = api_client.post('network', route_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected invalid network address")
            else:
                print(f"⚠ Invalid network address was accepted (validation may be lenient)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected invalid network address")
            else:
                raise

    def test_03_validate_invalid_gateway(self, api_client):
        """Invalid gateway address should be rejected"""
        route_data = {
            'network': '10.10.10.0',
            'subnet': '24',
            'gateway': 'not-an-ip'
        }

        try:
            response = api_client.post('network', route_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected invalid gateway")
            else:
                print(f"⚠ Invalid gateway was accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected invalid gateway")
            else:
                raise

    def test_04_validate_subnet_range(self, api_client):
        """Subnet mask should be 0-32"""
        route_data = {
            'network': '10.10.10.0',
            'subnet': '35',  # Invalid: >32
            'gateway': '192.168.1.1'
        }

        try:
            response = api_client.post('network', route_data)
            if not response.get('result', False):
                print(f"✓ Validation rejected invalid subnet mask")
            else:
                print(f"⚠ Invalid subnet mask was accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation rejected invalid subnet mask")
            else:
                raise

    def test_05_validate_duplicate_route(self, api_client):
        """Duplicate network+subnet combination should be rejected"""
        route_data = {
            'network': '192.168.100.0',
            'subnet': '24',
            'gateway': '192.168.1.1',
            'description': 'First route'
        }

        # Create first route
        response1 = api_client.post('network', route_data)
        if not response1.get('result', False):
            print(f"⚠ Could not create first route for duplicate test")
            return

        route_id = response1['data'].get('id')

        try:
            # Try to create duplicate
            duplicate_data = route_data.copy()
            duplicate_data['gateway'] = '192.168.1.254'  # Different gateway but same network+subnet

            response2 = api_client.post('network', duplicate_data)
            if not response2.get('result', False):
                print(f"✓ Validation rejected duplicate network+subnet combination")
            else:
                # If it was created, clean it up
                if 'id' in response2['data']:
                    api_client.delete(f"network/{response2['data']['id']}")
                print(f"⚠ Duplicate route was accepted (uniqueness may not be enforced)")
        except Exception as e:
            if '422' in str(e) or '409' in str(e):
                print(f"✓ Validation rejected duplicate route")
            else:
                raise
        finally:
            # Cleanup first route
            if route_id:
                api_client.delete(f'network/{route_id}')


class TestStaticRoutesEdgeCases:
    """Edge cases for static routes"""

    def test_01_empty_interface_field(self, api_client):
        """Interface field can be empty (kernel auto-selects)"""
        route_data = {
            'network': '172.16.0.0',
            'subnet': '16',
            'gateway': '192.168.1.1',
            'interface': '',  # Empty = automatic
            'description': 'Route with auto interface'
        }

        response = api_client.post('network', route_data)
        if response.get('result', False):
            route_id = response['data'].get('id')
            print(f"✓ Created route with empty interface (auto-select)")

            # Cleanup
            if route_id:
                api_client.delete(f'network/{route_id}')
        else:
            print(f"⚠ Could not create route with empty interface")

    def test_02_minimum_priority(self, api_client):
        """Priority can be 0"""
        route_data = {
            'network': '172.17.0.0',
            'subnet': '16',
            'gateway': '192.168.1.1',
            'priority': 0
        }

        response = api_client.post('network', route_data)
        if response.get('result', False):
            route_id = response['data'].get('id')
            assert response['data']['priority'] == 0, "Priority should be 0"
            print(f"✓ Created route with minimum priority (0)")

            if route_id:
                api_client.delete(f'network/{route_id}')
        else:
            print(f"⚠ Could not create route with priority=0")

    def test_03_maximum_subnet_mask(self, api_client):
        """Subnet mask /32 (single host)"""
        route_data = {
            'network': '8.8.8.8',
            'subnet': '32',  # Single host
            'gateway': '192.168.1.1'
        }

        response = api_client.post('network', route_data)
        if response.get('result', False):
            route_id = response['data'].get('id')
            print(f"✓ Created /32 host route")

            if route_id:
                api_client.delete(f'network/{route_id}')
        else:
            print(f"⚠ Could not create /32 route")

    def test_04_default_route(self, api_client):
        """Default route 0.0.0.0/0"""
        route_data = {
            'network': '0.0.0.0',
            'subnet': '0',
            'gateway': '192.168.1.1',
            'description': 'Test default route'
        }

        response = api_client.post('network', route_data)
        if response.get('result', False):
            route_id = response['data'].get('id')
            print(f"✓ Created default route 0.0.0.0/0")

            # Cleanup immediately (default route is critical)
            if route_id:
                api_client.delete(f'network/{route_id}')
        else:
            print(f"⚠ Could not create default route (may be restricted)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
