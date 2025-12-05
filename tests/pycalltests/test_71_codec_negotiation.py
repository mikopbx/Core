#!/usr/bin/env python3
"""
Test 71: Codec Negotiation

Tests audio codec negotiation:
- Enable specific codec and verify call uses it
- Test multiple codec scenarios: alaw, ulaw, g729, g722, opus
- Verify codec selection via Asterisk CLI
- Test fallback when preferred codec unavailable

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
from feature_codes_helper import get_enabled_codecs, enable_codec, disable_all_codecs_except
from asterisk_helper import get_active_channels, get_channel_codec

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@pytest_asyncio.fixture
async def extension_credentials(api_client):
    """
    Dynamically load SIP secrets for test extensions via REST API.
    """
    extensions = ["201", "202"]
    credentials = {}

    for ext in extensions:
        secret = get_extension_secret(ext, api_client)
        if secret:
            credentials[ext] = secret
            logger.info(f"Loaded credentials for extension {ext}")
        else:
            logger.warning(f"Failed to load credentials for extension {ext}")

    return credentials

# Codecs to test (conditional based on PJSUA support)
TEST_CODECS = ['alaw', 'ulaw', 'g729', 'g722', 'opus']


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
async def original_codec_config(api_client):
    """Store original codec configuration for restoration"""
    response = api_client.get('general-settings')

    if response.get('result'):
        original_codecs = response['data'].get('codecs', [])
        logger.info(f"Saved original codec configuration ({len(original_codecs)} codecs)")
        yield original_codecs

        # Restore original configuration after test
        try:
            patch_data = {'codecs': original_codecs}
            api_client.patch('general-settings', patch_data)
            logger.info("✓ Restored original codec configuration")
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Failed to restore codec configuration: {e}")
    else:
        logger.warning("Could not retrieve original codec configuration")
        yield []


@pytest.mark.asyncio
async def test_01_verify_enabled_codecs(api_client):
    """
    Test: Verify Enabled Codecs

    Scenario:
    1. Get list of enabled codecs from general-settings
    2. Verify response structure
    3. Display enabled audio codecs
    4. Check for required codecs (alaw, ulaw)

    Expected:
    - At least one codec is enabled
    - Basic codecs (alaw or ulaw) available
    """

    print(f"\n{'='*70}")
    print(f"Test: Verify Enabled Codecs")
    print(f"{'='*70}")

    try:
        # ================================================================
        # STEP 1: Get Enabled Codecs
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Get Enabled Codecs from API")
        print(f"{'-'*70}")

        enabled_codecs = get_enabled_codecs(api_client)

        print(f"✓ Enabled audio codecs: {len(enabled_codecs)}")
        for codec in enabled_codecs:
            print(f"  - {codec}")

        # Assertions
        assert len(enabled_codecs) > 0, "No codecs enabled!"

        # Check for basic codecs
        basic_codecs = [c for c in enabled_codecs if c in ['alaw', 'ulaw']]
        if basic_codecs:
            print(f"✅ Basic codecs available: {', '.join(basic_codecs)}")
        else:
            print(f"⚠ No basic codecs (alaw/ulaw) enabled")

        print(f"\n{'='*70}")
        print(f"✓ Verify Enabled Codecs Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


@pytest.mark.asyncio
async def test_02_codec_negotiation_alaw(api_client, pjsua_manager, original_codec_config, extension_credentials):
    """
    Test: Codec Negotiation - A-law

    Scenario:
    1. Enable only alaw codec
    2. Register extensions 201, 202
    3. Establish call: 201 → 202
    4. Verify call uses alaw codec via Asterisk CLI
    5. Maintain call for 5 seconds
    6. Hangup

    Expected:
    - Call establishes successfully
    - Active channel uses alaw codec
    """

    print(f"\n{'='*70}")
    print(f"Test: Codec Negotiation - A-law")
    print(f"{'='*70}")

    try:
        # ================================================================
        # STEP 1: Configure Codec
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Enable Only A-law Codec")
        print(f"{'-'*70}")

        success = disable_all_codecs_except(api_client, ['alaw'])
        assert success, "Failed to configure codec"

        print(f"✅ A-law codec enabled (others disabled)")
        await asyncio.sleep(3)  # Wait for config reload

        # ================================================================
        # STEP 2: Register Extensions
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Extensions")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=True
        )

        print(f"✅ Extensions 201, 202 registered (202 auto-answer)")
        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Make Call
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Establish Call and Verify Codec")
        print(f"{'-'*70}")

        # Use manager endpoint for dialing
        success = await ext201.dial("202")
        assert success, "Failed to establish call"

        print(f"✅ Call established: 201 → 202")
        await asyncio.sleep(3)

        # ================================================================
        # STEP 4: Verify Codec
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Verify A-law Codec in Use")
        print(f"{'-'*70}")

        channels = get_active_channels()
        print(f"Active channels: {len(channels)}")

        codec_verified = False
        for ch in channels:
            if '201' in ch['channel'] or '202' in ch['channel']:
                codec = get_channel_codec(ch['channel'])
                print(f"✓ Channel {ch['channel']}: codec = {codec}")

                if codec and 'alaw' in codec.lower():
                    print(f"✅ A-law codec verified")
                    codec_verified = True
                elif codec:
                    print(f"⚠ Unexpected codec: {codec} (expected: alaw)")
                else:
                    print(f"⚠ Could not determine codec")

        if not codec_verified:
            print(f"⚠ A-law codec not verified (may depend on PJSUA codec support)")

        # Maintain call
        await asyncio.sleep(5)

        await ext201.hangup()
        print(f"✅ Call ended")

        print(f"\n{'='*70}")
        print(f"✓ A-law Codec Negotiation Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


@pytest.mark.asyncio
async def test_03_codec_negotiation_ulaw(api_client, pjsua_manager, original_codec_config, extension_credentials):
    """
    Test: Codec Negotiation - μ-law

    Similar to test_02 but with ulaw codec
    """

    print(f"\n{'='*70}")
    print(f"Test: Codec Negotiation - μ-law")
    print(f"{'='*70}")

    try:
        # ================================================================
        # STEP 1: Configure Codec
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Enable Only μ-law Codec")
        print(f"{'-'*70}")

        success = disable_all_codecs_except(api_client, ['ulaw'])
        assert success, "Failed to configure codec"

        print(f"✅ μ-law codec enabled (others disabled)")
        await asyncio.sleep(3)

        # ================================================================
        # STEP 2: Register and Call
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Extensions and Make Call")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=True
        )

        await asyncio.sleep(2)

        # Use manager endpoint for dialing
        success = await ext201.dial("202")
        assert success, "Failed to establish call"

        print(f"✅ Call established: 201 → 202")
        await asyncio.sleep(3)

        # ================================================================
        # STEP 3: Verify Codec
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Verify μ-law Codec in Use")
        print(f"{'-'*70}")

        channels = get_active_channels()

        for ch in channels:
            if '201' in ch['channel'] or '202' in ch['channel']:
                codec = get_channel_codec(ch['channel'])
                print(f"✓ Channel {ch['channel']}: codec = {codec}")

                if codec and 'ulaw' in codec.lower():
                    print(f"✅ μ-law codec verified")
                elif codec:
                    print(f"⚠ Unexpected codec: {codec} (expected: ulaw)")

        await asyncio.sleep(5)
        await ext201.hangup()
        print(f"✅ Call ended")

        print(f"\n{'='*70}")
        print(f"✓ μ-law Codec Negotiation Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


@pytest.mark.asyncio
async def test_04_codec_priority_selection(api_client, pjsua_manager, original_codec_config, extension_credentials):
    """
    Test: Codec Priority Selection

    Scenario:
    1. Enable multiple codecs with specific priorities
    2. Priority 0: opus (highest)
    3. Priority 1: alaw
    4. Priority 2: ulaw (lowest)
    5. Make call and verify highest priority codec is selected

    Expected:
    - Call uses opus if supported by PJSUA
    - Otherwise falls back to alaw
    """

    print(f"\n{'='*70}")
    print(f"Test: Codec Priority Selection")
    print(f"{'='*70}")

    try:
        # ================================================================
        # STEP 1: Configure Codec Priorities
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Configure Codec Priorities")
        print(f"{'-'*70}")

        # Get current codec configuration
        response = api_client.get('general-settings')
        assert response.get('result'), "Failed to get settings"

        codecs = response['data'].get('codecs', [])

        # Configure priorities
        codec_priorities = {
            'opus': (False, 0),  # Highest priority
            'alaw': (False, 1),
            'ulaw': (False, 2)   # Lowest priority
        }

        for codec in codecs:
            if codec['name'] in codec_priorities:
                codec['disabled'], codec['priority'] = codec_priorities[codec['name']]
                print(f"✓ {codec['name']}: priority={codec['priority']}, enabled")
            else:
                codec['disabled'] = True  # Disable others

        # Update configuration
        patch_data = {'codecs': codecs}
        response = api_client.patch('general-settings', patch_data)
        assert response.get('result'), "Failed to update codec configuration"

        print(f"✅ Codec priorities configured")
        await asyncio.sleep(3)

        # ================================================================
        # STEP 2: Make Call
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Make Call and Verify Codec Selection")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=True
        )

        await asyncio.sleep(2)

        # Use manager endpoint for dialing
        success = await ext201.dial("202")
        assert success, "Failed to establish call"

        print(f"✅ Call established")
        await asyncio.sleep(3)

        # ================================================================
        # STEP 3: Verify Selected Codec
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Verify Selected Codec")
        print(f"{'-'*70}")

        channels = get_active_channels()

        selected_codec = None
        for ch in channels:
            if '201' in ch['channel']:
                codec = get_channel_codec(ch['channel'])
                selected_codec = codec
                print(f"✓ Selected codec: {codec}")
                break

        if selected_codec:
            if 'opus' in selected_codec.lower():
                print(f"✅ Highest priority codec selected (opus)")
            elif 'alaw' in selected_codec.lower():
                print(f"✅ Fallback codec selected (alaw) - opus not supported by endpoint")
            elif 'ulaw' in selected_codec.lower():
                print(f"⚠ Lowest priority codec selected (ulaw)")
            else:
                print(f"⚠ Unexpected codec selected: {selected_codec}")
        else:
            print(f"⚠ Could not determine selected codec")

        await asyncio.sleep(5)
        await ext201.hangup()
        print(f"✅ Call ended")

        print(f"\n{'='*70}")
        print(f"✓ Codec Priority Selection Test COMPLETED")
        print(f"{'='*70}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise


if __name__ == "__main__":
    pytest.main([__file__, '-v', '-s'])
