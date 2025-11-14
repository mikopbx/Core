"""Feature Codes Helper - Extract feature codes from general-settings API"""

from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


def get_feature_codes(api_client) -> Dict[str, str]:
    """
    Get feature codes from MikoPBX general-settings API.

    Args:
        api_client: Authenticated MikoPBXClient instance

    Returns:
        Dict with feature codes:
        {
            'parking_ext': '800',
            'parking_start': '801',
            'parking_end': '820',
            'blind_transfer': '**',
            'attended_transfer': '##',
            'pickup': '*8',
            'transfer_abort': '*0',
            'digit_timeout': '2500'
        }

    Example:
        >>> from conftest import MikoPBXClient
        >>> api_client = MikoPBXClient(url, user, pass)
        >>> api_client.authenticate()
        >>> codes = get_feature_codes(api_client)
        >>> print(f"Parking extension: {codes['parking_ext']}")
        Parking extension: 800
    """
    try:
        response = api_client.get('general-settings')

        if not response.get('result'):
            logger.error(f"Failed to get general settings: {response.get('messages')}")
            return _get_default_feature_codes()

        settings = response['data']['settings']

        feature_codes = {
            'parking_ext': str(settings.get('PBXCallParkingExt', '800')),
            'parking_start': str(settings.get('PBXCallParkingStartSlot', '801')),
            'parking_end': str(settings.get('PBXCallParkingEndSlot', '820')),
            'blind_transfer': str(settings.get('PBXFeatureBlindTransfer', '**')),
            'attended_transfer': str(settings.get('PBXFeatureAttendedTransfer', '##')),
            'pickup': str(settings.get('PBXFeaturePickupExten', '*8')),
            'transfer_abort': str(settings.get('PBXFeatureAtxferAbort', '*0')),
            'digit_timeout': str(settings.get('PBXFeatureDigitTimeout', '2500')),
            'atxfer_no_answer_timeout': str(settings.get('PBXFeatureAtxferNoAnswerTimeout', '45')),
            'transfer_digit_timeout': str(settings.get('PBXFeatureTransferDigitTimeout', '3'))
        }

        logger.info(f"Retrieved feature codes: {feature_codes}")
        return feature_codes

    except Exception as e:
        logger.error(f"Error getting feature codes: {e}")
        return _get_default_feature_codes()


def _get_default_feature_codes() -> Dict[str, str]:
    """Return default feature codes as fallback"""
    return {
        'parking_ext': '800',
        'parking_start': '801',
        'parking_end': '820',
        'blind_transfer': '**',
        'attended_transfer': '##',
        'pickup': '*8',
        'transfer_abort': '*0',
        'digit_timeout': '2500',
        'atxfer_no_answer_timeout': '45',
        'transfer_digit_timeout': '3'
    }


def get_enabled_codecs(api_client) -> List[str]:
    """
    Get list of enabled audio codecs from general-settings.

    Args:
        api_client: Authenticated MikoPBXClient instance

    Returns:
        List of codec names that are enabled (disabled=false)
        Example: ['opus', 'gsm']

    Example:
        >>> codecs = get_enabled_codecs(api_client)
        >>> print(f"Enabled codecs: {', '.join(codecs)}")
        Enabled codecs: opus, gsm
        >>> if 'alaw' in codecs:
        ...     print("A-law codec is enabled")
    """
    try:
        response = api_client.get('general-settings')

        if not response.get('result'):
            logger.error(f"Failed to get general settings: {response.get('messages')}")
            return []

        codecs = response['data'].get('codecs', [])

        # Filter enabled audio codecs
        enabled = [
            codec['name']
            for codec in codecs
            if codec.get('type') == 'audio' and not codec.get('disabled', True)
        ]

        logger.info(f"Enabled audio codecs: {enabled}")
        return enabled

    except Exception as e:
        logger.error(f"Error getting enabled codecs: {e}")
        return []


