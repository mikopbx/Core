#!/usr/bin/env python3
"""
Test suite for System Health verification

Validates that critical system components are functional:
- ffmpeg compiled with libopus encoder (required for wav48 → webm conversion)
- S3 client library integrity (aws-sdk-php vendor files present)
- Audio conversion pipeline (wav48 → webm end-to-end)

These tests catch build/packaging regressions that API-level tests miss:
- ffmpeg without libopus returns error_code:3, .webm never created
- Missing vendor files cause PHP Fatal errors in background workers

Total: 9 tests
"""

import json
import time
from pathlib import Path

import pytest
from conftest import assert_api_success


# Path to sample wav48 recording fixture (real call recording, 48kHz Opus-quality)
SAMPLE_WAV48 = Path(__file__).parent / 'fixtures' / 'sample_call.wav48'

# Conversion task directory inside MikoPBX container
CONVERSION_TASKS_DIR = '/storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks'

# Monitor base directory
MONITOR_DIR = '/storage/usbdisk1/mikopbx/astspool/monitor'


def exec_bash(api_client, command: str, timeout: int = 30) -> dict:
    """Execute bash command on MikoPBX and return response data.

    Returns dict with keys: command, output, exitCode, timeout
    Raises AssertionError if API call itself fails.
    """
    response = api_client.post('system:executeBashCommand', {
        'command': command,
        'timeout': timeout,
    })
    assert_api_success(response, f"Failed to execute: {command[:80]}")
    return response['data']


class TestFfmpegCodecs:
    """Verify ffmpeg is compiled with required audio codecs"""

    def test_01_ffmpeg_installed(self, api_client):
        """Verify ffmpeg binary is available"""
        result = exec_bash(api_client, 'which ffmpeg')
        assert result['exitCode'] == 0, "ffmpeg binary not found in PATH"
        assert '/ffmpeg' in result['output'], f"Unexpected ffmpeg path: {result['output']}"
        print(f"  ffmpeg path: {result['output'].strip()}")

    def test_02_ffmpeg_version(self, api_client):
        """Check ffmpeg version (informational)"""
        result = exec_bash(api_client, 'ffmpeg -version 2>&1 | head -2')
        assert result['exitCode'] == 0, "ffmpeg -version failed"
        print(f"  {result['output'].strip()}")

    def test_03_ffmpeg_has_libopus_encoder(self, api_client):
        """Verify ffmpeg has libopus encoder — required for wav48 → webm conversion.

        Without libopus, ffmpeg can decode opus but cannot encode,
        causing all call recording conversions to fail with error_code:3.
        The built-in 'opus' codec is decode-only.
        """
        result = exec_bash(api_client, 'ffmpeg -encoders 2>/dev/null | grep -i opus')
        assert result['exitCode'] == 0, "No opus-related encoders found"

        output = result['output'].strip()
        print(f"  Opus encoders found:\n  {output}")

        assert 'libopus' in output, (
            "ffmpeg compiled WITHOUT libopus encoder. "
            "wav48 → webm (opus) conversion will fail. "
            "Rebuild ffmpeg with --enable-libopus"
        )

    def test_04_ffprobe_installed(self, api_client):
        """Verify ffprobe binary is available (used for conversion validation)"""
        result = exec_bash(api_client, 'which ffprobe')
        assert result['exitCode'] == 0, "ffprobe binary not found in PATH"
        print(f"  ffprobe path: {result['output'].strip()}")


