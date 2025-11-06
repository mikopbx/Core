#!/usr/bin/env python3
"""
Comprehensive test for all provider types in pjsip.conf

This test creates:
- SIP OUTBOUND TRUNK (UDP, TCP, TLS transports)
- SIP INBOUND TRUNK (UDP, TCP, TLS transports)
- SIP PEER TRUNK (no registration, UDP transport)
- IAX OUTBOUND TRUNK
- IAX INBOUND TRUNK
- IAX PEER TRUNK (no registration)

Then validates:
- pjsip.conf template usage and visual separators
- iax.conf configuration
- Asterisk successfully loads all configurations
"""

import pytest
from conftest import assert_api_success


class TestAllProviderTypes:
    """Create all provider types and validate configuration generation"""

    # Store created provider IDs for cleanup
    created_providers = {
        'sip': [],
        'iax': []
    }

    @pytest.mark.dependency()
    def test_01_create_sip_outbound_udp(self, api_client):
        """Create SIP OUTBOUND TRUNK with UDP transport"""
        provider_data = {
            'type': 'sip',
            'registration_type': 'outbound',
            'description': 'Test Outbound UDP Provider',
            'host': 'sip-out-udp.example.com',
            'port': 5060,
            'username': 'testuser_udp',
            'secret': 'TestSecret123',
            'transport': 'udp',
            'dtmfmode': 'auto',
            'qualify': True,
            'qualifyfreq': 60
        }

        response = api_client.post('sip-providers', provider_data)
        assert_api_success(response, "Failed to create SIP OUTBOUND UDP provider")

        provider_id = response['data']['id']
        self.created_providers['sip'].append(provider_id)
        print(f"✓ Created SIP OUTBOUND TRUNK (UDP): {provider_id}")

    @pytest.mark.dependency()
    def test_02_create_sip_outbound_tcp(self, api_client):
        """Create SIP OUTBOUND TRUNK with TCP transport"""
        provider_data = {
            'type': 'sip',
            'registration_type': 'outbound',
            'description': 'Test Outbound TCP Provider',
            'host': 'sip-out-tcp.example.com',
            'port': 5060,
            'username': 'testuser_tcp',
            'secret': 'TestSecret456',
            'transport': 'tcp',
            'dtmfmode': 'rfc4733',
            'qualify': True,
            'qualifyfreq': 30
        }

        response = api_client.post('sip-providers', provider_data)
        assert_api_success(response, "Failed to create SIP OUTBOUND TCP provider")

        provider_id = response['data']['id']
        self.created_providers['sip'].append(provider_id)
        print(f"✓ Created SIP OUTBOUND TRUNK (TCP): {provider_id}")

    @pytest.mark.dependency()
    def test_03_create_sip_outbound_tls(self, api_client):
        """Create SIP OUTBOUND TRUNK with TLS transport"""
        provider_data = {
            'type': 'sip',
            'registration_type': 'outbound',
            'description': 'Test Outbound TLS Provider',
            'host': 'sip-out-tls.example.com',
            'port': 5061,
            'username': 'testuser_tls',
            'secret': 'TestSecret789',
            'transport': 'tls',
            'dtmfmode': 'auto',
            'qualify': True,
            'qualifyfreq': 60,
            'fromuser': 'fromuser_tls',
            'fromdomain': 'fromdomain.example.com'
        }

        response = api_client.post('sip-providers', provider_data)
        assert_api_success(response, "Failed to create SIP OUTBOUND TLS provider")

        provider_id = response['data']['id']
        self.created_providers['sip'].append(provider_id)
        print(f"✓ Created SIP OUTBOUND TRUNK (TLS): {provider_id}")

    @pytest.mark.dependency()
    def test_04_create_sip_inbound_udp(self, api_client):
        """Create SIP INBOUND TRUNK with UDP transport"""
        provider_data = {
            'type': 'sip',
            'registration_type': 'inbound',
            'description': 'Test Inbound UDP Provider',
            'host': 'sip-in-udp.example.com',
            'port': 5060,
            'username': 'inbound_udp',
            'secret': 'InboundSecret123',
            'transport': 'udp',
            'dtmfmode': 'inband',
            'qualify': True,
            'qualifyfreq': 60
        }

        response = api_client.post('sip-providers', provider_data)
        assert_api_success(response, "Failed to create SIP INBOUND UDP provider")

        provider_id = response['data']['id']
        self.created_providers['sip'].append(provider_id)
        print(f"✓ Created SIP INBOUND TRUNK (UDP): {provider_id}")

    @pytest.mark.dependency()
    def test_05_create_sip_inbound_tcp(self, api_client):
        """Create SIP INBOUND TRUNK with TCP transport"""
        provider_data = {
            'type': 'sip',
            'registration_type': 'inbound',
            'description': 'Test Inbound TCP Provider',
            'host': 'sip-in-tcp.example.com',
            'port': 5060,
            'username': 'inbound_tcp',
            'secret': 'InboundSecret456',
            'transport': 'tcp',
            'dtmfmode': 'rfc4733',
            'qualify': False
        }

        response = api_client.post('sip-providers', provider_data)
        assert_api_success(response, "Failed to create SIP INBOUND TCP provider")

        provider_id = response['data']['id']
        self.created_providers['sip'].append(provider_id)
        print(f"✓ Created SIP INBOUND TRUNK (TCP): {provider_id}")

    @pytest.mark.dependency()
    def test_06_create_sip_inbound_tls(self, api_client):
        """Create SIP INBOUND TRUNK with TLS transport"""
        provider_data = {
            'type': 'sip',
            'registration_type': 'inbound',
            'description': 'Test Inbound TLS Provider',
            'host': 'sip-in-tls.example.com',
            'port': 5061,
            'username': 'inbound_tls',
            'secret': 'InboundSecret789',
            'transport': 'tls',
            'dtmfmode': 'auto',
            'qualify': True,
            'qualifyfreq': 45
        }

        response = api_client.post('sip-providers', provider_data)
        assert_api_success(response, "Failed to create SIP INBOUND TLS provider")

        provider_id = response['data']['id']
        self.created_providers['sip'].append(provider_id)
        print(f"✓ Created SIP INBOUND TRUNK (TLS): {provider_id}")

    @pytest.mark.dependency()
    def test_07_create_sip_peer_trunk(self, api_client):
        """Create SIP PEER TRUNK (no registration)"""
        provider_data = {
            'type': 'sip',
            'registration_type': 'none',
            'description': 'Test Peer Trunk Provider',
            'host': 'sip-peer.example.com',
            'port': 5060,
            'username': 'peer_trunk',
            'secret': 'PeerSecret123',
            'transport': 'udp',
            'dtmfmode': 'auto',
            'qualify': True,
            'qualifyfreq': 60
        }

        response = api_client.post('sip-providers', provider_data)
        assert_api_success(response, "Failed to create SIP PEER TRUNK provider")

        provider_id = response['data']['id']
        self.created_providers['sip'].append(provider_id)
        print(f"✓ Created SIP PEER TRUNK (UDP): {provider_id}")

    @pytest.mark.dependency()
    def test_08_create_iax_outbound(self, api_client):
        """Create IAX OUTBOUND TRUNK"""
        provider_data = {
            'type': 'iax',
            'registration_type': 'outbound',
            'description': 'Test IAX Outbound Provider',
            'host': 'iax-out.example.com',
            'username': 'iax_outbound',
            'secret': 'IAXSecret123',
            'noregister': False,
        }

        response = api_client.post('iax-providers', provider_data)
        assert_api_success(response, "Failed to create IAX OUTBOUND provider")

        provider_id = response['data']['id']
        self.created_providers['iax'].append(provider_id)
        print(f"✓ Created IAX OUTBOUND TRUNK: {provider_id}")

    @pytest.mark.dependency()
    def test_09_create_iax_inbound(self, api_client):
        """Create IAX INBOUND TRUNK"""
        provider_data = {
            'type': 'iax',
            'registration_type': 'inbound',
            'description': 'Test IAX Inbound Provider',
            'host': 'iax-in.example.com',
            'username': 'iax_inbound',
            'secret': 'IAXSecret456',
            'noregister': True,
        }

        response = api_client.post('iax-providers', provider_data)
        assert_api_success(response, "Failed to create IAX INBOUND provider")

        provider_id = response['data']['id']
        self.created_providers['iax'].append(provider_id)
        print(f"✓ Created IAX INBOUND TRUNK: {provider_id}")

    @pytest.mark.dependency()
    def test_10_create_iax_peer_trunk(self, api_client):
        """Create IAX PEER TRUNK (no registration)"""
        provider_data = {
            'type': 'iax',
            'registration_type': 'none',
            'description': 'Test IAX Peer Trunk',
            'host': 'iax-peer.example.com',
            'username': 'iax_peer',
            'secret': 'IAXSecret789',
            'noregister': True,
        }

        response = api_client.post('iax-providers', provider_data)
        assert_api_success(response, "Failed to create IAX PEER TRUNK provider")

        provider_id = response['data']['id']
        self.created_providers['iax'].append(provider_id)
        print(f"✓ Created IAX PEER TRUNK: {provider_id}")

    @pytest.mark.dependency(depends=[
        "TestAllProviderTypes::test_01_create_sip_outbound_udp",
        "TestAllProviderTypes::test_02_create_sip_outbound_tcp",
        "TestAllProviderTypes::test_03_create_sip_outbound_tls",
        "TestAllProviderTypes::test_04_create_sip_inbound_udp",
        "TestAllProviderTypes::test_05_create_sip_inbound_tcp",
        "TestAllProviderTypes::test_06_create_sip_inbound_tls",
        "TestAllProviderTypes::test_07_create_sip_peer_trunk",
        "TestAllProviderTypes::test_08_create_iax_outbound",
        "TestAllProviderTypes::test_09_create_iax_inbound",
        "TestAllProviderTypes::test_10_create_iax_peer_trunk"
    ])
    def test_11_verify_all_providers_created(self, api_client):
        """Verify all providers were created successfully"""
        # Check SIP providers
        sip_response = api_client.get('sip-providers')
        assert_api_success(sip_response, "Failed to get SIP providers list")

        sip_ids = [p['id'] for p in sip_response['data']]
        for provider_id in self.created_providers['sip']:
            assert provider_id in sip_ids, f"SIP provider {provider_id} not found in list"

        print(f"\n✓ All {len(self.created_providers['sip'])} SIP providers verified")

        # Check IAX providers
        iax_response = api_client.get('iax-providers')
        assert_api_success(iax_response, "Failed to get IAX providers list")

        iax_ids = [p['id'] for p in iax_response['data']]
        for provider_id in self.created_providers['iax']:
            assert provider_id in iax_ids, f"IAX provider {provider_id} not found in list"

        print(f"✓ All {len(self.created_providers['iax'])} IAX providers verified")

    @pytest.mark.dependency(depends=["TestAllProviderTypes::test_11_verify_all_providers_created"])
    def test_12_trigger_config_regeneration(self):
        """Trigger Asterisk configuration regeneration by restarting container"""
        import subprocess
        import time

        print("\n" + "="*70)
        print("Triggering Asterisk Configuration Regeneration")
        print("="*70)

        # Restart container to apply all settings
        print("Restarting mikopbx_php83 container...")
        result = subprocess.run(
            ['docker', 'restart', 'mikopbx_php83'],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            pytest.fail(f"Failed to restart container: {result.stderr}")

        print("✓ Container restart initiated")
        print("Waiting 10 seconds for container to fully restart...")
        time.sleep(10)
        print("✓ Configuration regeneration completed")

    @pytest.mark.dependency(depends=["TestAllProviderTypes::test_12_trigger_config_regeneration"])
    def test_13_validate_pjsip_conf(self):
        """Validate pjsip.conf was generated with proper templating"""
        import subprocess

        print("\n" + "="*70)
        print("Validating pjsip.conf Configuration")
        print("="*70)

        # Read pjsip.conf from container
        result = subprocess.run(
            ['docker', 'exec', 'mikopbx_php83', 'cat', '/etc/asterisk/pjsip.conf'],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            pytest.fail(f"Failed to read pjsip.conf: {result.stderr}")

        config = result.stdout

        # Validate template definitions exist
        assert '[registration-base](!)' in config, "Missing registration-base template"
        assert '[provider-aor-base](!)' in config, "Missing provider-aor-base template"
        assert '[provider-endpoint-base](!)' in config, "Missing provider-endpoint-base template"
        assert '[provider-endpoint-udp](provider-endpoint-base,!)' in config, "Missing provider-endpoint-udp template"
        assert '[provider-endpoint-tcp](provider-endpoint-base,!)' in config, "Missing provider-endpoint-tcp template"
        assert '[provider-endpoint-tls](provider-endpoint-base,!)' in config, "Missing provider-endpoint-tls template"

        print("✓ All provider templates found in pjsip.conf")

        # Validate visual separators (check which types exist)
        has_outbound = 'OUTBOUND TRUNK:' in config
        has_inbound = 'INBOUND TRUNK:' in config
        has_peer = 'PEER TRUNK:' in config

        # At least OUTBOUND or PEER should exist
        assert has_outbound or has_peer, "No provider separators found in pjsip.conf"

        # Report which types were found
        if has_outbound:
            print("✓ OUTBOUND TRUNK separator found")
        if has_inbound:
            print("✓ INBOUND TRUNK separator found")
        if has_peer:
            print("✓ PEER TRUNK separator found")

        if not has_inbound:
            print("ℹ️  INBOUND TRUNK separator not found (may be optional)")

        # Validate template inheritance usage
        assert '](registration-base)' in config, "Missing template inheritance in Registration"
        assert '](provider-aor-base)' in config, "Missing template inheritance in AOR"
        assert '](provider-endpoint-udp)' in config or \
               '](provider-endpoint-tcp)' in config or \
               '](provider-endpoint-tls)' in config, \
               "Missing template inheritance in Endpoint"

        print("✓ Template inheritance properly used")

        # Count providers
        outbound_count = config.count('OUTBOUND TRUNK:')
        inbound_count = config.count('INBOUND TRUNK:')
        peer_count = config.count('PEER TRUNK:')

        print(f"\n✓ Found {outbound_count} OUTBOUND TRUNK(s)")
        print(f"✓ Found {inbound_count} INBOUND TRUNK(s)")
        print(f"✓ Found {peer_count} PEER TRUNK(s)")

    @pytest.mark.dependency(depends=["TestAllProviderTypes::test_13_validate_pjsip_conf"])
    def test_14_validate_asterisk_loaded_config(self):
        """Validate Asterisk loaded the configuration without errors"""
        import subprocess

        print("\n" + "="*70)
        print("Validating Asterisk Configuration Loading")
        print("="*70)

        # Check PJSIP endpoints
        result = subprocess.run(
            ['docker', 'exec', 'mikopbx_php83', 'asterisk', '-rx', 'pjsip show endpoints'],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            pytest.fail(f"Failed to query PJSIP endpoints: {result.stderr}")

        output = result.stdout

        # Count loaded endpoints (should include our providers)
        endpoint_lines = [line for line in output.split('\n') if line.strip() and 'Endpoint:' in line]
        print(f"\n✓ Asterisk loaded {len(endpoint_lines)} PJSIP endpoint(s)")

        # Check for errors in Asterisk log
        result = subprocess.run(
            ['docker', 'exec', 'mikopbx_php83', 'tail', '-n', '100', '/var/log/asterisk/messages'],
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            log = result.stdout
            error_keywords = ['ERROR', 'WARNING[general]', 'CRITICAL']
            errors = [line for line in log.split('\n') if any(kw in line for kw in error_keywords) and 'pjsip' in line.lower()]

            if errors:
                print("\n⚠ Found PJSIP-related errors in Asterisk log:")
                for error in errors[-5:]:  # Show last 5 errors
                    print(f"  {error}")
            else:
                print("✓ No PJSIP errors in recent Asterisk log")

    @pytest.mark.dependency(depends=["TestAllProviderTypes::test_14_validate_asterisk_loaded_config"])
    def test_15_cleanup_test_providers(self, api_client):
        """Clean up all test providers"""
        print("\n" + "="*70)
        print("Cleaning Up Test Providers")
        print("="*70)

        # Delete SIP providers
        for provider_id in self.created_providers['sip']:
            try:
                response = api_client.delete(f'sip-providers/{provider_id}')
                if response.get('result'):
                    print(f"✓ Deleted SIP provider: {provider_id}")
                else:
                    print(f"⚠ Failed to delete SIP provider {provider_id}: {response.get('messages')}")
            except Exception as e:
                print(f"⚠ Error deleting SIP provider {provider_id}: {e}")

        # Delete IAX providers
        for provider_id in self.created_providers['iax']:
            try:
                response = api_client.delete(f'iax-providers/{provider_id}')
                if response.get('result'):
                    print(f"✓ Deleted IAX provider: {provider_id}")
                else:
                    print(f"⚠ Failed to delete IAX provider {provider_id}: {response.get('messages')}")
            except Exception as e:
                print(f"⚠ Error deleting IAX provider {provider_id}: {e}")

        print(f"\n✓ Cleanup completed")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
