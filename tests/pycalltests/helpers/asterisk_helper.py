"""Asterisk CLI Helper - Execute Asterisk commands via Docker"""

import subprocess
import logging
import sys
from pathlib import Path
from typing import List, Dict, Optional

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "api"))
from config import get_config

logger = logging.getLogger(__name__)


def exec_asterisk_cli(
    command: str,
    container_name: Optional[str] = None,
    timeout: int = 10
) -> str:
    """
    Execute Asterisk CLI command inside Docker container.

    Args:
        command: Asterisk CLI command (without 'asterisk -rx')
        container_name: Docker container name (uses config if not specified)
        timeout: Command timeout in seconds

    Returns:
        Command output as string

    Example:
        >>> output = exec_asterisk_cli('core show channels')
        >>> print(output)
        Channel              Location             State   Application(Data)
        ...
    """
    if container_name is None:
        container_name = get_config().container_name

    cmd = [
        'docker', 'exec', container_name,
        'asterisk', '-rx', command
    ]

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if proc.returncode != 0:
            logger.error(f"Asterisk CLI command failed: {proc.stderr}")
            return ""

        return proc.stdout

    except subprocess.TimeoutExpired:
        logger.error(f"Asterisk CLI command timed out: {command}")
        return ""
    except Exception as e:
        logger.error(f"Failed to execute Asterisk CLI: {e}")
        return ""


def get_active_channels(container_name: Optional[str] = None) -> List[Dict]:
    """
    Get list of active Asterisk channels.

    Returns:
        List of dicts with channel info:
        [
            {'channel': 'PJSIP/201-00000001', 'context': 'from-internal', 'state': 'Up'},
            ...
        ]

    Example:
        >>> channels = get_active_channels()
        >>> for ch in channels:
        ...     print(f"{ch['channel']} is {ch['state']}")
        PJSIP/201-00000001 is Up
    """
    output = exec_asterisk_cli('core show channels concise', container_name)

    if not output:
        return []

    channels = []
    lines = output.strip().split('\n')

    # Parse concise format: Channel!Context!Extension!Priority!State!Application!Data!CallerID!AccountCode!Duration!BridgedChannel!BridgedUniqueID
    for line in lines:
        if line and '!' in line:
            parts = line.split('!')
            if len(parts) >= 5:
                channels.append({
                    'channel': parts[0],
                    'context': parts[1],
                    'extension': parts[2],
                    'state': parts[4],
                    'application': parts[5] if len(parts) > 5 else ''
                })

    logger.debug(f"Found {len(channels)} active channels")
    return channels


def get_channel_count(container_name: Optional[str] = None) -> int:
    """
    Get count of active channels.

    Returns:
        Number of active channels

    Example:
        >>> count = get_channel_count()
        >>> print(f"Active channels: {count}")
        Active channels: 2
    """
    output = exec_asterisk_cli('core show channels', container_name)

    if not output:
        return 0

    # Look for summary line: "2 active channels"
    for line in output.split('\n'):
        if 'active channel' in line.lower():
            try:
                count = int(line.split()[0])
                return count
            except (ValueError, IndexError):
                pass

    return 0


def get_channel_codec(channel_id: str, container_name: Optional[str] = None) -> Optional[str]:
    """
    Get codec used in specific channel.

    Args:
        channel_id: Channel ID (e.g., 'PJSIP/201-00000001')
        container_name: Docker container name

    Returns:
        Codec name (e.g., 'ulaw', 'alaw', 'opus') or None if not found

    Example:
        >>> codec = get_channel_codec('PJSIP/201-00000001')
        >>> print(f"Using codec: {codec}")
        Using codec: ulaw
    """
    # Try pjsip show channelstats
    output = exec_asterisk_cli(f'pjsip show channelstats {channel_id}', container_name)

    if output:
        # Look for codec info in output
        for line in output.split('\n'):
            if 'Codec' in line or 'codec' in line:
                # Parse codec name
                parts = line.split(':')
                if len(parts) >= 2:
                    codec = parts[1].strip().lower()
                    # Extract just codec name (remove parameters)
                    codec = codec.split()[0].split('(')[0]
                    logger.debug(f"Found codec via channelstats: {codec}")
                    return codec

    # Fallback: try core show channel
    output = exec_asterisk_cli(f'core show channel {channel_id}', container_name)

    for line in output.split('\n'):
        if 'Native Formats' in line or 'Read Format' in line or 'Write Format' in line:
            # Example: "Native Formats:       (ulaw|alaw)" or "Read Format:     ulaw"
            parts = line.split(':')
            if len(parts) >= 2:
                formats = parts[1].strip()
                # Extract first codec
                codec = formats.split('|')[0].strip('() ').lower()
                logger.debug(f"Found codec via core show channel: {codec}")
                return codec

    logger.warning(f"Could not determine codec for channel {channel_id}")
    return None


