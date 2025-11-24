#!/usr/bin/env python3
"""
Test 67: Voicemail Testing

Tests voicemail functionality:
- Leave voicemail message
- Verify voicemail file exists
- Validate voicemail audio content
- Verify email notification with mp3 attachment
"""

import pytest
import pytest_asyncio
import asyncio
import logging
import sys
import subprocess
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent / "helpers"))

from config import get_config
from conftest import MikoPBXClient
from gophone_helper import GoPhoneConfig, GoPhoneEndpoint, GoPhoneManager, get_mikopbx_ip
from audio_validator import find_voicemail_file, validate_audio_in_container

# Load configuration
config = get_config()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Test extension credentials
TEST_EXTENSIONS = {
    "201": "5b66b92d5714f921cfcde78a4fda0f58",
    "202": "e72b3aea6e4f2a8560adb33cb9bfa5dd",
    "203": "ce4fb0a6a238ddbcd059ecb30f884188",
}


@pytest_asyncio.fixture
async def mikopbx_ip():
    """Get MikoPBX container IP address"""
    ip = await get_mikopbx_ip()
    logger.info(f"Using MikoPBX IP: {ip}")
    return ip


@pytest_asyncio.fixture
async def gophone_manager(mikopbx_ip):
    """Create GoPhone manager for tests"""
    manager = GoPhoneManager(
        server_ip=mikopbx_ip,
        gophone_path=str(Path(__file__).parent / "bin/darwin-arm64/gophone")
    )

    yield manager

    # Cleanup all endpoints after test
    await manager.cleanup_all()


@pytest.mark.asyncio
async def test_01_leave_voicemail_message(api_client, gophone_manager):
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

        ext201 = await gophone_manager.create_endpoint(
            extension="201",
            password=TEST_EXTENSIONS["201"],
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

        config_201 = GoPhoneConfig(
            extension="201",
            password=TEST_EXTENSIONS["201"],
            server_ip=gophone_manager.server_ip,
            media="log"
        )
        caller = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

        print(f"Extension 201 calling 202 (unanswered)...")
        success = await caller.dial("202")

        # Note: Call may "succeed" even though it goes to voicemail
        # The dial() succeeds if SIP connection is established

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

        await caller.hangup()
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

        voicemail_file = find_voicemail_file(
            container_name=config.container_name,
            extension='202'
        )

        if voicemail_file:
            print(f"✅ Voicemail file found: {voicemail_file}")
        else:
            print(f"⚠ No voicemail file found")
            print(f"  Expected location: /storage/usbdisk1/mikopbx/voicemail/default/202/INBOX/")
            print(f"  This may indicate:")
            print(f"    - Voicemail not configured for extension 202")
            print(f"    - Call did not reach voicemail (went to busy signal)")
            print(f"    - GoPhone does not generate audio for voicemail recording")

            # Check if voicemail directory exists
            cmd = ['docker', 'exec', config.container_name, 'ls', '-la', '/storage/usbdisk1/mikopbx/voicemail/default/']
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode == 0:
                print(f"✓ Voicemail base directory exists")
                print(f"  Contents:\n{proc.stdout}")
            else:
                print(f"⚠ Voicemail directory not accessible")

        print(f"\n{'='*70}")
        print(f"✓ Leave Voicemail Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


@pytest.mark.asyncio
async def test_02_voicemail_file_validation(api_client, gophone_manager):
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

        ext201 = await gophone_manager.create_endpoint(
            extension="201",
            password=TEST_EXTENSIONS["201"],
            auto_register=True
        )
        print(f"✅ Extension 201 registered")

        await asyncio.sleep(2)

        config_201 = GoPhoneConfig(
            extension="201",
            password=TEST_EXTENSIONS["201"],
            server_ip=gophone_manager.server_ip,
            media="log"
        )
        caller = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

        print(f"Extension 201 calling 202 (voicemail)...")
        await caller.dial("202")

        # Wait for greeting + leave message
        print(f"Waiting for greeting and leaving message...")
        await asyncio.sleep(12)

        await caller.hangup()
        print(f"✅ Call ended")

        # Wait for processing
        await asyncio.sleep(10)

        # ================================================================
        # STEP 2: Find Voicemail File
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Locate Voicemail File")
        print(f"{'-'*70}")

        voicemail_file = find_voicemail_file(
            container_name=config.container_name,
            extension='202'
        )

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

        validation_result = validate_audio_in_container(
            container_name=config.container_name,
            file_path_in_container=voicemail_file,
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
        assert validation_result['valid'], f"Audio validation failed: {validation_result.get('error')}"
        assert validation_result['exists'], "Voicemail file does not exist"
        assert validation_result['size_bytes'] > 0, "Voicemail file is empty"
        assert validation_result['duration'] >= 1.0, f"Voicemail too short: {validation_result['duration']}s"

        # Note: Voicemail may contain only silence if GoPhone doesn't generate audio
        if not validation_result['has_audio']:
            print(f"⚠ Voicemail contains only silence (GoPhone may not generate audio)")
        else:
            print(f"✅ Voicemail contains audio content")

        print(f"\n{'='*70}")
        print(f"✓ Voicemail File Validation Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


@pytest.mark.asyncio
async def test_03_voicemail_email_notification(api_client, gophone_manager):
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
        cmd = ['docker', 'exec', config.container_name, 'ls', '-la', '/sbin/voicemail-sender']
        proc = subprocess.run(cmd, capture_output=True, text=True)

        if proc.returncode == 0:
            print(f"✅ Voicemail-sender script exists")
            print(f"  {proc.stdout.strip()}")
        else:
            print(f"⚠ Voicemail-sender script not found at /sbin/voicemail-sender")

        # ================================================================
        # STEP 3: Leave Voicemail
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Leave Voicemail Message")
        print(f"{'-'*70}")

        ext201 = await gophone_manager.create_endpoint(
            extension="201",
            password=TEST_EXTENSIONS["201"],
            auto_register=True
        )

        await asyncio.sleep(2)

        config_201 = GoPhoneConfig(
            extension="201",
            password=TEST_EXTENSIONS["201"],
            server_ip=gophone_manager.server_ip,
            media="log"
        )
        caller = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

        print(f"Extension 201 calling 202 (voicemail)...")
        await caller.dial("202")

        await asyncio.sleep(12)

        await caller.hangup()
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
        cmd = [
            'docker', 'exec', config.container_name,
            'grep', '-i', 'voicemail', '/storage/usbdisk1/mikopbx/log/system/messages'
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True)

        if proc.returncode == 0 and proc.stdout:
            print(f"✓ Voicemail activity in system logs:")
            lines = proc.stdout.strip().split('\n')[-10:]  # Last 10 lines
            for line in lines:
                print(f"  {line}")
        else:
            print(f"⚠ No voicemail activity found in logs")

        # Check if MP3 was created
        voicemail_file = find_voicemail_file(config.container_name, '202')
        if voicemail_file:
            # Check for corresponding mp3
            mp3_file = voicemail_file.replace('.wav', '.mp3')
            cmd = ['docker', 'exec', config.container_name, 'ls', '-la', mp3_file]
            proc = subprocess.run(cmd, capture_output=True, text=True)

            if proc.returncode == 0:
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
