#!/usr/bin/env python3
"""Test suite for System Info operations"""
import pytest
from conftest import assert_api_success


class TestSysinfo:
    """Tests for Sysinfo singleton resource custom methods

    The Sysinfo resource provides read-only system information through custom methods.
    According to Google API Design Guide, singleton resources use custom methods like:
    - GET /sysinfo:getInfo
    - GET /sysinfo:getExternalIpInfo
    - GET /sysinfo:getHypervisorInfo
    - GET /sysinfo:getDMIInfo
    """

    def test_01_get_system_info(self, api_client):
        """Test GET /sysinfo:getInfo - complete system information

        WHY: This custom method retrieves comprehensive system information
        including hardware, network, and software details.

        Expected response:
        - success: true
        - data: object with system information fields
        """
        response = api_client.get('sysinfo:getInfo')
        assert_api_success(response, "Failed to get system info")

        data = response['data']
        print(f"✓ Retrieved complete system information")

        # Validate response structure
        assert isinstance(data, dict), "System info data should be a dictionary"

        # Log available fields for debugging
        if data:
            print(f"  Available fields: {', '.join(data.keys())}")

            # Print some common fields if present
            if 'version' in data:
                print(f"  Version: {data['version']}")
            if 'uptime' in data:
                print(f"  Uptime: {data['uptime']}")
            if 'cpu' in data:
                print(f"  CPU: {data.get('cpu', {}).get('model', 'N/A')}")

    def test_02_get_external_ip_info(self, api_client):
        """Test GET /sysinfo:getExternalIpInfo - external IP address information

        WHY: This custom method retrieves the external IP address of the system,
        useful for NAT configuration and remote access setup.

        Expected response:
        - success: true (if external IP detected)
        - data: object with IP information

        NOTE: May return success=false if system has no internet access
        """
        response = api_client.get('sysinfo:getExternalIpInfo')

        # External IP detection may fail in isolated environments - this is OK
        if response.get('success'):
            print(f"✓ Retrieved external IP information")
            data = response['data']

            assert isinstance(data, dict), "External IP data should be a dictionary"

            if 'externalIp' in data:
                print(f"  External IP: {data['externalIp']}")
            if 'provider' in data:
                print(f"  Provider: {data['provider']}")
        else:
            # Log warning but don't fail - system may have no internet access
            print(f"⚠ External IP not detected (system may be offline or behind NAT)")
            print(f"  Messages: {response.get('messages', {})}")

    def test_03_get_hypervisor_info(self, api_client):
        """Test GET /sysinfo:getHypervisorInfo - virtualization platform detection

        WHY: This custom method detects the hypervisor/virtualization platform
        (VMware, KVM, VirtualBox, Hyper-V, etc.) using dmesg analysis.

        Expected response:
        - success: true (if hypervisor detected)
        - data: { "Hypervisor": "platform_name" }

        NOTE: Returns success=false on bare metal systems (no hypervisor)

        IMPLEMENTATION DETAILS (from GetHypervisorInfoAction.php:46):
        - Uses: dmesg | grep 'Hypervisor detected' | awk -F 'Hypervisor detected: ' '{ print $2}'
        - Returns empty string on bare metal
        - Sets success=true only when hypervisor detected
        """
        response = api_client.get('sysinfo:getHypervisorInfo')

        # Validate response structure exists
        assert 'data' in response, "Response should contain 'data' field"
        assert isinstance(response['data'], dict), "Data should be a dictionary"
        assert 'Hypervisor' in response['data'], "Data should contain 'Hypervisor' field"

        hypervisor = response['data']['Hypervisor']

        if response.get('result'):
            # Hypervisor detected - verify it's valid
            print(f"✓ Hypervisor detected: {hypervisor}")
            assert hypervisor, "Hypervisor field should not be empty when result=true"

            # Validate hypervisor is one of known types
            known_hypervisors = ['KVM', 'VMware', 'VirtualBox', 'Hyper-V', 'Xen', 'QEMU', 'bhyve']
            found_known = any(known in hypervisor for known in known_hypervisors)
            assert found_known, f"Unknown hypervisor type: {hypervisor}. Expected one of: {', '.join(known_hypervisors)}"
            print(f"  ✓ Recognized hypervisor type")
        else:
            # Bare metal system
            print(f"✓ Running on bare metal (no hypervisor detected)")
            assert hypervisor == '', "Hypervisor field should be empty when result=false"

    def test_04_get_dmi_info(self, api_client):
        """Test GET /sysinfo:getDMIInfo - DMI/SMBIOS hardware information

        WHY: This custom method retrieves Desktop Management Interface (DMI) data
        from SMBIOS, providing detailed hardware information (manufacturer, model,
        serial numbers, BIOS version, etc.).

        Expected response:
        - success: true (if DMI data available)
        - data: object with DMI fields

        NOTE: May return limited data in virtual machines or containers

        Common DMI fields:
        - system-manufacturer: Dell, HP, Supermicro, etc.
        - system-product-name: Server model
        - bios-version: BIOS/UEFI version
        - baseboard-manufacturer: Motherboard manufacturer
        """
        response = api_client.get('sysinfo:getDMIInfo')

        # Validate response structure
        assert 'data' in response, "Response should contain 'data' field"
        data = response['data']

        if response.get('success'):
            print(f"✓ Retrieved DMI information")
            assert isinstance(data, dict), "DMI data should be a dictionary"

            # Log available DMI fields for debugging
            if data:
                print(f"  Available DMI fields: {len(data)} entries")

                # Print some common fields if present
                interesting_fields = [
                    'system-manufacturer',
                    'system-product-name',
                    'bios-version',
                    'baseboard-manufacturer',
                    'baseboard-product-name'
                ]

                for field in interesting_fields:
                    if field in data:
                        print(f"  {field}: {data[field]}")
        else:
            # DMI not available (e.g., container environment)
            print(f"⚠ DMI information not available")
            print(f"  Messages: {response.get('messages', {})}")
            print(f"  Note: DMI may be unavailable in containers or some virtual machines")

    def test_05_invalid_custom_method(self, api_client):
        """Test invalid custom method - should return 4xx error

        WHY: Validate that the API properly rejects unknown custom methods
        according to RESTful standards.

        Expected: 404 Not Found or 405 Method Not Allowed for undefined custom methods
        (405 is technically more correct per HTTP RFC - method exists but not allowed for this resource)
        """
        with pytest.raises(Exception) as exc_info:
            api_client.get('sysinfo:invalidMethod')

        # Verify it's a 4xx error (either 404 or 405 are acceptable)
        error_str = str(exc_info.value)
        assert '404' in error_str or '405' in error_str, \
            f"Invalid custom method should return 404 or 405, got: {error_str}"

        if '405' in error_str:
            print(f"✓ Invalid custom method correctly rejected with 405 Method Not Allowed")
        else:
            print(f"✓ Invalid custom method correctly rejected with 404 Not Found")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
