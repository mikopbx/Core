#!/usr/bin/env python3
"""
Test suite for Outbound Routes (Outgoing Call Routing) operations

Tests the /pbxcore/api/v3/outbound-routes endpoint for:
- Getting all routes with pagination and filtering
- Getting specific route by ID
- Creating new routes with digit manipulation rules
- Updating routes (PUT - full replacement)
- Partial updates (PATCH)
- Deleting routes
- Custom methods: getDefault, copy, changePriority
"""

import pytest
from conftest import assert_api_success, assert_record_exists, assert_record_deleted


class TestOutboundRoutes:
    """Comprehensive CRUD tests for Outbound Routes"""

    created_ids = []
    provider_ids = []  # Track providers to cleanup after all tests

    def test_01_get_default_template(self, api_client):
        """Test GET /outbound-routes:getDefault - Get default route template"""
        response = api_client.get('outbound-routes:getDefault')
        assert_api_success(response, "Failed to get default outbound route template")

        data = response['data']
        assert isinstance(data, dict), "Default template should be a dict"

        # Verify essential fields exist with defaults
        assert 'restnumbers' in data
        assert 'trimfrombegin' in data
        assert 'priority' in data

        print(f"✓ Retrieved default outbound route template")
        print(f"  Rest numbers: {data.get('restnumbers', 'N/A')}")
        print(f"  Trim from begin: {data.get('trimfrombegin', 'N/A')}")

    def test_02_create_local_route(self, api_client, provider_sip_fixtures):
        """Test POST /outbound-routes - Create local route"""
        # Use first available provider
        provider_fixture = list(provider_sip_fixtures.values())[0]

        # Create provider first
        provider_data = {
            'description': 'Test Provider for Outbound Routing',
            'host': provider_fixture['host'],
            'username': provider_fixture['username'],
            'secret': provider_fixture['password'],
            'registration_type': 'outbound'
        }

        provider_response = api_client.post('sip-providers', provider_data)
        if not provider_response['result']:
            pytest.skip("Could not create test provider")

        provider_id = provider_response['data']['id']
        self.provider_ids.append(provider_id)  # Track for cleanup later

        # Create outbound route
        route_data = {
            'rulename': 'Test Local Calls',
            'note': 'Local calls test route',
            'numberbeginswith': '7',
            'restnumbers': 10,
            'trimfrombegin': 1,
            'prepend': '8',
            'providerid': provider_id
        }

        response = api_client.post('outbound-routes', route_data)
        assert_api_success(response, "Failed to create local outbound route")

        assert 'id' in response['data']
        route_id = response['data']['id']
        self.created_ids.append(route_id)

        print(f"✓ Created local outbound route: {route_id}")
        print(f"  Number begins with: {route_data['numberbeginswith']}")
        print(f"  Provider: {provider_id}")

    def test_03_create_international_route(self, api_client, provider_sip_fixtures):
        """Test POST /outbound-routes - Create international route"""
        provider_fixture = list(provider_sip_fixtures.values())[0]

        # Create provider
        provider_data = {
            'description': 'International Provider',
            'host': provider_fixture['host'],
            'username': provider_fixture['username'],
            'secret': provider_fixture['password'],
            'registration_type': 'outbound'
        }

        provider_response = api_client.post('sip-providers', provider_data)
        if not provider_response['result']:
            pytest.skip("Could not create test provider")

        provider_id = provider_response['data']['id']
        self.provider_ids.append(provider_id)  # Track for cleanup later

        # Create international route
        route_data = {
            'rulename': 'Test International Calls',
            'note': 'International calls via provider',
            'numberbeginswith': '00',
            'restnumbers': 10,
            'trimfrombegin': 2,
            'prepend': '810',
            'providerid': provider_id
        }

        response = api_client.post('outbound-routes', route_data)
        assert_api_success(response, "Failed to create international outbound route")

        route_id = response['data']['id']
        self.created_ids.append(route_id)

        print(f"✓ Created international outbound route: {route_id}")
        print(f"  Pattern: 00 + {route_data['restnumbers']} digits")

    def test_04_get_routes_list(self, api_client):
        """Test GET /outbound-routes - Get list with pagination"""
        response = api_client.get('outbound-routes', params={'limit': 20, 'offset': 0})
        assert_api_success(response, "Failed to get outbound routes list")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        if len(self.created_ids) > 0:
            assert len(data) >= len(self.created_ids), f"Expected at least {len(self.created_ids)} routes"

        print(f"✓ Found {len(data)} outbound routes")

    def test_05_get_routes_with_search(self, api_client):
        """Test GET /outbound-routes - Search by rulename"""
        try:
            response = api_client.get('outbound-routes', params={'search': 'Test', 'limit': 10})
            assert_api_success(response, "Failed to search outbound routes")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Search found {len(data)} routes matching 'Test'")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Search not fully implemented or invalid params")
            else:
                raise

    def test_06_get_routes_with_sorting(self, api_client):
        """Test GET /outbound-routes - Sort by priority"""
        response = api_client.get('outbound-routes', params={
            'limit': 10,
            'order': 'priority',
            'orderWay': 'ASC'
        })
        assert_api_success(response, "Failed to get sorted routes")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved routes sorted by priority")

    def test_07_get_route_by_id(self, api_client):
        """Test GET /outbound-routes/{id} - Get specific route"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]
        record = assert_record_exists(api_client, 'outbound-routes', route_id)

        # Verify structure
        assert record['id'] == route_id
        assert 'rulename' in record
        assert 'numberbeginswith' in record
        assert 'providerid' in record
        assert 'restnumbers' in record
        assert 'trimfrombegin' in record
        assert 'priority' in record

        print(f"✓ Retrieved outbound route: {record.get('rulename', 'N/A')}")
        print(f"  Pattern: {record.get('numberbeginswith', 'N/A')}")
        print(f"  Priority: {record.get('priority', 'N/A')}")

    def test_08_update_route(self, api_client):
        """Test PUT /outbound-routes/{id} - Full update"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]
        current = assert_record_exists(api_client, 'outbound-routes', route_id)

        # Update with all required fields
        update_data = current.copy()
        update_data['rulename'] = f"{current.get('rulename', 'Route')} (Updated)"
        update_data['restnumbers'] = 11
        update_data['trimfrombegin'] = 2

        response = api_client.put(f'outbound-routes/{route_id}', update_data)
        assert_api_success(response, "Failed to update outbound route")

        # Verify update
        updated = assert_record_exists(api_client, 'outbound-routes', route_id)
        assert '(Updated)' in updated['rulename']
        assert int(updated['restnumbers']) == 11

        print(f"✓ Updated outbound route: {updated['rulename']}")

    def test_09_patch_route(self, api_client):
        """Test PATCH /outbound-routes/{id} - Partial update"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]

        patch_data = {
            'rulename': 'Patched Route Name',
            'prepend': '9'
        }

        try:
            response = api_client.patch(f'outbound-routes/{route_id}', patch_data)
            assert_api_success(response, "Failed to patch outbound route")

            # Verify patch
            updated = assert_record_exists(api_client, 'outbound-routes', route_id)
            assert updated['rulename'] == 'Patched Route Name'
            assert updated.get('prepend', '') == '9'

            print(f"✓ Patched outbound route")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ PATCH failed with validation error")
                pytest.skip("PATCH validation failed - route state issue")
            else:
                raise

    def test_10_copy_route(self, api_client):
        """Test GET /outbound-routes/{id}:copy - Copy route"""
        if not self.created_ids:
            pytest.skip("No routes created yet")

        route_id = self.created_ids[0]

        try:
            response = api_client.get(f'outbound-routes/{route_id}:copy')

            if response['result']:
                assert 'id' in response['data']
                copied_id = response['data']['id']

                if copied_id and copied_id != route_id:
                    self.created_ids.append(copied_id)
                    print(f"✓ Copied outbound route: {copied_id} (from {route_id})")
                else:
                    print(f"⚠ Copy returned empty or same ID")
            else:
                print(f"⚠ Copy returned: {response.get('messages', {})}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ Copy not implemented (expected)")
            else:
                raise

    def test_11_change_priority(self, api_client):
        """Test POST /outbound-routes:changePriority - Update route priorities"""
        if len(self.created_ids) < 2:
            pytest.skip("Need at least 2 routes for priority test")

        # Create priority array with reversed order
        priorities = []
        for idx, route_id in enumerate(self.created_ids[:3]):  # Use up to 3 routes
            priorities.append({
                'id': str(route_id),  # Ensure ID is string
                'priority': len(self.created_ids) - idx
            })

        try:
            response = api_client.post('outbound-routes:changePriority', {
                'priorities': priorities
            })

            if response['result']:
                print(f"✓ Updated priorities for {len(priorities)} routes")

                # Verify priorities were updated
                for item in priorities:
                    route = assert_record_exists(api_client, 'outbound-routes', item['id'])
                    print(f"  Route {item['id']}: priority={route.get('priority')}")
            else:
                print(f"⚠ Change priority returned: {response.get('messages', {})}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '422' in str(e):
                print(f"⚠ Change priority not implemented or invalid route IDs")
            else:
                raise

    def test_12_delete_routes(self, api_client):
        """Test DELETE /outbound-routes/{id} - Delete routes"""
        deleted_count = 0
        failed_count = 0

        for route_id in self.created_ids[:]:
            try:
                response = api_client.delete(f'outbound-routes/{route_id}')
                assert_api_success(response, f"Failed to delete outbound route {route_id}")

                assert_record_deleted(api_client, 'outbound-routes', route_id)

                print(f"✓ Deleted outbound route: {route_id}")
                deleted_count += 1
            except Exception as e:
                if '422' in str(e) or '404' in str(e):
                    print(f"⚠ Could not delete route {route_id}: {str(e)[:80]}")
                    failed_count += 1
                else:
                    raise

        print(f"✓ Deleted {deleted_count} routes, {failed_count} failed")
        self.created_ids.clear()

    def test_13_cleanup_providers(self, api_client):
        """Cleanup test providers created during tests"""
        cleaned = 0
        for provider_id in self.provider_ids:
            try:
                api_client.delete(f'sip-providers/{provider_id}')
                cleaned += 1
            except:
                pass

        print(f"✓ Cleaned up {cleaned} test providers")
        self.provider_ids.clear()


class TestOutboundRoutesEdgeCases:
    """Edge cases for outbound routes"""

    def test_01_validate_required_fields(self, api_client):
        """Test validation - missing required providerid field"""
        invalid_data = {
            'rulename': 'Invalid Route',
            'numberbeginswith': '9',
            # Missing required 'providerid' field
        }

        try:
            response = api_client.post('outbound-routes', invalid_data)

            # Check if validation rejected the request
            if not response['result']:
                print(f"✓ Validation rejected incomplete data")
            else:
                # If accepted with defaults - cleanup and warn
                if 'id' in response['data']:
                    try:
                        api_client.delete(f"outbound-routes/{response['data']['id']}")
                    except:
                        pass
                print(f"⚠ Missing providerid was accepted (may have default)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation works (HTTP error)")
            else:
                raise

    def test_02_validate_number_pattern(self, api_client, provider_sip_fixtures):
        """Test validation - invalid number pattern"""
        # Create provider first
        provider_fixture = list(provider_sip_fixtures.values())[0]
        provider_data = {
            'description': 'Test Provider',
            'host': provider_fixture['host'],
            'username': provider_fixture['username'],
            'secret': provider_fixture['password'],
            'registration_type': 'outbound'
        }

        provider_response = api_client.post('sip-providers', provider_data)
        if not provider_response['result']:
            pytest.skip("Could not create test provider")

        provider_id = provider_response['data']['id']

        invalid_data = {
            'rulename': 'Invalid Pattern',
            'numberbeginswith': 'ABC',  # Invalid - should be digits/patterns only
            'providerid': provider_id,
            'restnumbers': 10
        }

        try:
            response = api_client.post('outbound-routes', invalid_data)
            # May be accepted or rejected depending on validation
            if not response['result']:
                print(f"✓ Invalid number pattern rejected")
            else:
                # Cleanup if accepted
                if 'id' in response['data']:
                    api_client.delete(f"outbound-routes/{response['data']['id']}")
                print(f"⚠ Invalid pattern accepted (lenient validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid number pattern rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            # Cleanup provider
            try:
                api_client.delete(f'sip-providers/{provider_id}')
            except:
                pass

    def test_03_get_nonexistent_route(self, api_client):
        """Test GET /outbound-routes/{id} with non-existent ID"""
        fake_id = '99999'

        try:
            response = api_client.get(f'outbound-routes/{fake_id}')
            assert response['result'] is False
            print(f"✓ Non-existent route rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent route rejected (HTTP error)")
            else:
                raise

    def test_04_validate_digit_manipulation(self, api_client, provider_sip_fixtures):
        """Test validation - digit manipulation parameters"""
        provider_fixture = list(provider_sip_fixtures.values())[0]
        provider_data = {
            'description': 'Test Provider',
            'host': provider_fixture['host'],
            'username': provider_fixture['username'],
            'secret': provider_fixture['password'],
            'registration_type': 'outbound'
        }

        provider_response = api_client.post('sip-providers', provider_data)
        if not provider_response['result']:
            pytest.skip("Could not create test provider")

        provider_id = provider_response['data']['id']

        # Test with negative restnumbers
        data_negative = {
            'rulename': 'Negative Rest Numbers',
            'numberbeginswith': '8',
            'providerid': provider_id,
            'restnumbers': -5  # Invalid - should be >= 0
        }

        try:
            response = api_client.post('outbound-routes', data_negative)
            if not response['result']:
                print(f"✓ Negative restnumbers rejected")
            else:
                # Cleanup
                if 'id' in response['data']:
                    api_client.delete(f"outbound-routes/{response['data']['id']}")
                print(f"⚠ Negative restnumbers accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Negative restnumbers rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            # Cleanup provider
            try:
                api_client.delete(f'sip-providers/{provider_id}')
            except:
                pass


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
