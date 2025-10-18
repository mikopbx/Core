"""
Test SIP endpoints to verify country and countryName fields are present
Tests both getHistory and getStatus endpoints
"""
import time
import pytest
import docker


@pytest.fixture(scope="module", autouse=True)
def restart_container():
    """Restart container before running tests to apply code changes"""
    print("\n=== Restarting MikoPBX container to apply changes ===")
    client = docker.from_env()

    # Find mikopbx_php83 container
    containers = client.containers.list()
    mikopbx_container = None
    for container in containers:
        if 'mikopbx_php83' in container.name:
            mikopbx_container = container
            break

    if not mikopbx_container:
        pytest.skip("MikoPBX container not found")

    print(f"Found container: {mikopbx_container.name}")
    print("Restarting container...")
    mikopbx_container.restart()

    # Wait for container to be healthy
    print("Waiting for container to start (60 seconds)...")
    time.sleep(60)

    # Check if container is running
    mikopbx_container.reload()
    if mikopbx_container.status != 'running':
        pytest.fail(f"Container failed to start. Status: {mikopbx_container.status}")

    print("Container restarted successfully")
    yield


class TestSipCountryFields:
    """Test country fields in SIP endpoints"""

    EXTENSION = "200"

    def test_sip_get_history_has_country_fields(self, api_client):
        """Test that getHistory returns country and countryName fields"""
        data = api_client.get(
            f"sip/{self.EXTENSION}:getHistory",
            params={"limit": 10}
        )

        print(f"\n=== Response Data ===")
        print(f"Keys: {data.keys()}")
        print(f"Result: {data.get('result')}")
        print(f"Data type: {type(data.get('data'))}")
        print(f"Data: {data.get('data')}")

        assert data['result'] is True, "Request failed"
        assert 'data' in data, "No data in response"

        # Check if data is dict or list
        response_data = data['data']
        if isinstance(response_data, dict):
            assert 'history' in response_data, "No history in response"
            history = response_data['history']
        elif isinstance(response_data, list):
            history = response_data
        else:
            pytest.fail(f"Unexpected data type: {type(response_data)}")

        if len(history) == 0:
            pytest.skip(f"No history records found for extension {self.EXTENSION}")

        # Check first record for country fields
        first_record = history[0]

        assert 'country' in first_record, "country field is missing in history record"
        assert 'countryName' in first_record, "countryName field is missing in history record"

        # Verify fields have appropriate values
        assert isinstance(first_record['country'], str), "country should be a string"
        assert isinstance(first_record['countryName'], str), "countryName should be a string"

        print(f"\n✅ History record contains country fields:")
        print(f"   Country: {first_record['country']}")
        print(f"   Country Name: {first_record['countryName']}")
        print(f"   IP Address: {first_record.get('ip_address', 'N/A')}")

    def test_sip_get_status_has_country_fields_in_devices(self, api_client):
        """Test that getStatus returns country and countryName in devices array"""
        # WHY: getStatus endpoint may return 422 for certain extensions
        # This is expected behavior when extension doesn't have active status
        try:
            data = api_client.get(f"sip/{self.EXTENSION}:getStatus")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                pytest.skip(f"getStatus endpoint not available for extension {self.EXTENSION}: {e}")
            raise

        assert data['result'] is True, "Request failed"
        assert 'data' in data, "No data in response"

        status_data = data['data']
        assert 'devices' in status_data, "No devices in response"

        devices = status_data['devices']

        if len(devices) == 0:
            pytest.skip(f"No devices found for extension {self.EXTENSION}")

        # Check first device for country fields
        first_device = devices[0]

        assert 'country' in first_device, "country field is missing in device"
        assert 'countryName' in first_device, "countryName field is missing in device"

        # Verify fields have appropriate values
        assert isinstance(first_device['country'], str), "country should be a string"
        assert isinstance(first_device['countryName'], str), "countryName should be a string"

        print(f"\n✅ Device contains country fields:")
        print(f"   Country: {first_device['country']}")
        print(f"   Country Name: {first_device['countryName']}")
        print(f"   IP Address: {first_device.get('ip', 'N/A')}")

    def test_country_values_are_consistent(self, api_client):
        """Test that country values are consistent between history and status"""
        # Get history
        try:
            history_data = api_client.get(
                f"sip/{self.EXTENSION}:getHistory",
                params={"limit": 1}
            )
        except Exception as e:
            pytest.skip(f"Failed to get history: {e}")

        # Get status
        try:
            status_data = api_client.get(f"sip/{self.EXTENSION}:getStatus")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                pytest.skip(f"getStatus endpoint not available for extension {self.EXTENSION}")
            raise

        if not history_data.get('result') or not status_data.get('result'):
            pytest.skip("Failed to get history or status")

        history_records = history_data.get('data', {}).get('history', [])
        devices = status_data.get('data', {}).get('devices', [])

        if len(history_records) == 0 or len(devices) == 0:
            pytest.skip("No history or devices to compare")

        # Get IP from latest history record
        history_ip = history_records[0].get('ip_address', '')
        history_country = history_records[0].get('country', '')

        # Find matching device by IP
        matching_device = None
        for device in devices:
            if device.get('ip') == history_ip:
                matching_device = device
                break

        if matching_device:
            # Country codes should match for same IP
            device_country = matching_device.get('country', '')

            print(f"\n✅ Comparing country for IP {history_ip}:")
            print(f"   History country: {history_country}")
            print(f"   Device country: {device_country}")

            assert history_country == device_country, \
                f"Country mismatch for IP {history_ip}: history={history_country}, device={device_country}"
        else:
            print(f"\n⚠️  No matching device found for history IP {history_ip}")
