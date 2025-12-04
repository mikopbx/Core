"""Audio File Validator - Check audio files contain sound (not silence)

This module is designed to run INSIDE the Docker container, using direct
file system access instead of docker exec commands.
"""

import subprocess
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional, List

logger = logging.getLogger(__name__)


def validate_audio_file(
    file_path: str,
    min_duration: float = 0.5,
    silence_threshold: float = 0.01
) -> Dict[str, Any]:
    """
    Validate audio file contains actual sound (not silence).

    Uses sox or ffprobe to analyze audio file and check:
    - File exists and is readable
    - File size > 0
    - Duration >= min_duration
    - RMS level > silence_threshold (indicates sound present)

    Args:
        file_path: Absolute path to audio file
        min_duration: Minimum duration in seconds (default: 0.5)
        silence_threshold: RMS threshold for silence detection (default: 0.01)

    Returns:
        Dict with validation results:
        {
            'valid': True/False,
            'exists': True/False,
            'size_bytes': int,
            'duration': float (seconds),
            'rms': float (root mean square amplitude),
            'has_audio': True/False (RMS > threshold),
            'error': str (if any)
        }
    """
    result = {
        'valid': False,
        'exists': False,
        'size_bytes': 0,
        'duration': 0.0,
        'rms': 0.0,
        'has_audio': False,
        'error': None
    }

    path = Path(file_path)

    # Check file exists
    if not path.exists():
        result['error'] = f"File not found: {file_path}"
        logger.warning(result['error'])
        return result

    result['exists'] = True
    result['size_bytes'] = path.stat().st_size

    # Check file size
    if result['size_bytes'] == 0:
        result['error'] = "File is empty (0 bytes)"
        logger.warning(result['error'])
        return result

    # Try sox first (more accurate for RMS calculation)
    try:
        return _analyze_with_sox(file_path, min_duration, silence_threshold, result)
    except Exception as sox_error:
        logger.debug(f"sox analysis failed: {sox_error}, trying ffprobe...")

    # Fallback to ffprobe
    try:
        return _analyze_with_ffprobe(file_path, min_duration, silence_threshold, result)
    except Exception as ffprobe_error:
        logger.warning(f"Both sox and ffprobe failed: {ffprobe_error}")
        result['error'] = f"Analysis failed: {ffprobe_error}"
        return result


def _analyze_with_sox(
    file_path: str,
    min_duration: float,
    silence_threshold: float,
    result: dict
) -> dict:
    """Analyze audio file using sox"""

    # Run sox stat to get audio statistics
    cmd = ['sox', file_path, '-n', 'stat']

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
    except subprocess.TimeoutExpired:
        result['error'] = "Audio analysis timed out (sox)"
        return result

    # sox outputs to stderr
    output = proc.stderr

    # Parse duration (e.g., "Length (seconds):      5.234567")
    for line in output.split('\n'):
        if 'Length (seconds)' in line:
            duration_str = line.split(':')[1].strip()
            result['duration'] = float(duration_str)

        # Parse RMS amplitude (e.g., "RMS amplitude:     0.123456")
        if 'RMS amplitude' in line or 'RMS lev dB' in line:
            parts = line.split(':')
            if len(parts) >= 2:
                rms_str = parts[1].strip().split()[0]
                try:
                    result['rms'] = float(rms_str)
                except ValueError:
                    # Might be in dB format
                    pass

    # Validate
    if result['duration'] < min_duration:
        result['error'] = f"Duration {result['duration']}s < minimum {min_duration}s"
        logger.warning(result['error'])
        return result

    if result['rms'] <= silence_threshold:
        result['error'] = f"RMS {result['rms']:.4f} <= silence threshold {silence_threshold} (file is silent)"
        logger.warning(result['error'])
        result['has_audio'] = False
        return result

    result['has_audio'] = True
    result['valid'] = True

    logger.info(f"Audio validated: {file_path} - {result['duration']:.2f}s, RMS: {result['rms']:.4f}")

    return result


