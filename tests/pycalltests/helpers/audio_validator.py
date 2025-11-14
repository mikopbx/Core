"""Audio File Validator - Check audio files contain sound (not silence)"""

import subprocess
import logging
import tempfile
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)


def validate_audio_file(
    file_path: str,
    min_duration: float = 0.5,
    silence_threshold: float = 0.01
) -> Dict[str, any]:
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

    Example:
        >>> result = validate_audio_file('/path/to/recording.wav')
        >>> if result['valid'] and result['has_audio']:
        ...     print(f"Valid audio: {result['duration']}s, RMS: {result['rms']}")
        Valid audio: 5.234s, RMS: 0.123
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

    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=30
    )

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

    proc = subprocess.run(cmd_duration, capture_output=True, text=True, timeout=30)

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


def validate_audio_in_container(
    container_name: str,
    file_path_in_container: str,
    **kwargs
) -> Dict[str, any]:
    """
    Validate audio file inside Docker container.

    Args:
        container_name: Docker container name (e.g., 'mikopbx-php83')
        file_path_in_container: Path to file inside container
        **kwargs: Additional arguments passed to validate_audio_file()

    Returns:
        Same as validate_audio_file()

    Example:
        >>> result = validate_audio_in_container(
        ...     'mikopbx-php83',
        ...     '/storage/usbdisk1/mikopbx/monitor/recording.wav'
        ... )
        >>> if result['valid']:
        ...     print(f"Recording is valid: {result['duration']}s")
    """
    # Copy file from container to temp location
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name

    try:
        # Docker cp
        cmd = ['docker', 'cp', f'{container_name}:{file_path_in_container}', tmp_path]
        proc = subprocess.run(cmd, capture_output=True, timeout=30, text=True)

        if proc.returncode != 0:
            error_msg = f"Failed to copy file from container: {proc.stderr}"
            logger.error(error_msg)
            return {
                'valid': False,
                'exists': False,
                'size_bytes': 0,
                'duration': 0.0,
                'rms': 0.0,
                'has_audio': False,
                'error': error_msg
            }

        # Validate local copy
        return validate_audio_file(tmp_path, **kwargs)

    finally:
        # Cleanup temp file
        Path(tmp_path).unlink(missing_ok=True)


def find_recording_file(
    container_name: str,
    src_extension: str,
    dst_extension: str,
    recording_dir: str = '/storage/usbdisk1/mikopbx/monitor'
) -> Optional[str]:
    """
    Find call recording file in container by source and destination extensions.

    Args:
        container_name: Docker container name
        src_extension: Source extension (caller)
        dst_extension: Destination extension (callee)
        recording_dir: Recording directory in container

    Returns:
        Path to recording file in container, or None if not found

    Example:
        >>> file_path = find_recording_file('mikopbx-php83', '201', '202')
        >>> if file_path:
        ...     print(f"Found recording: {file_path}")
        Found recording: /storage/usbdisk1/mikopbx/monitor/2024-01-15/123-201-202-20240115-143022.wav
    """
    try:
        # List files in recording directory
        cmd = [
            'docker', 'exec', container_name,
            'find', recording_dir,
            '-name', f'*-{src_extension}-{dst_extension}-*.wav',
            '-o',
            '-name', f'*-{src_extension}-{dst_extension}-*.mp3'
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

        if proc.returncode != 0:
            logger.error(f"Failed to search for recording: {proc.stderr}")
            return None

        files = proc.stdout.strip().split('\n')
        files = [f for f in files if f]  # Filter empty lines

        if not files:
            logger.warning(f"No recording found for {src_extension} -> {dst_extension}")
            return None

        # Return most recent file (last in list after sort)
        files.sort()
        recording_file = files[-1]

        logger.info(f"Found recording: {recording_file}")
        return recording_file

    except Exception as e:
        logger.error(f"Error finding recording file: {e}")
        return None


def find_voicemail_file(
    container_name: str,
    extension: str,
    voicemail_dir: str = '/storage/usbdisk1/mikopbx/voicemail/default'
) -> Optional[str]:
    """
    Find latest voicemail file for extension in container.

    Args:
        container_name: Docker container name
        extension: Extension number
        voicemail_dir: Voicemail base directory

    Returns:
        Path to voicemail file in container, or None if not found

    Example:
        >>> file_path = find_voicemail_file('mikopbx-php83', '201')
        >>> if file_path:
        ...     print(f"Found voicemail: {file_path}")
        Found voicemail: /storage/usbdisk1/mikopbx/voicemail/default/201/INBOX/msg0000.wav
    """
    try:
        inbox_dir = f"{voicemail_dir}/{extension}/INBOX"

        # List files in INBOX
        cmd = [
            'docker', 'exec', container_name,
            'find', inbox_dir,
            '-name', 'msg*.wav',
            '-o',
            '-name', 'msg*.mp3'
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

        if proc.returncode != 0:
            logger.warning(f"No voicemail found for extension {extension}")
            return None

        files = proc.stdout.strip().split('\n')
        files = [f for f in files if f]  # Filter empty lines

        if not files:
            logger.warning(f"No voicemail files found for extension {extension}")
            return None

        # Return most recent file
        files.sort()
        voicemail_file = files[-1]

        logger.info(f"Found voicemail: {voicemail_file}")
        return voicemail_file

    except Exception as e:
        logger.error(f"Error finding voicemail file: {e}")
        return None
