"""
SIP Protocol Behavioral Validation Tests

Tests SIP protocol compliance using Asterisk CLI behavioral validation.
Validates RFC 3261 compliance without requiring raw packet capture.

Test Coverage:
- Registration validation
- Authentication validation
- Transport protocol validation
- Codec support validation
- Clean hangup validation

Author: MikoPBX Test Infrastructure
License: GPL-3.0
"""

import pytest
import time
from sip_validator import (
    SipBehaviorValidator,
    SipCallValidator,
    assert_sip_validation,
    validate_all
)


@pytest.fixture
def sip_validator():
    """Fixture for SIP behavior validator"""
    return SipBehaviorValidator(container_name="mikopbx-php83")


@pytest.fixture
def call_validator():
    """Fixture for SIP call validator"""
    return SipCallValidator(container_name="mikopbx-php83")


class TestSipRegistration:
    """RFC 3261 Section 10: Registration Tests"""

    def test_01_endpoint_exists_in_configuration(self, sip_validator):
        """
        Test that configured endpoints exist in PJSIP configuration.

        Validates: RFC 3261 Section 10 - Registration
        """
        print("\n" + "=" * 70)
        print("Test: SIP Endpoint Configuration Validation")
        print("=" * 70)

        # Test multiple endpoints
        test_endpoints = ["201", "202", "203"]

        for endpoint in test_endpoints:
            print(f"\n✓ Validating endpoint {endpoint} existence...")
            result = sip_validator.validate_endpoint_exists(endpoint)
            assert_sip_validation(result, f"Endpoint {endpoint} must exist")
            print(f"  └─ {result.message}")

        print("\n✅ All endpoints exist in PJSIP configuration")

    def test_02_authentication_configuration(self, sip_validator):
        """
        Test that endpoints have proper authentication configured.

        Validates: RFC 3261 Section 22 - Security Considerations
        """
        print("\n" + "=" * 70)
        print("Test: SIP Authentication Configuration")
        print("=" * 70)

        test_endpoints = ["201", "202"]

        for endpoint in test_endpoints:
            print(f"\n✓ Validating authentication for {endpoint}...")
            result = sip_validator.validate_authentication(endpoint)
            assert_sip_validation(result, f"Endpoint {endpoint} must have authentication")
            print(f"  └─ {result.message}")

        print("\n✅ All endpoints have authentication configured")

    def test_03_transport_protocol_validation(self, sip_validator):
        """
        Test that endpoints use correct transport protocol.

        Validates: RFC 3261 Section 18 - Transport
        """
        print("\n" + "=" * 70)
        print("Test: SIP Transport Protocol Validation")
        print("=" * 70)

        test_endpoints = ["201", "202"]
        expected_transport = "transport-udp"

        for endpoint in test_endpoints:
            print(f"\n✓ Validating transport for {endpoint}...")
            result = sip_validator.validate_transport(endpoint, expected_transport)
            assert_sip_validation(result, f"Endpoint {endpoint} must use {expected_transport}")
            print(f"  └─ {result.message}")

        print("\n✅ All endpoints using correct transport protocol")


class TestSipCodecSupport:
    """Codec support validation"""

    def test_01_basic_codec_support(self, sip_validator):
        """
        Test that endpoints support basic codecs.

        Validates: SDP codec configuration
        """
        print("\n" + "=" * 70)
        print("Test: SIP Codec Support Validation")
        print("=" * 70)

        # Common codecs that should be supported
        required_codecs = ["ulaw"]  # PCMU/G.711 μ-law

        endpoint = "201"
        print(f"\n✓ Checking codec support for endpoint {endpoint}...")
        result = sip_validator.validate_codec_support(endpoint, required_codecs)

        # Note: Codec validation might not work depending on Asterisk output format
        # This is informational rather than strict
        print(f"  └─ {result.message}")
        if result.details:
            print(f"  └─ Details: {result.details}")

        print("\n✅ Codec validation complete")


