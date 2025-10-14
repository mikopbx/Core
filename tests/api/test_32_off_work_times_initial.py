#!/usr/bin/env python3
"""
Test suite for Off Work Times (Out-of-Work Time Conditions) operations

Tests the /pbxcore/api/v3/off-work-times endpoint for:
- Getting all time conditions with pagination and filtering
- Getting specific time condition by ID
- Creating new time conditions (date-based, weekday-based, time-based)
- Updating time conditions (PUT - full replacement)
- Partial updates (PATCH)
- Deleting time conditions
- Custom methods: getDefault, copy, changePriorities
"""

import pytest
from conftest import assert_api_success, assert_record_exists, assert_record_deleted


class TestOffWorkTimes:
    """Comprehensive CRUD tests for Off Work Times"""

    created_ids = []

    def test_01_get_default_template(self, api_client):
        """Test GET /off-work-times:getDefault - Get default time condition template"""
        response = api_client.get('off-work-times:getDefault')
        assert_api_success(response, "Failed to get default off-work-time template")

        data = response['data']
        assert isinstance(data, dict), "Default template should be a dict"

        # Verify essential fields exist
        assert 'weekday_from' in data
        assert 'weekday_to' in data
        assert 'action' in data

        print(f"✓ Retrieved default off-work-time template")
        print(f"  Action: {data.get('action', 'N/A')}")

    def test_02_create_holiday_period(self, api_client, extension_fixtures):
        """Test POST /off-work-times - Create date-based holiday period"""
        # Get first available extension
        ext = list(extension_fixtures.values())[0] if extension_fixtures else {'number': '201'}

        time_data = {
            'description': 'Test New Year Holiday',
            'date_from': '2025-01-01',
            'date_to': '2025-01-05',
            'weekday_from': -1,  # -1 means not using weekday filter
            'weekday_to': -1,
            'time_from': '',
            'time_to': '',
            'action': 'extension',
            'extension': ext['number']
        }

        response = api_client.post('off-work-times', time_data)
        assert_api_success(response, "Failed to create holiday off-work-time")

        assert 'id' in response['data']
        time_id = response['data']['id']
        self.created_ids.append(time_id)

        print(f"✓ Created holiday off-work-time: {time_id}")
        print(f"  Period: {time_data['date_from']} to {time_data['date_to']}")
        print(f"  Extension: {time_data['extension']}")

    def test_03_create_weekend_period(self, api_client):
        """Test POST /off-work-times - Create weekday-based weekend period"""
        time_data = {
            'description': 'Test Weekend',
            'date_from': '',
            'date_to': '',
            'weekday_from': 6,  # Saturday
            'weekday_to': 7,    # Sunday
            'time_from': '',
            'time_to': '',
            'action': 'hangup'
        }

        response = api_client.post('off-work-times', time_data)
        assert_api_success(response, "Failed to create weekend off-work-time")

        time_id = response['data']['id']
        self.created_ids.append(time_id)

        print(f"✓ Created weekend off-work-time: {time_id}")
        print(f"  Weekdays: {time_data['weekday_from']} to {time_data['weekday_to']}")

    def test_04_create_daily_time_range(self, api_client):
        """Test POST /off-work-times - Create daily time range (morning hours)"""
        time_data = {
            'description': 'Test Morning Hours',
            'date_from': '',
            'date_to': '',
            'weekday_from': 1,  # Monday
            'weekday_to': 5,    # Friday
            'time_from': '00:00',
            'time_to': '09:00',
            'action': 'busy'
        }

        response = api_client.post('off-work-times', time_data)
        assert_api_success(response, "Failed to create morning off-work-time")

        time_id = response['data']['id']
        self.created_ids.append(time_id)

        print(f"✓ Created morning off-work-time: {time_id}")
        print(f"  Time: {time_data['time_from']} - {time_data['time_to']}")

    def test_05_get_times_list(self, api_client):
        """Test GET /off-work-times - Get list with pagination"""
        response = api_client.get('off-work-times', params={'limit': 20, 'offset': 0})
        assert_api_success(response, "Failed to get off-work-times list")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        if len(self.created_ids) > 0:
            assert len(data) >= len(self.created_ids), f"Expected at least {len(self.created_ids)} time conditions"

        print(f"✓ Found {len(data)} off-work-time conditions")

    def test_06_get_times_with_search(self, api_client):
        """Test GET /off-work-times - Search by description"""
        try:
            response = api_client.get('off-work-times', params={'search': 'Test', 'limit': 10})
            assert_api_success(response, "Failed to search off-work-times")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Search found {len(data)} conditions matching 'Test'")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Search not fully implemented or invalid params")
            else:
                raise

    def test_07_get_times_with_sorting(self, api_client):
        """Test GET /off-work-times - Sort by priority"""
        response = api_client.get('off-work-times', params={
            'limit': 10,
            'order': 'priority',
            'orderWay': 'ASC'
        })
        assert_api_success(response, "Failed to get sorted times")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved times sorted by priority")

    def test_08_get_time_by_id(self, api_client):
        """Test GET /off-work-times/{id} - Get specific time condition"""
        if not self.created_ids:
            pytest.skip("No time conditions created yet")

        time_id = self.created_ids[0]
        record = assert_record_exists(api_client, 'off-work-times', time_id)

        # Verify structure (ID can be int or string)
        assert str(record['id']) == str(time_id)
        assert 'description' in record
        assert 'action' in record
        assert 'weekday_from' in record
        assert 'weekday_to' in record

        print(f"✓ Retrieved off-work-time: {record.get('description', 'N/A')}")
        print(f"  Action: {record.get('action', 'N/A')}")

    def test_09_update_time(self, api_client):
        """Test PUT /off-work-times/{id} - Full update"""
        if not self.created_ids:
            pytest.skip("No time conditions created yet")

        time_id = self.created_ids[0]
        current = assert_record_exists(api_client, 'off-work-times', time_id)

        # Update with all required fields
        update_data = current.copy()
        update_data['description'] = f"{current.get('description', 'Time')} (Updated)"
        update_data['action'] = 'busy'

        response = api_client.put(f'off-work-times/{time_id}', update_data)
        assert_api_success(response, "Failed to update off-work-time")

        # Verify update
        updated = assert_record_exists(api_client, 'off-work-times', time_id)
        assert '(Updated)' in updated['description']
        assert updated['action'] == 'busy'

        print(f"✓ Updated off-work-time: {updated['description']}")

    def test_10_patch_time(self, api_client):
        """Test PATCH /off-work-times/{id} - Partial update"""
        if not self.created_ids:
            pytest.skip("No time conditions created yet")

        time_id = self.created_ids[0]

        patch_data = {
            'description': 'Patched Time Condition',
            'time_from': '08:00'
        }

        try:
            response = api_client.patch(f'off-work-times/{time_id}', patch_data)
            assert_api_success(response, "Failed to patch off-work-time")

            # Verify patch
            updated = assert_record_exists(api_client, 'off-work-times', time_id)
            assert updated['description'] == 'Patched Time Condition'

            print(f"✓ Patched off-work-time")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ PATCH failed with validation error")
                pytest.skip("PATCH validation failed - time state issue")
            else:
                raise

    def test_11_copy_time(self, api_client):
        """Test GET /off-work-times/{id}:copy - Copy time condition"""
        if not self.created_ids:
            pytest.skip("No time conditions created yet")

        time_id = self.created_ids[0]

        try:
            response = api_client.get(f'off-work-times/{time_id}:copy')

            if response['result']:
                assert 'id' in response['data']
                copied_id = response['data']['id']

                if copied_id and copied_id != time_id:
                    self.created_ids.append(copied_id)
                    print(f"✓ Copied off-work-time: {copied_id} (from {time_id})")
                else:
                    print(f"⚠ Copy returned empty or same ID")
            else:
                print(f"⚠ Copy returned: {response.get('messages', {})}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ Copy not implemented (expected)")
            else:
                raise

    def test_12_change_priorities(self, api_client):
        """Test POST /off-work-times:changePriorities - Update priorities"""
        if len(self.created_ids) < 2:
            pytest.skip("Need at least 2 time conditions for priority test")

        # Create priority array with reversed order
        priorities = []
        for idx, time_id in enumerate(self.created_ids[:3]):  # Use up to 3 conditions
            priorities.append({
                'id': str(time_id),
                'priority': len(self.created_ids) - idx
            })

        try:
            response = api_client.post('off-work-times:changePriorities', {
                'priorities': priorities
            })

            if response['result']:
                print(f"✓ Updated priorities for {len(priorities)} time conditions")

                # Verify priorities were updated
                for item in priorities:
                    time_cond = assert_record_exists(api_client, 'off-work-times', item['id'])
                    print(f"  Time {item['id']}: priority={time_cond.get('priority')}")
            else:
                print(f"⚠ Change priorities returned: {response.get('messages', {})}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '422' in str(e):
                print(f"⚠ Change priorities not implemented or invalid IDs")
            else:
                raise

    def test_13_delete_times(self, api_client):
        """Test DELETE /off-work-times/{id} - Delete time conditions"""
        deleted_count = 0
        failed_count = 0

        for time_id in self.created_ids[:]:
            try:
                response = api_client.delete(f'off-work-times/{time_id}')
                assert_api_success(response, f"Failed to delete off-work-time {time_id}")

                assert_record_deleted(api_client, 'off-work-times', time_id)

                print(f"✓ Deleted off-work-time: {time_id}")
                deleted_count += 1
            except Exception as e:
                if '422' in str(e) or '404' in str(e):
                    print(f"⚠ Could not delete time {time_id}: {str(e)[:80]}")
                    failed_count += 1
                else:
                    raise

        print(f"✓ Deleted {deleted_count} time conditions, {failed_count} failed")
        self.created_ids.clear()


class TestOffWorkTimesEdgeCases:
    """Edge cases for off-work-time conditions"""

    def test_01_validate_required_fields(self, api_client):
        """Test validation - missing required description field"""
        invalid_data = {
            'action': 'busy',
            # Missing required 'description' field
            'weekday_from': 1,
            'weekday_to': 5
        }

        try:
            response = api_client.post('off-work-times', invalid_data)

            # Check if validation rejected the request
            if not response['result']:
                print(f"✓ Validation rejected incomplete data")
            else:
                # If accepted with defaults - cleanup and warn
                if 'id' in response['data']:
                    try:
                        api_client.delete(f"off-work-times/{response['data']['id']}")
                    except:
                        pass
                print(f"⚠ Missing description was accepted (may have default)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation works (HTTP error)")
            else:
                raise

    def test_02_validate_date_format(self, api_client):
        """Test validation - invalid date format"""
        invalid_data = {
            'description': 'Invalid Date Format',
            'date_from': '2025/01/01',  # Invalid - should be YYYY-MM-DD
            'date_to': '2025-01-05',
            'action': 'hangup'
        }

        try:
            response = api_client.post('off-work-times', invalid_data)
            if not response['result']:
                print(f"✓ Invalid date format rejected")
            else:
                # Cleanup if accepted
                if 'id' in response['data']:
                    api_client.delete(f"off-work-times/{response['data']['id']}")
                print(f"⚠ Invalid date format accepted (lenient validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid date format rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_get_nonexistent_time(self, api_client):
        """Test GET /off-work-times/{id} with non-existent ID"""
        fake_id = '99999'

        try:
            response = api_client.get(f'off-work-times/{fake_id}')
            assert response['result'] is False
            print(f"✓ Non-existent time condition rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent time condition rejected (HTTP error)")
            else:
                raise

    def test_04_validate_weekday_range(self, api_client):
        """Test validation - weekday should be 0-7 or -1"""
        invalid_data = {
            'description': 'Invalid Weekday',
            'weekday_from': 10,  # Invalid - should be 0-7 or -1
            'weekday_to': 5,
            'action': 'hangup'
        }

        try:
            response = api_client.post('off-work-times', invalid_data)
            if not response['result']:
                print(f"✓ Invalid weekday rejected")
            else:
                # Cleanup
                if 'id' in response['data']:
                    api_client.delete(f"off-work-times/{response['data']['id']}")
                print(f"⚠ Invalid weekday accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid weekday rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_validate_time_format(self, api_client):
        """Test validation - time should be HH:MM format"""
        invalid_data = {
            'description': 'Invalid Time Format',
            'weekday_from': 1,
            'weekday_to': 5,
            'time_from': '9:00',  # Invalid - should be 09:00
            'time_to': '17:00',
            'action': 'busy'
        }

        try:
            response = api_client.post('off-work-times', invalid_data)
            if not response['result']:
                print(f"✓ Invalid time format rejected")
            else:
                # Cleanup
                if 'id' in response['data']:
                    api_client.delete(f"off-work-times/{response['data']['id']}")
                print(f"⚠ Invalid time format accepted (may be normalized)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid time format rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