class TestS3LibraryIntegrity:
    """Verify S3 client library (aws-sdk-php) is intact"""

    def test_01_aws_sdk_autoload(self, api_client):
        """Verify aws-sdk-php vendor autoload works without fatal errors.

        A missing ConfigurationProvider.php causes PHP Fatal error
        in WorkerS3Upload, but the error is only visible in system logs —
        API endpoints return generic 'failed' status.
        """
        # Use PHP to test autoload directly — this catches missing files
        php_cmd = (
            "php -r \""
            "require_once '/offload/rootfs/usr/www/vendor/autoload.php'; "
            "echo class_exists('Aws\\\\S3\\\\S3Client') ? 'OK' : 'MISSING';"
            "\" 2>&1"
        )
        result = exec_bash(api_client, php_cmd)

        output = result['output'].strip()
        print(f"  Aws\\S3\\S3Client class: {output}")

        # Check for PHP fatal/warning in output
        assert 'Fatal' not in output, f"PHP Fatal error loading AWS SDK: {output}"
        assert 'Warning' not in output, f"PHP Warning loading AWS SDK: {output}"
        assert 'Failed to open stream' not in output, f"Missing vendor file: {output}"
        assert output == 'OK', f"Aws\\S3\\S3Client class not available: {output}"

    def test_02_s3_configuration_provider_exists(self, api_client):
        """Verify the specific file that was reported missing exists.

        Known regression: aws-sdk-php/src/DefaultsMode/ConfigurationProvider.php
        was missing in broken builds, causing all S3 uploads to fail.
        """
        check_cmd = (
            'test -f /offload/rootfs/usr/www/vendor/aws/aws-sdk-php'
            '/src/DefaultsMode/ConfigurationProvider.php '
            '&& echo "EXISTS" || echo "MISSING"'
        )
        result = exec_bash(api_client, check_cmd)

        output = result['output'].strip()
        print(f"  ConfigurationProvider.php: {output}")

        assert output == 'EXISTS', (
            "aws-sdk-php/src/DefaultsMode/ConfigurationProvider.php is MISSING. "
            "S3 upload worker will fail with 'Failed to open stream'. "
            "Reinstall vendor: composer install --no-dev"
        )

    def test_03_s3_test_connection_no_php_fatal(self, api_client):
        """Verify S3 testConnection endpoint doesn't cause PHP Fatal errors.

        Even with invalid/empty credentials, the endpoint should return
        a structured error response — not a PHP Fatal.
        We check system logs for new PHP errors after the call.
        """
        # Get log baseline
        baseline = exec_bash(
            api_client,
            'wc -l < /storage/usbdisk1/mikopbx/log/system/messages'
        )
        baseline_lines = int(baseline['output'].strip())

        # Call testConnection (expected to fail with config error, NOT with Fatal)
        response = api_client.post('s3-storage:testConnection', {})
        # We don't assert success — connection is expected to fail.
        # We only care that it returned a proper response, not a crash.
        assert 'result' in response, "S3 testConnection should return structured response"
        print(f"  S3 testConnection result: {response.get('result')}")
        if response.get('messages'):
            print(f"  Messages: {response['messages']}")

        # Check that no new PHP fatal errors appeared in logs
        time.sleep(1)  # Brief wait for log flush
        check_cmd = (
            f'tail -n +{baseline_lines + 1} '
            '/storage/usbdisk1/mikopbx/log/system/messages '
            '| grep -i "Fatal error\\|Failed to open stream" || true'
        )
        log_result = exec_bash(api_client, check_cmd)
        new_fatals = log_result['output'].strip()

        assert not new_fatals, (
            f"PHP Fatal errors detected after S3 testConnection call:\n{new_fatals}"
        )