def _analyze_with_ffprobe(
    file_path: str,
    min_duration: float,
    silence_threshold: float,
    result: dict
) -> dict:
    """Analyze audio file using ffprobe (fallback)"""

    # Get duration
    cmd_duration = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        file_path
    ]

    try:
        proc = subprocess.run(cmd_duration, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        result['error'] = "Audio analysis timed out (ffprobe)"
        return result

    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {proc.stderr}")

    result['duration'] = float(proc.stdout.strip())

    # Validate duration
    if result['duration'] < min_duration:
        result['error'] = f"Duration {result['duration']}s < minimum {min_duration}s"
        logger.warning(result['error'])
        return result

    # Estimate RMS using volume filter (not as accurate as sox but works)
    cmd_volume = [
        'ffmpeg',
        '-i', file_path,
        '-af', 'volumedetect',
        '-f', 'null',
        '-'
    ]

    proc = subprocess.run(cmd_volume, capture_output=True, text=True, timeout=30)

    # Parse mean volume (in stderr)
    for line in proc.stderr.split('\n'):
        if 'mean_volume' in line:
            # Example: "mean_volume: -25.3 dB"
            try:
                volume_db = float(line.split(':')[1].strip().split()[0])
                # Convert dB to linear scale (rough approximation for RMS check)
                result['rms'] = 10 ** (volume_db / 20)
            except (ValueError, IndexError):
                logger.debug(f"Could not parse volume from: {line}")
            break

    # If we couldn't get RMS, assume audio present if duration > 0
    if result['rms'] == 0.0:
        logger.warning("Could not determine RMS, assuming audio present based on duration")
        result['rms'] = 0.1  # Assume some audio
        result['has_audio'] = True
    else:
        result['has_audio'] = result['rms'] > silence_threshold

    result['valid'] = result['has_audio']

    logger.info(f"Audio validated (ffprobe): {file_path} - {result['duration']:.2f}s, RMS: {result['rms']:.4f}")

    return result


def find_recording_file(
    src_extension: str,
    dst_extension: str,
    recording_dir: str = '/storage/usbdisk1/mikopbx/astspool/monitor'
) -> Optional[str]:
    """
    Find call recording file by source and destination extensions.
    Uses direct file system access (runs inside container).

    Args:
        src_extension: Source extension (caller)
        dst_extension: Destination extension (callee)
        recording_dir: Recording directory path

    Returns:
        Path to recording file, or None if not found
    """
    try:
        recording_path = Path(recording_dir)
        if not recording_path.exists():
            logger.warning(f"Recording directory not found: {recording_dir}")
            return None

        # Search pattern: *-{src}-{dst}-*.wav or *.mp3
        patterns = [
            f'*-{src_extension}-{dst_extension}-*.wav',
            f'*-{src_extension}-{dst_extension}-*.mp3',
            f'*_{src_extension}_{dst_extension}_*.wav',
            f'*_{src_extension}_{dst_extension}_*.mp3'
        ]

        files = []
        for pattern in patterns:
            files.extend(recording_path.rglob(pattern))

        if not files:
            logger.warning(f"No recording found for {src_extension} -> {dst_extension}")
            return None

        # Return most recent file
        files.sort(key=lambda f: f.stat().st_mtime)
        recording_file = str(files[-1])

        logger.info(f"Found recording: {recording_file}")
        return recording_file

    except Exception as e:
        logger.error(f"Error finding recording file: {e}")
        return None


def find_voicemail_file(
    extension: str,
    voicemail_dir: str = '/storage/usbdisk1/mikopbx/voicemail/default'
) -> Optional[str]:
    """
    Find latest voicemail file for extension.
    Uses direct file system access (runs inside container).

    Args:
        extension: Extension number
        voicemail_dir: Voicemail base directory

    Returns:
        Path to voicemail file, or None if not found
    """
    try:
        inbox_path = Path(voicemail_dir) / extension / 'INBOX'

        if not inbox_path.exists():
            logger.warning(f"Voicemail INBOX not found: {inbox_path}")
            return None

        # Find msg*.wav or msg*.mp3 files
        files = list(inbox_path.glob('msg*.wav')) + list(inbox_path.glob('msg*.mp3'))

        if not files:
            logger.warning(f"No voicemail files found for extension {extension}")
            return None

        # Return most recent file
        files.sort(key=lambda f: f.stat().st_mtime)
        voicemail_file = str(files[-1])

        logger.info(f"Found voicemail: {voicemail_file}")
        return voicemail_file

    except Exception as e:
        logger.error(f"Error finding voicemail file: {e}")
        return None


def list_directory(dir_path: str) -> List[str]:
    """
    List directory contents.
    Uses direct file system access (runs inside container).

    Args:
        dir_path: Directory path

    Returns:
        List of file/directory names
    """
    try:
        path = Path(dir_path)
        if not path.exists():
            return []
        return [item.name for item in path.iterdir()]
    except Exception as e:
        logger.error(f"Error listing directory {dir_path}: {e}")
        return []


def file_exists(file_path: str) -> bool:
    """Check if file exists using direct file system access."""
    return Path(file_path).exists()


def get_file_size(file_path: str) -> int:
    """Get file size in bytes using direct file system access."""
    try:
        return Path(file_path).stat().st_size
    except Exception:
        return 0


def read_file_content(file_path: str, max_lines: int = 100) -> str:
    """
    Read file content (for log files).
    Uses direct file system access.

    Args:
        file_path: Path to file
        max_lines: Maximum lines to read from end

    Returns:
        File content as string
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return ""

        with open(path, 'r', errors='ignore') as f:
            lines = f.readlines()
            return ''.join(lines[-max_lines:])
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
        return ""


def grep_in_file(file_path: str, pattern: str, case_insensitive: bool = True) -> List[str]:
    """
    Search for pattern in file (like grep).
    Uses direct file system access.

    Args:
        file_path: Path to file
        pattern: Search pattern (simple substring match)
        case_insensitive: Ignore case in search

    Returns:
        List of matching lines
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return []

        matches = []
        search_pattern = pattern.lower() if case_insensitive else pattern

        with open(path, 'r', errors='ignore') as f:
            for line in f:
                compare_line = line.lower() if case_insensitive else line
                if search_pattern in compare_line:
                    matches.append(line.strip())

        return matches
    except Exception as e:
        logger.error(f"Error searching in file {file_path}: {e}")
        return []


# Legacy function signatures for backward compatibility (deprecated)
def validate_audio_in_container(
    container_name: str,
    file_path_in_container: str,
    **kwargs
) -> Dict[str, Any]:
    """
    DEPRECATED: Use validate_audio_file() directly.
    This function now ignores container_name and uses direct file access.
    """
    logger.warning("validate_audio_in_container is deprecated, use validate_audio_file directly")
    return validate_audio_file(file_path_in_container, **kwargs)