def check_parking_lot(container_name: Optional[str] = None) -> Dict[str, Dict]:
    """
    Get parking lot status with parked calls.

    Returns:
        Dict mapping parking slot to call info:
        {
            '801': {'channel': 'PJSIP/201-00000001', 'timeout': 45, 'parker': '202'},
            '802': {'channel': 'PJSIP/203-00000002', 'timeout': 38, 'parker': '202'},
        }

    Example:
        >>> parked = check_parking_lot()
        >>> for slot, info in parked.items():
        ...     print(f"Slot {slot}: {info['channel']} (parked by {info['parker']})")
        Slot 801: PJSIP/201-00000001 (parked by 202)
    """
    output = exec_asterisk_cli('core show calls', container_name)

    parked = {}

    # Alternative: try parkedcalls show if available
    parking_output = exec_asterisk_cli('parkedcalls show', container_name)

    if parking_output and 'No parked calls' not in parking_output:
        # Parse parkedcalls output
        for line in parking_output.split('\n'):
            # Example: "801         PJSIP/201-00000001  45s   202"
            parts = line.split()
            if len(parts) >= 3 and parts[0].isdigit():
                slot = parts[0]
                channel = parts[1]
                timeout_str = parts[2] if len(parts) > 2 else '0s'
                parker = parts[3] if len(parts) > 3 else 'unknown'

                # Parse timeout
                timeout = 0
                if timeout_str.endswith('s'):
                    try:
                        timeout = int(timeout_str[:-1])
                    except ValueError:
                        pass

                parked[slot] = {
                    'channel': channel,
                    'timeout': timeout,
                    'parker': parker
                }

    # Fallback: parse from core show calls
    if not parked:
        for line in output.split('\n'):
            if 'Park' in line or 'park' in line:
                # Try to extract slot and channel
                parts = line.split()
                for i, part in enumerate(parts):
                    if part.isdigit() and 800 <= int(part) <= 900:
                        slot = part
                        if i > 0:
                            channel = parts[i-1]
                            parked[slot] = {
                                'channel': channel,
                                'timeout': 0,
                                'parker': 'unknown'
                            }

    logger.debug(f"Found {len(parked)} parked calls")
    return parked


def verify_extension_registered(
    extension: str,
    container_name: Optional[str] = None
) -> bool:
    """
    Check if SIP extension is registered.

    Args:
        extension: Extension number (e.g., '201')
        container_name: Docker container name

    Returns:
        True if registered, False otherwise

    Example:
        >>> if verify_extension_registered('201'):
        ...     print("Extension 201 is registered")
        Extension 201 is registered
    """
    output = exec_asterisk_cli(f'pjsip show endpoint {extension}', container_name)

    if not output or 'Unable to find' in output:
        logger.debug(f"Extension {extension} not found or not registered")
        return False

    # Check for "Contacts:" section with valid contact
    in_contacts_section = False
    for line in output.split('\n'):
        if 'Contact:' in line or 'Contacts:' in line:
            in_contacts_section = True
            continue

        if in_contacts_section and 'sip:' in line.lower():
            # Has at least one contact = registered
            logger.debug(f"Extension {extension} is registered")
            return True

    logger.debug(f"Extension {extension} has no active contacts")
    return False


