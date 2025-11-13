"""
SIP Protocol Behavioral Validator

Validates SIP behavior compliance with RFC 3261 without requiring raw packet capture.
Focuses on behavioral testing: registration, authentication, session management.

Author: MikoPBX Test Infrastructure
License: GPL-3.0
"""

import re
import subprocess
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class SipEndpointInfo:
    """Information about a SIP endpoint from Asterisk"""
    endpoint_id: str
    transport: str
    aors: str
    auths: str
    contact_status: str
    device_state: str


@dataclass
class SipValidationResult:
    """Result of SIP validation"""
    passed: bool
    message: str
    details: Optional[Dict] = None


class SipBehaviorValidator:
    """
    Validates SIP protocol behavior using Asterisk CLI and behavioral checks.

    RFC 3261 Compliance Areas:
    - Registration (Section 10)
    - Authentication (Section 22)
    - Session Establishment (Section 13)
    - Transport (Section 18)
    """

    def __init__(self, container_name: str = "mikopbx-php83"):
        self.container = container_name

    def _exec_asterisk_cli(self, command: str) -> str:
        """Execute Asterisk CLI command"""
        result = subprocess.run(
            ["docker", "exec", self.container, "asterisk", "-rx", command],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout

    def get_pjsip_endpoint_info(self, endpoint: str) -> Optional[SipEndpointInfo]:
        """
        Get PJSIP endpoint information from Asterisk.

        Args:
            endpoint: Extension number (e.g., "201")

        Returns:
            SipEndpointInfo if found, None otherwise
        """
        output = self._exec_asterisk_cli(f"pjsip show endpoint {endpoint}")

        if "Unable to retrieve endpoint" in output or not output.strip():
            return None

        # Parse endpoint info
        info = {
            'endpoint_id': endpoint,
            'transport': 'unknown',
            'aors': '',
            'auths': '',
            'contact_status': 'Unknown',
            'device_state': 'Unavailable'
        }

        for line in output.split('\n'):
            line = line.strip()
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower().replace(' ', '_')
                value = value.strip()

                if key == 'transport':
                    info['transport'] = value
                elif key == 'aors':
                    info['aors'] = value
                elif key == 'auths':
                    info['auths'] = value
                elif key == 'contact_status' or 'contact' in key:
                    if 'Avail' in value or 'Reachable' in value:
                        info['contact_status'] = 'Available'
                    elif 'Unavail' in value or 'Unreachable' in value:
                        info['contact_status'] = 'Unavailable'
                elif key == 'device_state':
                    info['device_state'] = value

        return SipEndpointInfo(**info)

    def validate_registration(self, endpoint: str) -> SipValidationResult:
        """
        RFC 3261 Section 10: Registration Validation

        Validates that endpoint is properly registered and reachable.

        Args:
            endpoint: Extension number

        Returns:
            SipValidationResult
        """
        info = self.get_pjsip_endpoint_info(endpoint)

        if not info:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} not found in PJSIP configuration"
            )

        if info.contact_status != 'Available':
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} contact status is {info.contact_status}, expected Available",
                details=info.__dict__
            )

        return SipValidationResult(
            passed=True,
            message=f"Endpoint {endpoint} properly registered and reachable",
            details=info.__dict__
        )

    def validate_authentication(self, endpoint: str) -> SipValidationResult:
        """
        RFC 3261 Section 22: Authentication Validation

        Validates that endpoint has authentication configured.

        Args:
            endpoint: Extension number

        Returns:
            SipValidationResult
        """
        info = self.get_pjsip_endpoint_info(endpoint)

        if not info:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} not found"
            )

        if not info.auths:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} has no authentication configured",
                details=info.__dict__
            )

        return SipValidationResult(
            passed=True,
            message=f"Endpoint {endpoint} has authentication: {info.auths}",
            details=info.__dict__
        )

    def validate_transport(self, endpoint: str, expected_transport: str = "transport-udp") -> SipValidationResult:
        """
        RFC 3261 Section 18: Transport Validation

        Validates that endpoint uses correct transport protocol.

        Args:
            endpoint: Extension number
            expected_transport: Expected transport (e.g., "transport-udp", "transport-tcp")

        Returns:
            SipValidationResult
        """
        info = self.get_pjsip_endpoint_info(endpoint)

        if not info:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} not found"
            )

        if info.transport != expected_transport:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} transport is {info.transport}, expected {expected_transport}",
                details=info.__dict__
            )

        return SipValidationResult(
            passed=True,
            message=f"Endpoint {endpoint} using correct transport: {info.transport}",
            details=info.__dict__
        )

    def validate_endpoint_exists(self, endpoint: str) -> SipValidationResult:
        """
        Basic validation that endpoint exists in configuration.

        Args:
            endpoint: Extension number

        Returns:
            SipValidationResult
        """
        info = self.get_pjsip_endpoint_info(endpoint)

        if not info:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} does not exist in PJSIP configuration"
            )

        return SipValidationResult(
            passed=True,
            message=f"Endpoint {endpoint} exists in PJSIP configuration",
            details=info.__dict__
        )

    def get_active_channels(self, filter_string: Optional[str] = None) -> List[str]:
        """
        Get list of active SIP channels.

        Args:
            filter_string: Optional filter (e.g., "201" to find channels for extension 201)

        Returns:
            List of channel names
        """
        output = self._exec_asterisk_cli("core show channels concise")

        channels = []
        for line in output.split('\n'):
            if not line.strip():
                continue

            # Parse channel name (first field in concise output)
            parts = line.split('!')
            if parts and 'PJSIP' in parts[0]:
                if filter_string is None or filter_string in parts[0]:
                    channels.append(parts[0])

        return channels

    def validate_no_active_calls(self, endpoint: str) -> SipValidationResult:
        """
        Validate that endpoint has no active calls.

        Useful for cleanup validation in tests.

        Args:
            endpoint: Extension number

        Returns:
            SipValidationResult
        """
        channels = self.get_active_channels(endpoint)

        if channels:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} has {len(channels)} active channels",
                details={'channels': channels}
            )

        return SipValidationResult(
            passed=True,
            message=f"Endpoint {endpoint} has no active calls"
        )

    def validate_codec_support(self, endpoint: str, required_codecs: List[str]) -> SipValidationResult:
        """
        Validate that endpoint supports required codecs.

        Args:
            endpoint: Extension number
            required_codecs: List of codec names (e.g., ["ulaw", "alaw", "g722"])

        Returns:
            SipValidationResult
        """
        output = self._exec_asterisk_cli(f"pjsip show endpoint {endpoint}")

        # Look for codec configuration
        codec_line = None
        for line in output.split('\n'):
            if 'allow' in line.lower() or 'codec' in line.lower():
                codec_line = line
                break

        if not codec_line:
            return SipValidationResult(
                passed=False,
                message=f"Could not determine codec configuration for {endpoint}"
            )

        # Check if required codecs are mentioned
        missing_codecs = []
        for codec in required_codecs:
            if codec.lower() not in codec_line.lower():
                missing_codecs.append(codec)

        if missing_codecs:
            return SipValidationResult(
                passed=False,
                message=f"Endpoint {endpoint} missing codecs: {', '.join(missing_codecs)}",
                details={'configured_codecs': codec_line}
            )

        return SipValidationResult(
            passed=True,
            message=f"Endpoint {endpoint} supports all required codecs",
            details={'required_codecs': required_codecs}
        )


