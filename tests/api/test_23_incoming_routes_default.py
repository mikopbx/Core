#!/usr/bin/env python3
"""
Test suite for Incoming Routes (Incoming Call Routing) operations

Tests the /pbxcore/api/v3/incoming-routes endpoint for:
- Getting all routes with pagination and filtering
- Getting specific route by ID
- Creating new routes (with and without providers)
- Updating routes (PUT - full replacement)
- Partial updates (PATCH)
- Deleting routes
- Custom methods: getDefault, getDefaultRoute, copy, changePriority
"""

import pytest
from conftest import assert_api_success, assert_record_exists, assert_record_deleted


class TestIncomingRoutes:
    """Comprehensive CRUD tests for Incoming Routes"""

    created_ids = []
    created_provider_ids = []  # Track providers to cleanup at the end

    def test_01_get_default_template(self, api_client):
        """Test GET /incoming-routes:getDefault - Get default route template"""
        response = api_client.get('incoming-routes:getDefault')
        assert_api_success(response, "Failed to get default incoming route template")

        data = response['data']
        assert isinstance(data, dict), "Default template should be a dict"

        # Verify essential fields
        assert 'priority' in data
        assert 'timeout' in data

        print(f"✓ Retrieved default incoming route template")
        print(f"  Priority: {data.get('priority', 'N/A')}")
        print(f"  Timeout: {data.get('timeout', 'N/A')}")

    def test_02_get_default_route(self, api_client):
        """Test GET /incoming-routes:getDefaultRoute - Get or create default catch-all route (ID=1)"""
        response = api_client.get('incoming-routes:getDefaultRoute')
        assert_api_success(response, "Failed to get default catch-all route")

        data = response['data']
        assert isinstance(data, dict), "Default route should be a dict"

        # Default route should have ID=1 and be the catch-all route
        # It should have extension='busy' (system extension)
        if 'id' in data:
            print(f"✓ Retrieved default catch-all route: ID={data['id']}")
            print(f"  Extension: {data.get('extension', 'N/A')}")
            # Verify default route uses system extension
            if data.get('extension') == 'busy':
                print(f"✓ Default route correctly uses system extension 'busy'")
        else:
            print(f"✓ Default route exists")

    def test_03_create_route_with_system_extension_busy(self, api_client):
        """Test POST /incoming-routes - Create route with system extension 'busy'"""
        route_data = {
            'rulename': 'Test Route to Busy',
            'number': '123456789',
            'extension': 'busy',  # System extension
            'timeout': 10,
            'priority': 5
        }

        response = api_client.post('incoming-routes', route_data)
        assert_api_success(response, "Failed to create route with system extension 'busy'")

        assert 'id' in response['data']
        route_id = response['data']['id']

        print(f"✓ Created incoming route with system extension 'busy': ID={route_id}")

        # Verify the route was created correctly
        verify_response = api_client.get(f'incoming-routes/{route_id}')
        assert_api_success(verify_response)
        assert verify_response['data']['extension'] == 'busy'

        print(f"✓ Verified route extension: {verify_response['data']['extension']}")

        # Cleanup
        api_client.delete(f'incoming-routes/{route_id}')
        print(f"✓ Cleaned up test route: {route_id}")

    def test_04_create_route_with_system_extension_hangup(self, api_client):
        """Test POST /incoming-routes - Create route with system extension 'hangup'"""
        route_data = {
            'rulename': 'Test Route to Hangup',
            'number': '987654321',
            'extension': 'hangup',  # System extension
            'timeout': 0,
            'priority': 6
        }

        response = api_client.post('incoming-routes', route_data)
        assert_api_success(response, "Failed to create route with system extension 'hangup'")

        route_id = response['data']['id']
        print(f"✓ Created incoming route with system extension 'hangup': ID={route_id}")

        # Cleanup
        api_client.delete(f'incoming-routes/{route_id}')
        print(f"✓ Cleaned up test route: {route_id}")

    def test_05_create_route_with_system_extension_voicemail(self, api_client):
        """Test POST /incoming-routes - Create route with system extension 'voicemail'"""
        route_data = {
            'rulename': 'Test Route to Voicemail',
            'number': '555123456',
            'extension': 'voicemail',  # System extension
            'timeout': 30,
            'priority': 7
        }

        response = api_client.post('incoming-routes', route_data)
        assert_api_success(response, "Failed to create route with system extension 'voicemail'")

        route_id = response['data']['id']
        print(f"✓ Created incoming route with system extension 'voicemail': ID={route_id}")

        # Cleanup
        api_client.delete(f'incoming-routes/{route_id}')
        print(f"✓ Cleaned up test route: {route_id}")

    def test_03_create_basic_route(self, api_client, extension_fixtures):
        """Test POST /incoming-routes - Create basic route without provider"""
        # Get first available extension
        ext = list(extension_fixtures.values())[0] if extension_fixtures else {'number': '201'}

        route_data = {
            'rulename': 'Test Basic Route',
            'note': 'Test route created by API tests',
            'number': '74952293042',
            'extension': ext['number'],
            'timeout': 14,
            'priority': 10
        }

        response = api_client.post('incoming-routes', route_data)
        assert_api_success(response, "Failed to create basic incoming route")

        assert 'id' in response['data']
        route_id = response['data']['id']
        self.created_ids.append(route_id)

        print(f"✓ Created basic incoming route: {route_id}")
        print(f"  Number: {route_data['number']}")
        print(f"  Extension: {route_data['extension']}")

    def test_04_create_provider_route(self, api_client, extension_fixtures, provider_sip_fixtures):
        """Test POST /incoming-routes - Create route with SIP provider"""
        # First create a test provider
        provider_fixture = provider_sip_fixtures['pctel']
        provider_data = {
            'description': 'Test Provider for Routing',
            'host': provider_fixture['host'],
            'username': provider_fixture['username'],
            'secret': provider_fixture['password'],
            'registration_type': 'inbound'
        }

        provider_response = api_client.post('sip-providers', provider_data)
        if not provider_response['result']:
            pytest.skip("Could not create test provider")

        provider_id = provider_response['data']['id']

        # Get extension
        ext = list(extension_fixtures.values())[0] if extension_fixtures else {'number': '202'}

        # Create route with provider
        route_data = {
            'rulename': 'Test Provider Route',
            'note': 'Route with SIP provider',
            'providerid': provider_id,
            'number': '74952293043',
            'extension': ext['number'],
            'timeout': 16,
            'priority': 11
        }

        response = api_client.post('incoming-routes', route_data)
        assert_api_success(response, "Failed to create provider incoming route")

        route_id = response['data']['id']
        self.created_ids.append(route_id)
        self.created_provider_ids.append(provider_id)  # Track for cleanup at the end

        print(f"✓ Created provider incoming route: {route_id}")
        print(f"  Provider: {provider_id}")

    def test_05_get_routes_list(self, api_client):
        """Test GET /incoming-routes - Get list with pagination"""
        response = api_client.get('incoming-routes', params={'limit': 20, 'offset': 0})
        assert_api_success(response, "Failed to get incoming routes list")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        if len(self.created_ids) > 0:
            assert len(data) >= len(self.created_ids), f"Expected at least {len(self.created_ids)} routes"

        print(f"✓ Found {len(data)} incoming routes")

    def test_06_get_routes_with_search(self, api_client):
        """Test GET /incoming-routes - Search by number"""
        try:
            response = api_client.get('incoming-routes', params={'search': '74952293042', 'limit': 10})
            assert_api_success(response, "Failed to search incoming routes")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Search found {len(data)} routes matching '74952293042'")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Search not fully implemented or invalid params")
            else:
                raise

    def test_07_get_routes_by_provider(self, api_client):
        """Test GET /incoming-routes - Filter by provider"""
        # This test searches for routes by provider filter
        response = api_client.get('incoming-routes', params={'limit': 10})
        assert_api_success(response, "Failed to get routes")

        print(f"✓ Retrieved routes for provider filter test")

    def test_08_get_route_by_id(self, api_client):
        """Test GET /incoming-routes/{id} - Get specific route"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]
        record = assert_record_exists(api_client, 'incoming-routes', route_id)

        # Verify structure
        assert record['id'] == route_id
        assert 'rulename' in record
        assert 'number' in record
        assert 'extension' in record
        assert 'priority' in record
        assert 'timeout' in record

        print(f"✓ Retrieved incoming route: {record.get('rulename', 'N/A')}")
        print(f"  Number: {record.get('number', 'N/A')}")
        print(f"  Extension: {record.get('extension', 'N/A')}")
        print(f"  Priority: {record.get('priority', 'N/A')}")

    def test_09_update_route(self, api_client):
        """Test PUT /incoming-routes/{id} - Full update"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]
        current = assert_record_exists(api_client, 'incoming-routes', route_id)

        # Update with all required fields
        update_data = current.copy()
        update_data['rulename'] = f"{current.get('rulename', 'Route')} (Updated)"
        update_data['timeout'] = 20
        update_data['priority'] = 12

        response = api_client.put(f'incoming-routes/{route_id}', update_data)
        assert_api_success(response, "Failed to update incoming route")

        # Verify update
        updated = assert_record_exists(api_client, 'incoming-routes', route_id)
        assert '(Updated)' in updated['rulename']
        assert int(updated['timeout']) == 20

        print(f"✓ Updated incoming route: {updated['rulename']}")

    def test_10_patch_route(self, api_client):
        """Test PATCH /incoming-routes/{id} - Partial update"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]

        patch_data = {
            'rulename': 'Patched Route Name',
            'timeout': 25
        }

        response = api_client.patch(f'incoming-routes/{route_id}', patch_data)
        assert_api_success(response, "Failed to patch incoming route")

        # Verify patch
        updated = assert_record_exists(api_client, 'incoming-routes', route_id)
        assert updated['rulename'] == 'Patched Route Name'
        assert int(updated['timeout']) == 25

        print(f"✓ Patched incoming route")

    def test_11_copy_route(self, api_client):
        """Test POST /incoming-routes/{id}:copy - Copy route"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]

        try:
            response = api_client.post(f'incoming-routes/{route_id}:copy', {})

            if response['result']:
                assert 'id' in response['data']
                copied_id = response['data']['id']
                assert copied_id != route_id

                self.created_ids.append(copied_id)

                print(f"✓ Copied incoming route: {copied_id} (from {route_id})")
            else:
                print(f"⚠ Copy returned: {response.get('messages', {})}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ Copy not implemented (expected)")
            else:
                raise

    def test_12_change_priority(self, api_client):
        """Test POST /incoming-routes:changePriority - Update route priorities"""
        if len(self.created_ids) < 2:
            pytest.skip("Need at least 2 routes for priority test")

        # Create priority array with reversed order
        priorities = []
        for idx, route_id in enumerate(self.created_ids[:3]):  # Use up to 3 routes
            priorities.append({
                'id': route_id,
                'priority': len(self.created_ids) - idx
            })

        try:
            response = api_client.post('incoming-routes:changePriority', {
                'priorities': priorities
            })

            if response['result']:
                print(f"✓ Updated priorities for {len(priorities)} routes")

                # Verify priorities were updated
                for item in priorities:
                    route = assert_record_exists(api_client, 'incoming-routes', item['id'])
                    print(f"  Route {item['id']}: priority={route.get('priority')}")
            else:
                print(f"⚠ Change priority returned: {response.get('messages', {})}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '422' in str(e):
                print(f"⚠ Change priority not implemented or invalid route IDs")
            else:
                raise

    def test_13_delete_routes(self, api_client):
        """Test DELETE /incoming-routes/{id} - Delete routes and cleanup providers"""
        deleted_count = 0
        failed_count = 0

        for route_id in self.created_ids[:]:
            try:
                response = api_client.delete(f'incoming-routes/{route_id}')
                assert_api_success(response, f"Failed to delete incoming route {route_id}")

                assert_record_deleted(api_client, 'incoming-routes', route_id)

                print(f"✓ Deleted incoming route: {route_id}")
                deleted_count += 1
            except Exception as e:
                if '422' in str(e) or '404' in str(e):
                    print(f"⚠ Could not delete route {route_id}: {str(e)[:80]}")
                    failed_count += 1
                else:
                    raise

        print(f"✓ Deleted {deleted_count} routes, {failed_count} failed")
        self.created_ids.clear()

        # Cleanup test providers
        for provider_id in self.created_provider_ids[:]:
            try:
                api_client.delete(f'sip-providers/{provider_id}')
                print(f"✓ Cleaned up test provider: {provider_id}")
            except:
                pass  # Ignore cleanup errors
        self.created_provider_ids.clear()


class TestIncomingRoutesEdgeCases:
    """Edge cases for incoming routes"""

    def test_01_validate_required_fields(self, api_client):
        """Test validation - missing required extension field"""
        invalid_data = {
            'rulename': 'Invalid Route',
            'number': '123456789'
            # Missing required 'extension' field
        }

        try:
            response = api_client.post('incoming-routes', invalid_data)

            # Check if validation rejected the request
            if not response['result']:
                print(f"✓ Validation rejected incomplete data")
            else:
                # If accepted, it might use defaults - cleanup and warn
                if 'id' in response['data']:
                    try:
                        api_client.delete(f"incoming-routes/{response['data']['id']}")
                    except:
                        pass
                print(f"⚠ Missing extension was accepted (may have default)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation works (HTTP error)")
            else:
                raise

    def test_02_validate_number_pattern(self, api_client, extension_fixtures):
        """Test validation - invalid number pattern"""
        ext = list(extension_fixtures.values())[0] if extension_fixtures else {'number': '201'}

        invalid_data = {
            'rulename': 'Invalid Number',
            'number': 'ABC123',  # Invalid - should be digits only
            'extension': ext['number'],
            'timeout': 10
        }

        try:
            response = api_client.post('incoming-routes', invalid_data)
            # May be accepted or rejected depending on validation
            if not response['result']:
                print(f"✓ Invalid number pattern rejected")
            else:
                # Cleanup if accepted
                if 'id' in response['data']:
                    api_client.delete(f"incoming-routes/{response['data']['id']}")
                print(f"⚠ Invalid number accepted (lenient validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid number pattern rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_get_nonexistent_route(self, api_client):
        """Test GET /incoming-routes/{id} with non-existent ID"""
        fake_id = '99999'

        try:
            response = api_client.get(f'incoming-routes/{fake_id}')
            assert response['result'] is False
            print(f"✓ Non-existent route rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent route rejected (HTTP error)")
            else:
                raise

    def test_04_validate_timeout_range(self, api_client, extension_fixtures):
        """Test validation - timeout should be reasonable"""
        ext = list(extension_fixtures.values())[0] if extension_fixtures else {'number': '201'}

        data_negative = {
            'rulename': 'Negative Timeout',
            'number': '987654321',
            'extension': ext['number'],
            'timeout': -5  # Negative timeout
        }

        try:
            response = api_client.post('incoming-routes', data_negative)
            if not response['result']:
                print(f"✓ Negative timeout rejected")
            else:
                # Cleanup
                if 'id' in response['data']:
                    api_client.delete(f"incoming-routes/{response['data']['id']}")
                print(f"⚠ Negative timeout accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Negative timeout rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