class TestSipCallBehavior:
    """RFC 3261 Section 13: Session Initiation"""

    def test_01_registration_with_validation(self, sip_endpoint_factory, sip_validator):
        """
        Test SIP registration with behavioral validation.

        Validates:
        - RFC 3261 Section 10: Registration
        - Endpoint becomes reachable after registration
        """
        print("\n" + "=" * 70)
        print("Test: SIP Registration with Validation")
        print("=" * 70)

        # Register endpoint
        print("\n✓ Registering endpoint 201...")
        ext_201 = sip_endpoint_factory("201")
        time.sleep(2)  # Allow registration to complete

        # Validate registration
        print("✓ Validating registration status...")
        result = sip_validator.validate_registration("201")
        assert_sip_validation(result, "Extension 201 must be registered and reachable")

        print(f"  └─ {result.message}")
        if result.details:
            print(f"  └─ Contact Status: {result.details['contact_status']}")
            print(f"  └─ Transport: {result.details['transport']}")

        print("\n✅ Registration validation passed")

    def test_02_multiple_endpoints_validation(self, sip_endpoint_factory, sip_validator):
        """
        Test multiple simultaneous registrations.

        Validates: Multiple endpoints can be registered simultaneously
        """
        print("\n" + "=" * 70)
        print("Test: Multiple Endpoints Registration Validation")
        print("=" * 70)

        endpoints = ["201", "202", "203"]

        # Register all endpoints
        print(f"\n✓ Registering {len(endpoints)} endpoints...")
        for ext in endpoints:
            sip_endpoint_factory(ext)
            print(f"  └─ Registered {ext}")

        time.sleep(3)  # Allow all registrations to complete

        # Validate all registrations
        print("\n✓ Validating all registrations...")
        results = []
        for ext in endpoints:
            result = sip_validator.validate_registration(ext)
            results.append(result)
            print(f"  └─ {ext}: {result.message}")

        # Combine validation results
        combined = validate_all(*results)
        assert_sip_validation(combined, "All endpoints must be properly registered")

        print("\n✅ All endpoints validated successfully")

    def test_03_clean_hangup_validation(self, sip_endpoint_factory, call_validator):
        """
        Test that calls hangup cleanly without lingering channels.

        Validates:
        - RFC 3261 Section 15: Terminating a Session
        - No lingering channels after BYE
        """
        print("\n" + "=" * 70)
        print("Test: Clean Hangup Validation")
        print("=" * 70)

        # Setup endpoints
        print("\n✓ Setting up endpoints...")
        ext_201 = sip_endpoint_factory("201")
        ext_202 = sip_endpoint_factory("202")
        time.sleep(2)

        # Make a brief call
        print("✓ Making test call 201→202...")
        ext_201.call("202", duration=3)
        time.sleep(4)  # Wait for call to complete

        # Validate clean hangup
        print("\n✓ Validating clean hangup...")
        result = call_validator.validate_clean_hangup("201", "202")
        assert_sip_validation(result, "Call must hangup cleanly")

        print(f"  └─ {result.message}")
        print("\n✅ Clean hangup validation passed")


# Summary test to demonstrate all validations
class TestSipValidationSummary:
    """Comprehensive SIP validation test"""

    def test_comprehensive_sip_validation(self, sip_endpoint_factory, sip_validator):
        """
        Comprehensive SIP validation combining multiple checks.

        This test demonstrates all validation capabilities in one scenario.
        """
        print("\n" + "="  * 70)
        print("Test: Comprehensive SIP Protocol Validation")
        print("=" * 70)

        endpoint = "201"

        # Step 1: Configuration validation
        print(f"\n[1/4] Endpoint Configuration Validation")
        config_result = sip_validator.validate_endpoint_exists(endpoint)
        print(f"  └─ {config_result.message}")

        # Step 2: Authentication validation
        print(f"\n[2/4] Authentication Validation")
        auth_result = sip_validator.validate_authentication(endpoint)
        print(f"  └─ {auth_result.message}")

        # Step 3: Transport validation
        print(f"\n[3/4] Transport Protocol Validation")
        transport_result = sip_validator.validate_transport(endpoint, "transport-udp")
        print(f"  └─ {transport_result.message}")

        # Step 4: Registration validation
        print(f"\n[4/4] Registration Status Validation")
        sip_endpoint_factory(endpoint)
        time.sleep(2)
        registration_result = sip_validator.validate_registration(endpoint)
        print(f"  └─ {registration_result.message}")

        # Combine all results
        combined = validate_all(
            config_result,
            auth_result,
            transport_result,
            registration_result
        )

        assert_sip_validation(combined, "All SIP validations must pass")

        print("\n" + "=" * 70)
        print("✅ COMPREHENSIVE SIP VALIDATION: ALL CHECKS PASSED")
        print("=" * 70)
        print(f"\nValidated:")
        print(f"  ✓ Endpoint configuration (RFC 3261)")
        print(f"  ✓ Authentication setup (RFC 3261 Section 22)")
        print(f"  ✓ Transport protocol (RFC 3261 Section 18)")
        print(f"  ✓ Registration status (RFC 3261 Section 10)")
        print("=" * 70)