class SipCallValidator:
    """Validates SIP call behavior and session management"""

    def __init__(self, container_name: str = "mikopbx-php83"):
        self.container = container_name
        self.validator = SipBehaviorValidator(container_name)

    def validate_call_setup_time(self, setup_duration: float, max_seconds: float = 5.0) -> SipValidationResult:
        """
        RFC 3261: Validate call setup time is reasonable

        Args:
            setup_duration: Actual call setup time in seconds
            max_seconds: Maximum acceptable setup time

        Returns:
            SipValidationResult
        """
        if setup_duration > max_seconds:
            return SipValidationResult(
                passed=False,
                message=f"Call setup took {setup_duration:.2f}s, exceeds maximum {max_seconds}s",
                details={'setup_duration': setup_duration, 'max_allowed': max_seconds}
            )

        return SipValidationResult(
            passed=True,
            message=f"Call setup time {setup_duration:.2f}s is acceptable",
            details={'setup_duration': setup_duration}
        )

    def validate_clean_hangup(self, caller: str, callee: str) -> SipValidationResult:
        """
        Validate that both endpoints have no lingering channels after hangup.

        Args:
            caller: Caller extension
            callee: Callee extension

        Returns:
            SipValidationResult
        """
        result_caller = self.validator.validate_no_active_calls(caller)
        result_callee = self.validator.validate_no_active_calls(callee)

        if not result_caller.passed:
            return result_caller

        if not result_callee.passed:
            return result_callee

        return SipValidationResult(
            passed=True,
            message=f"Clean hangup confirmed: no active channels for {caller} or {callee}"
        )


# Convenience functions for pytest assertions
def assert_sip_validation(result: SipValidationResult, custom_message: str = None):
    """
    Assert that SIP validation passed.

    Usage in pytest:
        result = validator.validate_registration("201")
        assert_sip_validation(result, "Extension 201 should be registered")

    Args:
        result: SipValidationResult to check
        custom_message: Optional custom assertion message
    """
    message = custom_message or result.message
    assert result.passed, f"{message}\nDetails: {result.details}"


def validate_all(*results: SipValidationResult) -> SipValidationResult:
    """
    Combine multiple validation results.

    Returns:
        Combined SipValidationResult (passes only if all pass)
    """
    failed = [r for r in results if not r.passed]

    if failed:
        messages = [r.message for r in failed]
        return SipValidationResult(
            passed=False,
            message=f"{len(failed)} validation(s) failed:\n" + "\n".join(f"  - {m}" for m in messages),
            details={'failed_validations': [r.__dict__ for r in failed]}
        )

    return SipValidationResult(
        passed=True,
        message=f"All {len(results)} validations passed"
    )