def get_all_codecs(api_client) -> List[Dict[str, any]]:
    """
    Get all codec configurations from general-settings.

    Args:
        api_client: Authenticated MikoPBXClient instance

    Returns:
        List of codec dictionaries with full information:
        [
            {'name': 'opus', 'type': 'audio', 'priority': 0, 'disabled': False, 'description': 'Opus'},
            {'name': 'alaw', 'type': 'audio', 'priority': 1, 'disabled': True, 'description': 'G.711 A-law'},
            ...
        ]

    Example:
        >>> codecs = get_all_codecs(api_client)
        >>> for codec in codecs:
        ...     if codec['type'] == 'audio' and not codec['disabled']:
        ...         print(f"{codec['name']}: {codec['description']}")
        opus: Opus
        gsm: GSM
    """
    try:
        response = api_client.get('general-settings')

        if not response.get('result'):
            logger.error(f"Failed to get general settings: {response.get('messages')}")
            return []

        codecs = response['data'].get('codecs', [])
        logger.debug(f"Retrieved {len(codecs)} codec configurations")

        return codecs

    except Exception as e:
        logger.error(f"Error getting codec configurations: {e}")
        return []


def enable_codec(api_client, codec_name: str, priority: int = 0) -> bool:
    """
    Enable specific codec and set its priority.

    Args:
        api_client: Authenticated MikoPBXClient instance
        codec_name: Codec name (e.g., 'alaw', 'ulaw', 'g729')
        priority: Codec priority (0 = highest priority)

    Returns:
        True if successful, False otherwise

    Example:
        >>> # Enable alaw codec with highest priority
        >>> success = enable_codec(api_client, 'alaw', priority=0)
        >>> if success:
        ...     print("A-law codec enabled")
    """
    try:
        # Get current codec configuration
        response = api_client.get('general-settings')

        if not response.get('result'):
            logger.error("Failed to get current settings")
            return False

        codecs = response['data'].get('codecs', [])

        # Find and update target codec
        codec_found = False
        for codec in codecs:
            if codec['name'] == codec_name:
                codec['disabled'] = False
                codec['priority'] = priority
                codec_found = True
                logger.info(f"Enabling codec {codec_name} with priority {priority}")
                break

        if not codec_found:
            logger.error(f"Codec {codec_name} not found in configuration")
            return False

        # Update settings via API
        patch_data = {'codecs': codecs}
        response = api_client.patch('general-settings', patch_data)

        if response.get('result'):
            logger.info(f"Successfully enabled codec: {codec_name}")
            return True
        else:
            logger.error(f"Failed to enable codec: {response.get('messages')}")
            return False

    except Exception as e:
        logger.error(f"Error enabling codec {codec_name}: {e}")
        return False


def disable_all_codecs_except(api_client, codec_names: List[str]) -> bool:
    """
    Disable all codecs except specified ones.

    Useful for testing specific codec negotiation.

    Args:
        api_client: Authenticated MikoPBXClient instance
        codec_names: List of codec names to keep enabled

    Returns:
        True if successful, False otherwise

    Example:
        >>> # Test only with alaw codec
        >>> success = disable_all_codecs_except(api_client, ['alaw'])
        >>> if success:
        ...     print("Only alaw codec enabled")
    """
    try:
        # Get current codec configuration
        response = api_client.get('general-settings')

        if not response.get('result'):
            logger.error("Failed to get current settings")
            return False

        codecs = response['data'].get('codecs', [])

        # Update codecs: enable only specified, disable others
        for codec in codecs:
            if codec.get('type') == 'audio':
                if codec['name'] in codec_names:
                    codec['disabled'] = False
                    logger.debug(f"Keeping codec enabled: {codec['name']}")
                else:
                    codec['disabled'] = True
                    logger.debug(f"Disabling codec: {codec['name']}")

        # Update settings via API
        patch_data = {'codecs': codecs}
        response = api_client.patch('general-settings', patch_data)

        if response.get('result'):
            logger.info(f"Successfully configured codecs: enabled={codec_names}")
            return True
        else:
            logger.error(f"Failed to configure codecs: {response.get('messages')}")
            return False

    except Exception as e:
        logger.error(f"Error configuring codecs: {e}")
        return False
