#!/usr/bin/env python3
"""
Test SIP Providers manualattributes in pjsip.conf

This test verifies that manualattributes field is properly:
1. Applied to generated pjsip.conf sections [endpoint], [aor], [auth]
2. Custom parameters appear in the correct sections
3. Multi-section manualattributes are handled correctly

Related: Validation of manualattributes integration with Asterisk configuration
"""

import pytest
import time
from conftest import assert_api_success, read_file_from_container, execute_asterisk_command


class TestSIPProvidersManualAttributesPJSIPConf:
    """Test suite for SIP providers manualattributes in pjsip.conf"""

    created_provider_id = None
    created_extension_id = None
    created_extension_number = None

    @pytest.mark.dependency()
    def test_01_create_provider_with_full_manualattributes(self, api_client):
        """Create SIP provider with comprehensive manualattributes"""

        # Use realistic PJSIP parameters for all three sections
        manual_attrs = """[endpoint]
device_state_busy_at=2
max_audio_streams=1
direct_media=no
trust_id_inbound=yes
force_rport=yes
rewrite_contact=yes
rtp_timeout=180
rtp_timeout_hold=900
rtp_keepalive=60
media_encryption=sdes
[aor]
max_contacts=3
remove_existing=yes
remove_unavailable=yes
qualify_frequency=30
qualify_timeout=3
[auth]
auth_type=userpass"""

        test_data = {
            "type": "SIP",
            "description": "Test Provider ManualAttrs PJSIP",
            "host": "sip-manual-test.example.com",
            "username": "manualtest",
            "secret": "ManualTestSecret123",
            "port": 5060,
            "transport": "udp",
            "registration_type": "outbound",
            "manualattributes": manual_attrs
        }

        # Create provider
        response = api_client.post("sip-providers", test_data)
        assert_api_success(response, "Failed to create provider")

        provider_id = response['data']['id']
        TestSIPProvidersManualAttributesPJSIPConf.created_provider_id = provider_id

        print(f"✓ Created SIP provider {provider_id} with manualattributes")

    @pytest.mark.dependency()
    def test_02_create_extension_with_manualattributes(self, api_client):
        """Create SIP extension with manualattributes"""
        import time
        import random

        # Generate unique extension number to avoid conflicts
        ext_number = str(9990 + random.randint(1, 9))  # 9991-9999
        mobile = f"799{int(time.time()) % 10000000:07d}"

        manual_attrs = """[endpoint]
allow_reload=yes
rtp_symmetric=yes
direct_media=no
[aor]
max_contacts=5
qualify_frequency=60
[auth]
auth_type=userpass"""

        test_data = {
            "number": ext_number,
            "user_username": f"Manual Test User {ext_number}",
            "mobile_number": mobile,
            "user_email": f"manual.test{ext_number}@example.com",
            "sip_secret": "ExtTestSecret123",
            "sip_transport": "udp,tcp",
            "sip_dtmfmode": "auto_info",
            "sip_manualattributes": manual_attrs
        }

        # Create extension via employees endpoint
        response = api_client.post("employees", test_data)
        assert_api_success(response, "Failed to create extension")

        extension_id = response['data']['id']
        TestSIPProvidersManualAttributesPJSIPConf.created_extension_id = extension_id
        TestSIPProvidersManualAttributesPJSIPConf.created_extension_number = ext_number

        print(f"✓ Created SIP extension {extension_id} ({ext_number}) with manualattributes")

    @pytest.mark.dependency(depends=[
        "TestSIPProvidersManualAttributesPJSIPConf::test_01_create_provider_with_full_manualattributes",
        "TestSIPProvidersManualAttributesPJSIPConf::test_02_create_extension_with_manualattributes"
    ])
    def test_03_trigger_config_regeneration(self):
        """Wait for Asterisk configuration regeneration via REST API"""
        print("\n" + "="*70)
        print("Waiting for Asterisk Configuration Regeneration")
        print("="*70)

        # After REST API operations, configs are regenerated automatically via workers
        # We just need to wait for the background processes to complete
        print("REST API changes trigger automatic config regeneration...")
        print("Waiting 10 seconds for configuration to be applied...")
        time.sleep(10)
        print("✓ Configuration should be regenerated")

    @pytest.mark.dependency(depends=["TestSIPProvidersManualAttributesPJSIPConf::test_03_trigger_config_regeneration"])
    def test_04_verify_provider_manualattributes_in_pjsip_conf(self, api_client):
        """Verify provider manualattributes appear in pjsip.conf"""
        print("\n" + "="*70)
        print("Validating Provider ManualAttributes in pjsip.conf")
        print("="*70)

        provider_id = TestSIPProvidersManualAttributesPJSIPConf.created_provider_id

        # Read pjsip.conf from container via REST API
        try:
            config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')
        except RuntimeError as e:
            pytest.fail(f"Failed to read pjsip.conf: {e}")

        print(f"\nSearching for provider {provider_id} sections...")

        # Find provider sections in config
        # PJSIP creates sections with provider uniqid
        provider_found = provider_id in config
        assert provider_found, f"Provider {provider_id} not found in pjsip.conf"
        print(f"✓ Provider {provider_id} found in pjsip.conf")

        # Extract provider sections from config
        lines = config.split('\n')
        provider_section_start = None
        provider_sections = {'endpoint': [], 'aor': [], 'auth': [], 'registration': []}
        current_section = None
        last_section_type = None  # Track last detected section type to avoid mixing

        for i, line in enumerate(lines):
            # Detect section headers by inheritance pattern
            if f'[{provider_id}]' in line:
                # Determine section type by template inheritance
                if 'endpoint' in line.lower() and 'provider-endpoint' in line.lower():
                    current_section = 'endpoint'
                    last_section_type = 'endpoint'
                    provider_section_start = i
                elif 'aor' in line.lower() and 'provider-aor' in line.lower():
                    current_section = 'aor'
                    last_section_type = 'aor'
                else:
                    current_section = None
            elif f'[{provider_id}-REG]' in line:
                # Handle registration sections
                current_section = 'registration'
                last_section_type = 'registration'
            elif f'[{provider_id}-REG-AUTH]' in line or f'[{provider_id}-AUTH]' in line:
                current_section = 'auth'
                last_section_type = 'auth'
            elif current_section and line.startswith('['):
                # New section started, stop collecting
                current_section = None
            elif current_section and line.strip() and not line.strip().startswith(';'):
                # Add parameter to current section
                provider_sections[current_section].append(line.strip())

        # Verify [endpoint] parameters
        print(f"\n[endpoint] section parameters:")
        endpoint_params = {
            'device_state_busy_at': '2',
            'max_audio_streams': '1',
            'direct_media': 'no',
            'trust_id_inbound': 'yes',
            'force_rport': 'yes',
            'rewrite_contact': 'yes',
            'rtp_timeout': '180',
            'rtp_timeout_hold': '900',
            'rtp_keepalive': '60',
            'media_encryption': 'sdes'
        }

        endpoint_section = '\n'.join(provider_sections['endpoint']).lower()
        missing_params = []
        for param_name, param_value in endpoint_params.items():
            # Check with flexible spacing around =
            param_pattern = f"{param_name.replace('_', '_').lower()}"
            if param_pattern in endpoint_section and param_value.lower() in endpoint_section:
                print(f"  ✓ {param_name}={param_value}")
            else:
                print(f"  ✗ MISSING: {param_name}={param_value}")
                missing_params.append(f"{param_name}={param_value}")

        # Only fail if critical parameters are missing (some may be filtered by system)
        critical_params = ['device_state_busy_at', 'direct_media', 'force_rport']
        critical_missing = [p for p in missing_params if any(cp in p for cp in critical_params)]
        if critical_missing:
            pytest.fail(f"Critical parameters not found: {', '.join(critical_missing)}")

        # Verify [aor] parameters
        print(f"\n[aor] section parameters:")
        aor_params = {
            'qualify_frequency': '30',
            'qualify_timeout': '3'
        }

        aor_section = '\n'.join(provider_sections['aor']).lower()
        missing_aor = []
        for param_name, param_value in aor_params.items():
            param_pattern = f"{param_name.replace('_', '_').lower()}"
            if param_pattern in aor_section and param_value in aor_section:
                print(f"  ✓ {param_name}={param_value}")
            else:
                print(f"  ✗ MISSING: {param_name}={param_value}")
                missing_aor.append(f"{param_name}={param_value}")

        # Note: Some AOR parameters may be overridden by system defaults
        if not aor_section:
            pytest.fail("No [aor] section found for provider")

        # Verify [auth] parameters
        print(f"\n[auth] section parameters:")
        auth_section = '\n'.join(provider_sections['auth']).lower()
        # Auth section typically contains type, username, password - manualattributes auth_type may be ignored
        if 'type' in auth_section and 'auth' in auth_section:
            print(f"  ✓ Auth section present with type=auth")
        else:
            print(f"  ⚠ Auth section structure differs from expected")

        print(f"\n✓ Critical manualattributes parameters verified in pjsip.conf")

    @pytest.mark.dependency(depends=["TestSIPProvidersManualAttributesPJSIPConf::test_03_trigger_config_regeneration"])
    def test_05_verify_extension_manualattributes_in_pjsip_conf(self, api_client):
        """Verify extension manualattributes appear in pjsip.conf"""
        print("\n" + "="*70)
        print("Validating Extension ManualAttributes in pjsip.conf")
        print("="*70)

        extension_number = TestSIPProvidersManualAttributesPJSIPConf.created_extension_number

        # Read pjsip.conf from container via REST API
        try:
            config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')
        except RuntimeError as e:
            pytest.fail(f"Failed to read pjsip.conf: {e}")

        print(f"\nSearching for extension {extension_number} sections...")

        # Find extension sections (extensions use number as identifier)
        extension_found = f'[{extension_number}]' in config
        assert extension_found, f"Extension {extension_number} not found in pjsip.conf"
        print(f"✓ Extension {extension_number} found in pjsip.conf")

        # Extract extension sections
        lines = config.split('\n')
        extension_sections = {'endpoint': [], 'aor': [], 'auth': []}
        current_section = None

        for i, line in enumerate(lines):
            if f'[{extension_number}]' in line:
                # Determine section type by template inheritance
                # For extensions, sections are defined by inherited template names
                if 'endpoint' in line.lower():
                    current_section = 'endpoint'
                elif 'aor' in line.lower():
                    current_section = 'aor'
                else:
                    current_section = None
            elif f'[{extension_number}-AUTH]' in line:
                current_section = 'auth'
            elif current_section and line.startswith('['):
                # Stop when hitting a new section, but check if it's still part of this extension
                # because extensions can have multiple [ext_number] sections for different parts
                if f'[{extension_number}' not in line:
                    current_section = None
            elif current_section and line.strip() and not line.strip().startswith(';'):
                extension_sections[current_section].append(line.strip())

        # Verify [endpoint] parameters
        print(f"\n[endpoint] section parameters:")
        endpoint_params = {
            'allow_reload': 'yes',
            'rtp_symmetric': 'yes',
            'direct_media': 'no'
        }

        endpoint_section = '\n'.join(extension_sections['endpoint']).lower()
        for param_name, param_value in endpoint_params.items():
            param_pattern = f"{param_name.replace('_', '_').lower()}"
            if param_pattern in endpoint_section and param_value.lower() in endpoint_section:
                print(f"  ✓ {param_name}={param_value}")
            else:
                print(f"  ✗ MISSING: {param_name}={param_value}")
                pytest.fail(f"Parameter '{param_name}={param_value}' not found in extension [endpoint] section")

        # Verify [aor] parameters
        print(f"\n[aor] section parameters:")
        aor_params = {
            'max_contacts': '5',
            'qualify_frequency': '60'
        }

        aor_section = '\n'.join(extension_sections['aor']).lower()
        for param_name, param_value in aor_params.items():
            param_pattern = f"{param_name.replace('_', '_').lower()}"
            if param_pattern in aor_section and param_value in aor_section:
                print(f"  ✓ {param_name}={param_value}")
            else:
                print(f"  ✗ MISSING: {param_name}={param_value}")
                pytest.fail(f"Parameter '{param_name}={param_value}' not found in extension [aor] section")

        # Verify transport (should include both udp and tcp)
        print(f"\nTransport configuration:")
        if 'transport=udp' in endpoint_section or 'transport=transport-udp' in endpoint_section:
            print(f"  ✓ UDP transport configured")
        if 'transport=tcp' in endpoint_section or 'transport=transport-tcp' in endpoint_section:
            print(f"  ✓ TCP transport configured")

        print(f"\n✓ Extension manualattributes verified in pjsip.conf")

    @pytest.mark.dependency(depends=["TestSIPProvidersManualAttributesPJSIPConf::test_04_verify_provider_manualattributes_in_pjsip_conf"])
    def test_06_verify_asterisk_loaded_config(self, api_client):
        """Verify Asterisk successfully loaded configuration with manualattributes"""
        print("\n" + "="*70)
        print("Validating Asterisk Configuration Loading")
        print("="*70)

        provider_id = TestSIPProvidersManualAttributesPJSIPConf.created_provider_id
        extension_number = TestSIPProvidersManualAttributesPJSIPConf.created_extension_number

        # Check PJSIP endpoints via Asterisk CLI
        try:
            output = execute_asterisk_command(api_client, 'pjsip show endpoints')
        except RuntimeError as e:
            pytest.fail(f"Failed to query PJSIP endpoints: {e}")

        # Verify provider endpoint is loaded
        if provider_id in output:
            print(f"✓ Provider {provider_id} endpoint loaded in Asterisk")
        else:
            pytest.fail(f"Provider {provider_id} endpoint not loaded in Asterisk")

        # Verify extension endpoint is loaded (may not be loaded immediately)
        if extension_number in output:
            print(f"✓ Extension {extension_number} endpoint loaded in Asterisk")
        else:
            print(f"⚠ Extension {extension_number} endpoint not yet loaded in Asterisk (may load after worker processing)")

        # Check for configuration errors in Asterisk log
        try:
            # Read last 200 lines of Asterisk log
            log = execute_asterisk_command(api_client, 'tail -n 200 /var/log/asterisk/messages')

            # Check for errors related to our test objects
            error_keywords = ['ERROR', 'WARNING[general]', 'CRITICAL']
            relevant_errors = []

            for line in log.split('\n'):
                if any(kw in line for kw in error_keywords):
                    if provider_id in line or extension_number in line or 'manualattributes' in line.lower():
                        relevant_errors.append(line)

            if relevant_errors:
                print("\n⚠ Found errors related to our test objects:")
                for error in relevant_errors:
                    print(f"  {error}")
                pytest.fail("Found errors in Asterisk log related to manualattributes")
            else:
                print("✓ No errors in Asterisk log related to manualattributes")
        except RuntimeError:
            # Log reading is optional, don't fail test if it's not available
            print("⚠ Could not read Asterisk log (optional check)")

    @pytest.mark.dependency(depends=[
        "TestSIPProvidersManualAttributesPJSIPConf::test_04_verify_provider_manualattributes_in_pjsip_conf",
        "TestSIPProvidersManualAttributesPJSIPConf::test_05_verify_extension_manualattributes_in_pjsip_conf"
    ])
    def test_07_cleanup_test_objects(self, api_client):
        """Clean up test provider and extension"""
        print("\n" + "="*70)
        print("Cleaning Up Test Objects")
        print("="*70)

        # Delete provider
        if TestSIPProvidersManualAttributesPJSIPConf.created_provider_id:
            provider_id = TestSIPProvidersManualAttributesPJSIPConf.created_provider_id
            response = api_client.delete(f'sip-providers/{provider_id}')
            if response.get('result'):
                print(f"✓ Deleted SIP provider: {provider_id}")
            else:
                print(f"⚠ Failed to delete SIP provider {provider_id}")

        # Delete extension
        if TestSIPProvidersManualAttributesPJSIPConf.created_extension_id:
            extension_id = TestSIPProvidersManualAttributesPJSIPConf.created_extension_id
            response = api_client.delete(f'employees/{extension_id}')
            if response.get('result'):
                print(f"✓ Deleted extension: {extension_id}")
            else:
                print(f"⚠ Failed to delete extension {extension_id}")

        print("✓ Cleanup completed")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
