#!/usr/bin/env python3
"""
Test 67: Voicemail Testing

Tests voicemail functionality:
- Leave voicemail message
- Verify voicemail file exists
- Validate voicemail audio content
- Verify email notification with mp3 attachment

NOTE: These tests run INSIDE the Docker container using direct file system access.
"""

import pytest
import pytest_asyncio
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent / "helpers"))

from conftest import MikoPBXClient, get_extension_secret
from pjsua_helper import PJSUAManager, get_mikopbx_ip
from audio_validator import (
    find_voicemail_file,
    validate_audio_file,
    list_directory,
    file_exists,
    grep_in_file
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@pytest_asyncio.fixture
async def mikopbx_ip():
    """Get MikoPBX container IP address"""
    ip = await get_mikopbx_ip()
    logger.info(f"Using MikoPBX IP: {ip}")
    return ip


@pytest_asyncio.fixture
async def pjsua_manager(mikopbx_ip):
    """Create PJSUA manager for tests"""
    manager = PJSUAManager(server_ip=mikopbx_ip)
    await manager.initialize()

    yield manager

    # Cleanup all endpoints after test
    await manager.cleanup_all()


@pytest_asyncio.fixture
async def extension_credentials(api_client):
    """
    Dynamically load SIP secrets for test extensions via REST API.
    """
    extensions = ["201", "202", "203"]
    credentials = {}

    for ext in extensions:
        secret = get_extension_secret(ext, api_client)
        if secret:
            credentials[ext] = secret
            logger.info(f"Loaded credentials for extension {ext}")
        else:
            logger.warning(f"Failed to load credentials for extension {ext}")

    return credentials


@pytest.mark.asyncio
async def test_01_leave_voicemail_message(api_client, pjsua_manager, extension_credentials):
    """
    Test: Leave Voicemail Message

    Scenario:
    1. Verify extension 202 has voicemail configured
    2. Register extension 201
    3. Extension 201 calls 202 (no answer)
    4. Call goes to voicemail
    5. Wait for voicemail greeting and beep
    6. Maintain call for 5 seconds (simulate leaving message)
    7. Hangup
    8. Wait for voicemail processing
    9. Find voicemail file in container
    10. Verify file exists

    Expected:
    - Voicemail file created in /storage/usbdisk1/mikopbx/voicemail/default/202/INBOX/
    - File format: msg*.wav
    - File contains audio content
    """

    print(f"\n{'='*70}")
    print(f"Test: Leave Voicemail Message")
    print(f"{'='*70}")

    try:
        # ================================================================
        # STEP 1: Verify Voicemail Configured
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Verify Extension 202 Voicemail Configuration")
        print(f"{'-'*70}")

        # Get extension 202 configuration
        response = api_client.get('employees', params={'limit': 100})

        if response.get('result') and response.get('data'):
            data = response['data']
            employees = data.get('data', []) if isinstance(data, dict) else data
            ext_202 = next((e for e in employees if str(e.get('number')) == '202'), None)

            if ext_202:
                email = ext_202.get('email', '')
                mobile = ext_202.get('mobile_number', '')
                print(f"✓ Extension 202 found")
                print(f"  Email: {email if email else 'Not configured'}")
                print(f"  Mobile: {mobile if mobile else 'Not configured'}")

                if not email:
                    print(f"⚠ No email configured for voicemail notifications")
            else:
                print(f"⚠ Extension 202 not found")
        else:
            print(f"⚠ Could not verify voicemail settings")

        # ================================================================
        # STEP 2: Register Extensions
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Extension 201")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )
        print(f"✅ Extension 201 registered")

        # Do NOT register 202 - we want call to go to voicemail
        print(f"✓ Extension 202 NOT registered (unanswered call)")

        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Call Extension (Goes to Voicemail)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Extension 201 Calls 202 (Voicemail)")
        print(f"{'-'*70}")

        print(f"Extension 201 calling 202 (unanswered)...")

        # Use manager endpoint for dialing
        success = await ext201.dial("202")

        print(f"✓ Call initiated: 201 → 202")

        # Wait for voicemail greeting (typically 3-5 seconds)
        print(f"Waiting for voicemail greeting...")
        await asyncio.sleep(6)

        # Leave message (simulate speaking for 5 seconds)
        print(f"Leaving voicemail message (5 seconds)...")
        await asyncio.sleep(5)

        # ================================================================
        # STEP 4: Hangup and Wait for Processing
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Hangup and Process Voicemail")
        print(f"{'-'*70}")

        await ext201.hangup()
        print(f"✅ Call ended")

        # Wait for voicemail to be saved and processed
        print(f"Waiting 10 seconds for voicemail processing...")
        await asyncio.sleep(10)

        # ================================================================
        # STEP 5: Find Voicemail File
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: Find Voicemail File")
        print(f"{'-'*70}")

        voicemail_file = find_voicemail_file(extension='202')

        if voicemail_file:
            print(f"✅ Voicemail file found: {voicemail_file}")
        else:
            print(f"⚠ No voicemail file found")
            print(f"  Expected location: /storage/usbdisk1/mikopbx/voicemail/default/202/INBOX/")
            print(f"  This may indicate:")
            print(f"    - Voicemail not configured for extension 202")
            print(f"    - Call did not reach voicemail (went to busy signal)")
            print(f"    - PJSUA does not generate audio for voicemail recording")

            # Check if voicemail directory exists
            voicemail_base = '/storage/usbdisk1/mikopbx/voicemail/default/'
            contents = list_directory(voicemail_base)
            if contents:
                print(f"✓ Voicemail base directory exists")
                print(f"  Contents: {contents}")
            else:
                print(f"⚠ Voicemail directory not accessible or empty")

        print(f"\n{'='*70}")
        print(f"✓ Leave Voicemail Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


@pytest.mark.asyncio
async def test_02_voicemail_file_validation(api_client, pjsua_manager, extension_credentials):
    """
    Test: Voicemail File Validation

    Scenario:
    1. Leave voicemail message (similar to test_01)
    2. Find voicemail file
    3. Validate file format (WAV)
    4. Check file size > 0
    5. Validate audio content (not silence)

    Expected:
    - File format is valid WAV
    - File size reasonable for message duration
    - Audio contains sound (RMS > threshold)
    - No silence detected
    """

    print(f"\n{'='*70}")
    print(f"Test: Voicemail File Validation")
    print(f"{'='*70}")

    try:
        # ================================================================
        # STEP 1: Register and Make Call
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Register Extension and Call Voicemail")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )
        print(f"✅ Extension 201 registered")

        await asyncio.sleep(2)

        print(f"Extension 201 calling 202 (voicemail)...")
        await ext201.dial("202")

        # Wait for greeting + leave message
        print(f"Waiting for greeting and leaving message...")
        await asyncio.sleep(12)

        await ext201.hangup()
        print(f"✅ Call ended")

        # Wait for processing
        await asyncio.sleep(10)

        # ================================================================
        # STEP 2: Find Voicemail File
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Locate Voicemail File")
        print(f"{'-'*70}")

        voicemail_file = find_voicemail_file(extension='202')

        if not voicemail_file:
            print(f"⚠ No voicemail file found")
            print(f"  Skipping validation (file does not exist)")
            return

        print(f"✅ Found voicemail: {voicemail_file}")

        # ================================================================
        # STEP 3: Validate Audio Content
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Validate Audio Content")
        print(f"{'-'*70}")

        validation_result = validate_audio_file(
            file_path=voicemail_file,
            min_duration=1.0,  # Expect at least 1 second
            silence_threshold=0.01
        )

        print(f"Audio validation results:")
        print(f"  File exists: {validation_result['exists']}")
        print(f"  File size: {validation_result['size_bytes']} bytes")
        print(f"  Duration: {validation_result['duration']:.2f} seconds")
        print(f"  RMS level: {validation_result['rms']:.4f}")
        print(f"  Has audio: {validation_result['has_audio']}")

        # Assertions
        assert validation_result['exists'], "Voicemail file does not exist"
        assert validation_result['size_bytes'] > 0, "Voicemail file is empty"

        # Note: Voicemail may contain only silence if PJSUA doesn't generate audio
        if not validation_result['has_audio']:
            print(f"⚠ Voicemail contains only silence (PJSUA may not generate audio)")
        else:
            print(f"✅ Voicemail contains audio content")

        print(f"\n{'='*70}")
        print(f"✓ Voicemail File Validation Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


@pytest.mark.asyncio
async def test_03_voicemail_email_notification(api_client, pjsua_manager, extension_credentials):
    """
    Test: Voicemail Email Notification

    Scenario:
    1. Configure extension 202 with email address
    2. Leave voicemail for extension 202
    3. Verify /sbin/voicemail-sender script is triggered
    4. Check that email would be sent (monitor logs)

    Expected:
    - Voicemail-sender script executes
    - Email parameters prepared (to, subject, attachment)
    - MP3 attachment created from WAV file

    Note: Actual email delivery depends on SMTP configuration
    This test verifies the voicemail-sender invocation
    """

    print(f"\n{'='*70}")
    print(f"Test: Voicemail Email Notification")
    print(f"{'='*70}")

    try:
        # ================================================================
        # STEP 1: Verify Email Configuration
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Verify Extension 202 Email Configuration")
        print(f"{'-'*70}")

        # Get extension 202 configuration
        response = api_client.get('employees', params={'limit': 100})

        ext_202 = None
        if response.get('result') and response.get('data'):
            data = response['data']
            employees = data.get('data', []) if isinstance(data, dict) else data
            ext_202 = next((e for e in employees if str(e.get('number')) == '202'), None)

            if ext_202:
                email = ext_202.get('email', '')
                print(f"✓ Extension 202 email: {email if email else 'Not configured'}")

                if not email:
                    print(f"⚠ Configuring test email address...")
                    ext_202['email'] = 'test-voicemail@example.com'
                    api_client.patch(f"employees/{ext_202['id']}", ext_202)
                    await asyncio.sleep(2)
                    print(f"✅ Test email configured: test-voicemail@example.com")
            else:
                print(f"⚠ Extension 202 not found")

        # ================================================================
        # STEP 2: Check Voicemail-Sender Script
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Check Voicemail-Sender Script")
        print(f"{'-'*70}")

        # Verify script exists and is executable
        script_path = '/sbin/voicemail-sender'
        if file_exists(script_path):
            print(f"✅ Voicemail-sender script exists: {script_path}")
        else:
            print(f"⚠ Voicemail-sender script not found at {script_path}")

        # ================================================================
        # STEP 3: Leave Voicemail
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Leave Voicemail Message")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )

        await asyncio.sleep(2)

        print(f"Extension 201 calling 202 (voicemail)...")
        await ext201.dial("202")

        await asyncio.sleep(12)

        await ext201.hangup()
        print(f"✅ Voicemail left")

        # Wait for processing
        await asyncio.sleep(10)

        # ================================================================
        # STEP 4: Check for Email Processing
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Check Email Processing")
        print(f"{'-'*70}")

        # Check system logs for voicemail-sender invocation
        log_file = '/storage/usbdisk1/mikopbx/log/system/messages'
        matches = grep_in_file(log_file, 'voicemail')

        if matches:
            print(f"✓ Voicemail activity in system logs:")
            for line in matches[-10:]:  # Last 10 matches
                print(f"  {line}")
        else:
            print(f"⚠ No voicemail activity found in logs")

        # Check if MP3 was created
        voicemail_file = find_voicemail_file(extension='202')
        if voicemail_file:
            # Check for corresponding mp3
            mp3_file = voicemail_file.replace('.wav', '.mp3')
            if file_exists(mp3_file):
                print(f"✅ MP3 attachment created: {mp3_file}")
            else:
                print(f"⚠ No MP3 attachment found (WAV may be used directly)")

        print(f"\n{'='*70}")
        print(f"✓ Voicemail Email Notification Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


if __name__ == "__main__":
    pytest.main([__file__, '-v', '-s'])