class TestAudioConversionPipeline:
    """End-to-end test of wav48 → webm (opus) conversion pipeline"""

    test_uniqueid = None
    test_file_path = None

    def test_01_upload_wav48_fixture(self, api_client):
        """Upload sample wav48 recording to MikoPBX monitor directory"""
        if not SAMPLE_WAV48.exists():
            pytest.skip(f"Fixture not found: {SAMPLE_WAV48}")

        # Create a unique test file name
        test_id = f'test-health-{int(time.time())}'
        self.__class__.test_uniqueid = test_id

        # Create target directory (today's date structure)
        target_dir = f'{MONITOR_DIR}/health-check'
        exec_bash(api_client, f'mkdir -p {target_dir}')

        # Upload via API (base64 through bash is ugly, use the files:upload endpoint)
        target_path = f'{target_dir}/{test_id}.wav48'
        self.__class__.test_file_path = target_path

        # Upload the file using files:upload, then copy to monitor dir
        upload_response = api_client.upload_file(
            'files:upload',
            str(SAMPLE_WAV48),
            params={'category': 'temp'}
        )
        assert_api_success(upload_response, "Failed to upload wav48 fixture")

        upload_id = upload_response.get('data', {}).get('upload_id', '')

        # Wait for merge
        merged_path = None
        for i in range(15):
            time.sleep(1)
            status = api_client.get('files:uploadStatus', params={'id': upload_id})
            if status.get('result'):
                status_data = status.get('data', {})
                if status_data.get('d_status') == 'UPLOAD_COMPLETE':
                    merged_path = status_data.get('upload_file_path', '')
                    break

        assert merged_path, "Failed to upload wav48 fixture file"

        # Move to monitor directory with proper name
        exec_bash(api_client, f'cp "{merged_path}" "{target_path}"')

        # Verify file exists and has content
        result = exec_bash(api_client, f'stat -c %s "{target_path}" 2>/dev/null || echo 0')
        file_size = int(result['output'].strip())
        assert file_size > 1000, f"Uploaded file too small: {file_size} bytes"

        print(f"  Uploaded wav48: {target_path} ({file_size} bytes)")

    def test_02_create_conversion_task(self, api_client):
        """Create a conversion task JSON file for WorkerWav2Webm"""
        if not self.test_uniqueid or not self.test_file_path:
            pytest.skip("No test file uploaded")

        # Create conversion task matching WorkerWav2Webm expected format
        task = {
            'linkedid': self.test_uniqueid,
            'src_num': '200',
            'dst_num': '201',
            'start': time.strftime('%Y-%m-%d %H:%M:%S'),
            'duration': '',
            'billsec': 23,
            'disposition': '',
            'uniqueid': self.test_uniqueid,
            'input_path': self.test_file_path.replace('.wav48', ''),
            'delete_source': '0',
            'created_at': int(time.time()),
        }

        task_json = json.dumps(task, indent=4)
        task_filename = f'{CONVERSION_TASKS_DIR}/{self.test_uniqueid}.json'

        # Write task file via bash (escape JSON for shell)
        write_cmd = f"cat > '{task_filename}' << 'TASK_EOF'\n{task_json}\nTASK_EOF"
        exec_bash(api_client, write_cmd)

        # Verify task file was created
        result = exec_bash(api_client, f'test -f "{task_filename}" && echo EXISTS || echo MISSING')
        assert result['output'].strip() == 'EXISTS', f"Failed to create task file: {task_filename}"

        print(f"  Created conversion task: {task_filename}")

    def test_03_wait_for_conversion(self, api_client):
        """Wait for WorkerWav2Webm to pick up and process the task.

        Worker scans for .json files every few seconds.
        Successful conversion: .json removed, .webm created.
        Failed conversion: .json renamed to .failed.json after max retries.
        """
        if not self.test_uniqueid:
            pytest.skip("No conversion task created")

        assert self.test_file_path is not None, "No test file path set"

        task_file = f'{CONVERSION_TASKS_DIR}/{self.test_uniqueid}.json'
        failed_file = f'{CONVERSION_TASKS_DIR}/{self.test_uniqueid}.failed.json'
        webm_file = f'{self.test_file_path.replace(".wav48", "")}.webm'

        max_wait = 60  # seconds
        poll_interval = 3
        waited = 0

        print(f"  Waiting for conversion (up to {max_wait}s)...")
        print(f"  Expected output: {webm_file}")

        for _ in range(0, max_wait, poll_interval):
            time.sleep(poll_interval)
            waited += poll_interval

            # Check if task was processed
            check_cmd = (
                f'echo "task:$(test -f "{task_file}" && echo YES || echo NO)"; '
                f'echo "failed:$(test -f "{failed_file}" && echo YES || echo NO)"; '
                f'echo "webm:$(test -f "{webm_file}" && echo YES || echo NO)"'
            )
            result = exec_bash(api_client, check_cmd)
            output = result['output'].strip()

            status = {}
            for line in output.split('\n'):
                key, val = line.split(':')
                status[key] = val.strip()

            print(f"  [{waited}s] task={status.get('task')} "
                  f"failed={status.get('failed')} webm={status.get('webm')}")

            # Success: task consumed and webm created
            if status.get('webm') == 'YES':
                print(f"  Conversion completed successfully!")
                return

            # Failure: task moved to .failed.json
            if status.get('failed') == 'YES':
                # Read failure details
                fail_data = exec_bash(api_client, f'cat "{failed_file}"')
                pytest.fail(
                    f"Conversion FAILED (task moved to .failed.json).\n"
                    f"This usually means ffmpeg cannot encode opus.\n"
                    f"Task details:\n{fail_data['output']}"
                )

            # Task still pending (not yet picked up by worker)
            if status.get('task') == 'NO' and status.get('webm') == 'NO':
                # Task was consumed but no output — check for errors
                pytest.fail(
                    "Conversion task consumed but no .webm or .failed.json found. "
                    "Check WorkerWav2Webm logs."
                )

        pytest.fail(
            f"Conversion did not complete within {max_wait}s. "
            f"WorkerWav2Webm may not be running."
        )

    def test_04_validate_webm_output(self, api_client):
        """Validate the converted webm file using ffprobe"""
        if not self.test_file_path or not self.test_uniqueid:
            pytest.skip("No conversion result to validate")

        webm_file = f'{self.test_file_path.replace(".wav48", "")}.webm'

        # Check file size (must be > 100 bytes per WorkerWav2Webm validation)
        size_result = exec_bash(api_client, f'stat -c %s "{webm_file}" 2>/dev/null || echo 0')
        file_size = int(size_result['output'].strip())

        if file_size == 0:
            pytest.skip("No webm file to validate (conversion may have failed)")

        assert file_size > 100, f"WebM file too small ({file_size} bytes), likely corrupted"
        print(f"  WebM file size: {file_size} bytes")

        # Validate with ffprobe
        probe_cmd = (
            f'ffprobe -v error -show_entries stream=codec_name,sample_rate,channels '
            f'-of json "{webm_file}" 2>&1'
        )
        probe_result = exec_bash(api_client, probe_cmd)
        output = probe_result['output'].strip()

        assert probe_result['exitCode'] == 0, f"ffprobe failed on webm file: {output}"

        # Parse ffprobe JSON output
        probe_data = json.loads(output)
        streams = probe_data.get('streams', [])
        assert len(streams) > 0, "WebM file has no audio streams"

        audio = streams[0]
        print(f"  Codec: {audio.get('codec_name')}")
        print(f"  Sample rate: {audio.get('sample_rate')}")
        print(f"  Channels: {audio.get('channels')}")

        assert audio.get('codec_name') == 'opus', (
            f"Expected opus codec, got: {audio.get('codec_name')}"
        )

    def test_05_cleanup(self, api_client):
        """Remove test files from monitor directory"""
        if not self.test_uniqueid:
            pytest.skip("Nothing to clean up")

        cleanup_cmds = [
            f'rm -f {MONITOR_DIR}/health-check/{self.test_uniqueid}*',
            f'rm -f {CONVERSION_TASKS_DIR}/{self.test_uniqueid}*',
        ]
        for cmd in cleanup_cmds:
            exec_bash(api_client, cmd)

        print(f"  Cleaned up test files for {self.test_uniqueid}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