def get_call_duration(
    channel_id: str,
    container_name: Optional[str] = None
) -> Optional[int]:
    """
    Get call duration for specific channel in seconds.

    Args:
        channel_id: Channel ID
        container_name: Docker container name

    Returns:
        Duration in seconds, or None if not found

    Example:
        >>> duration = get_call_duration('PJSIP/201-00000001')
        >>> if duration:
        ...     print(f"Call duration: {duration}s")
        Call duration: 45s
    """
    output = exec_asterisk_cli(f'core show channel {channel_id}', container_name)

    for line in output.split('\n'):
        if 'Elapsed Time:' in line:
            # Example: "Elapsed Time:       0h:0m:45s"
            try:
                time_str = line.split(':')[1].strip()
                # Parse h:m:s format
                parts = time_str.replace('h', ':').replace('m', ':').replace('s', '').split(':')
                hours = int(parts[0]) if len(parts) > 0 else 0
                minutes = int(parts[1]) if len(parts) > 1 else 0
                seconds = int(parts[2]) if len(parts) > 2 else 0

                total_seconds = hours * 3600 + minutes * 60 + seconds
                return total_seconds
            except (ValueError, IndexError):
                pass

    return None


def check_moh_playing(
    channel_id: str,
    container_name: Optional[str] = None
) -> bool:
    """
    Check if Music On Hold is playing on channel.

    Args:
        channel_id: Channel ID
        container_name: Docker container name

    Returns:
        True if MOH is playing, False otherwise

    Example:
        >>> if check_moh_playing('PJSIP/201-00000001'):
        ...     print("MOH is playing")
        MOH is playing
    """
    output = exec_asterisk_cli(f'core show channel {channel_id}', container_name)

    # Look for MOH indicators
    for line in output.split('\n'):
        if 'Application:' in line and ('MusicOnHold' in line or 'MOH' in line):
            return True

        if 'Music' in line and 'Hold' in line:
            return True

    return False


def get_bridged_channel(
    channel_id: str,
    container_name: Optional[str] = None
) -> Optional[str]:
    """
    Get the channel that is bridged (in call) with specified channel.

    Args:
        channel_id: Channel ID
        container_name: Docker container name

    Returns:
        Bridged channel ID, or None if not bridged

    Example:
        >>> bridged = get_bridged_channel('PJSIP/201-00000001')
        >>> if bridged:
        ...     print(f"201 is talking to: {bridged}")
        201 is talking to: PJSIP/202-00000002
    """
    output = exec_asterisk_cli(f'core show channel {channel_id}', container_name)

    for line in output.split('\n'):
        if 'Bridged to' in line or 'Bridged Channel' in line:
            # Extract channel ID
            parts = line.split(':')
            if len(parts) >= 2:
                bridged = parts[1].strip()
                logger.debug(f"Channel {channel_id} bridged to {bridged}")
                return bridged

    # Try concise format
    output = exec_asterisk_cli('core show channels concise', container_name)

    for line in output.split('\n'):
        if channel_id in line and '!' in line:
            parts = line.split('!')
            # Bridged channel is typically at index 10
            if len(parts) > 10 and parts[10]:
                logger.debug(f"Channel {channel_id} bridged to {parts[10]}")
                return parts[10]

    return None


def restart_asterisk(container_name: Optional[str] = None) -> bool:
    """
    Restart Asterisk service in container.

    Args:
        container_name: Docker container name

    Returns:
        True if successful, False otherwise

    Example:
        >>> if restart_asterisk():
        ...     print("Asterisk restarted")
        Asterisk restarted
    """
    try:
        # Use asterisk restart command
        output = exec_asterisk_cli('core restart now', container_name)

        if output and 'restarting' in output.lower():
            logger.info("Asterisk restart initiated")
            return True

        logger.warning(f"Unexpected restart output: {output}")
        return False

    except Exception as e:
        logger.error(f"Failed to restart Asterisk: {e}")
        return False


def reload_asterisk_config(container_name: Optional[str] = None) -> bool:
    """
    Reload Asterisk configuration without restart.

    Args:
        container_name: Docker container name

    Returns:
        True if successful, False otherwise

    Example:
        >>> if reload_asterisk_config():
        ...     print("Configuration reloaded")
        Configuration reloaded
    """
    try:
        output = exec_asterisk_cli('core reload', container_name)

        if output:
            logger.info("Asterisk configuration reload initiated")
            return True

        return False

    except Exception as e:
        logger.error(f"Failed to reload config: {e}")
        return False
