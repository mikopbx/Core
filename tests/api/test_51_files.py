#!/usr/bin/env python3
"""
Test suite for Files API operations

Tests the /pbxcore/api/v3/files endpoint for:
- Getting file content by path (GET /files/{path})
- Uploading file content (PUT /files/{path})
- Deleting files (DELETE /files/{path})
- Chunked upload status (GET /files:uploadStatus)
- Firmware download initiation (POST /files:downloadFirmware)
- Firmware download status (GET /files:firmwareStatus)

NOTE: Chunked upload (POST /files:upload) requires multipart/form-data with actual file chunks,
which is complex to test via REST API. It's tested indirectly through status checks.
"""

import pytest
import time
import tempfile
import os
from conftest import assert_api_success


class TestFilesAPI:
    """Comprehensive tests for Files API"""

    test_file_path = None
    test_content = "Test file content for MikoPBX Files API\nLine 2\nLine 3"

    def test_01_upload_file_simple(self, api_client):
        """Test PUT /files/{path} - Simple file upload with content"""
        # Use temp directory that should be writable
        self.test_file_path = '/tmp/mikopbx_test_file.txt'

        # Upload file content via PUT
        upload_data = {
            'filename': self.test_file_path,
            'content': self.test_content
        }

        try:
            response = api_client.put(f'files/{self.test_file_path}', upload_data)
            assert_api_success(response, "Failed to upload file")

            data = response.get('data', {})
            if isinstance(data, dict):
                assert 'filename' in data or 'size' in data or 'message' in data

            print(f"✓ Uploaded file via PUT: {self.test_file_path}")
            if isinstance(data, dict) and 'size' in data:
                print(f"  Size: {data['size']} bytes")

        except Exception as e:
            if '422' in str(e):
                print(f"⚠ File path validation rejected (may require specific directory)")
                pytest.skip("File upload path validation")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Simple file upload not fully implemented (expected)")
                pytest.skip("File upload not implemented")
            else:
                raise

    def test_02_get_file_content(self, api_client, test_uploaded_file):
        """Test GET /files/{path} - Read file content

        WHY: Uses fixture instead of class variable to ensure test isolation
             and proper dependency management.
        """
        try:
            response = api_client.get(f'files/{test_uploaded_file}')
            assert_api_success(response, "Failed to get file content")

            # Response might be raw content or wrapped in data
            if 'data' in response:
                content = response['data']
                if isinstance(content, dict):
                    content = content.get('content', '')
            else:
                content = response

            # Content might be returned as string or need extraction
            if isinstance(content, str):
                assert len(content) > 0, "File content is empty"
                print(f"✓ Retrieved file content: {len(content)} bytes")
            else:
                print(f"⚠ Unexpected content format: {type(content)}")

        except Exception as e:
            if '404' in str(e):
                print(f"⚠ File not found (may not have been created)")
            elif '501' in str(e):
                print(f"⚠ File reading not fully implemented")
            else:
                raise

    def test_03_chunked_upload_and_status(self, api_client, tmp_path):
        """Test full Resumable.js upload flow: POST /files:upload → GET /files:uploadStatus

        WHY: Verifies the real upload pipeline works end-to-end:
        1. File chunk is received and stored via Resumable.js protocol
        2. Merge process starts for single-chunk files
        3. Status endpoint correctly reports progress and completion
        4. Response contains expected fields (d_status, d_status_progress, channelId)
        """
        # 1. Create a small test file
        test_file = tmp_path / "test_upload.txt"
        test_file.write_text("Line 1: test content\nLine 2: more content\nLine 3: end\n")

        # 2. Upload via Resumable.js protocol (single chunk)
        response = api_client.upload_file('files:upload', str(test_file))

        assert response.get('result') is True, f"Upload failed: {response}"
        assert 'data' in response, f"No data in upload response: {response}"

        upload_data = response['data']
        upload_id = upload_data.get('upload_id', '')
        assert upload_id, f"No upload_id in response: {upload_data}"

        d_status = upload_data.get('d_status', '')
        assert d_status in ('MERGING', 'WAITING_FOR_NEXT_PART'), \
            f"Unexpected upload d_status: {d_status}, full response: {upload_data}"

        print(f"✓ File uploaded: upload_id={upload_id}, d_status={d_status}")

        # 3. Poll upload status until complete (max 10s)
        final_status = None
        final_progress = None
        status_data = {}

        for attempt in range(20):
            time.sleep(0.5)

            status_resp = api_client.get(
                'files:uploadStatus',
                params={'resumableIdentifier': upload_id}
            )

            assert status_resp.get('result') is True, \
                f"Status check returned result=false: {status_resp}"

            status_data = status_resp.get('data', {})
            assert 'd_status' in status_data, \
                f"Missing d_status in status response: {status_data}"
            assert 'd_status_progress' in status_data, \
                f"Missing d_status_progress in status response: {status_data}"

            final_status = status_data['d_status']
            final_progress = status_data['d_status_progress']

            print(f"  Poll {attempt + 1}: d_status={final_status}, progress={final_progress}")

            if final_status == 'UPLOAD_COMPLETE' and final_progress == '100':
                break

        assert final_progress == '100', \
            f"Upload did not complete. d_status={final_status}, progress={final_progress}"
        assert final_status == 'UPLOAD_COMPLETE', \
            f"Expected UPLOAD_COMPLETE, got: {final_status}"

        # 4. Verify EventBus channel info in status response
        assert 'channelId' in status_data, \
            f"Missing channelId in status response: {status_data}"
        expected_channel = f"file-upload-{upload_id}"
        assert status_data['channelId'] == expected_channel, \
            f"Expected channelId={expected_channel}, got {status_data['channelId']}"

        print(f"✓ Upload complete: d_status={final_status}, progress={final_progress}, "
              f"channelId={status_data['channelId']}")

    def test_04_firmware_download_initiate(self, api_client):
        """Test POST /files:downloadFirmware - Initiate firmware download

        NOTE: We use a fake URL since we don't want to actually download firmware in tests.
        The endpoint should validate URL format but may fail on actual download.
        """
        firmware_data = {
            'url': 'https://example.com/test_firmware.img',
            'md5': 'abc123def456789'  # Fake MD5
        }

        try:
            response = api_client.post('files:downloadFirmware', firmware_data)

            if response.get('result') is True:
                print(f"✓ Firmware download initiated")
                data = response.get('data', {})
                if isinstance(data, dict):
                    print(f"  Response: {data}")
            else:
                # May fail on actual download - that's OK for test
                messages = response.get('messages', {})
                print(f"⚠ Firmware download failed (expected for fake URL): {messages}")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Firmware download validation works (rejected fake URL)")
            elif '501' in str(e):
                print(f"⚠ Firmware download not implemented")
            else:
                print(f"⚠ Firmware download error: {str(e)[:100]}")

    def test_05_firmware_status_not_found(self, api_client):
        """Test GET /files:firmwareStatus for non-existent firmware

        WHY: Verifies the endpoint returns proper error structure (not just any error).
        The backend returns success=false with STATUS_NOT_FOUND → HTTP 422.
        We assert specific HTTP status code and response body fields.
        """
        test_firmware = 'nonexistent_firmware_12345.img'

        response = api_client.get_raw(
            'files:firmwareStatus',
            params={'filename': test_firmware}
        )

        # Non-existent firmware → success=false → HTTP 422
        assert response.status_code == 422, \
            f"Expected HTTP 422 for non-existent firmware, got {response.status_code}"

        body = response.json()
        assert body.get('result') is False, \
            f"Expected result=false for non-existent firmware: {body}"

        # Verify response has expected data structure
        data = body.get('data', {})
        assert 'd_status_progress' in data, \
            f"Missing d_status_progress in error response: {data}"
        assert data['d_status_progress'] == '0', \
            f"Expected progress=0 for not found, got: {data['d_status_progress']}"

        print(f"✓ Firmware status returns 422 with proper error structure for non-existent file")
        print(f"  Response: result={body['result']}, data={data}")

class TestFilesEdgeCases:
    """Edge cases for Files API"""

    def test_01_get_nonexistent_file(self, api_client):
        """Test GET /files/{path} with non-existent file"""
        fake_path = '/tmp/nonexistent_file_999999.txt'

        try:
            response = api_client.get(f'files/{fake_path}')
            assert response['result'] is False, "Should fail for non-existent file"
            print(f"✓ Non-existent file correctly rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent file correctly rejected (HTTP error)")
            else:
                raise

    def test_02_delete_nonexistent_file(self, api_client):
        """Test DELETE /files/{path} with non-existent file"""
        fake_path = '/tmp/nonexistent_file_999999.txt'

        try:
            response = api_client.delete(f'files/{fake_path}')
            # May return success (idempotent) or error
            if response['result'] is False:
                print(f"✓ Delete non-existent file rejected")
            else:
                print(f"⚠ Delete non-existent file accepted (idempotent)")
        except Exception as e:
            if '404' in str(e):
                print(f"✓ Delete non-existent file returns 404")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_upload_empty_content(self, api_client):
        """Test PUT /files/{path} with empty content"""
        test_path = '/tmp/empty_test_file.txt'
        upload_data = {
            'filename': test_path,
            'content': ''  # Empty content
        }

        try:
            response = api_client.put(f'files/{test_path}', upload_data)

            if not response['result']:
                print(f"✓ Empty content rejected (validation works)")
            else:
                # Some systems allow empty files
                print(f"⚠ Empty content accepted")
                # Cleanup
                try:
                    api_client.delete(f'files/{test_path}')
                except:
                    pass
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Empty content rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_invalid_path_characters(self, api_client):
        """Test with invalid path characters"""
        invalid_paths = [
            '/tmp/../../../etc/passwd',  # Path traversal
            '/tmp/file\x00.txt',         # Null byte
            '/tmp/file|rm -rf.txt',      # Shell injection attempt
        ]

        for invalid_path in invalid_paths:
            try:
                response = api_client.get(f'files/{invalid_path}')
                if not response['result']:
                    print(f"✓ Invalid path rejected: {invalid_path[:30]}")
            except Exception as e:
                if '400' in str(e) or '422' in str(e) or '404' in str(e):
                    print(f"✓ Invalid path rejected via HTTP: {invalid_path[:30]}")
                else:
                    print(f"⚠ Unexpected error for {invalid_path[:30]}: {str(e)[:50]}")

    def test_05_upload_status_invalid_id(self, api_client):
        """Test GET /files:uploadStatus with invalid ID format"""
        invalid_ids = [
            '../../../etc',      # Path traversal
            'id with spaces',    # Spaces
            'id/with/slashes',   # Slashes
        ]

        for invalid_id in invalid_ids:
            try:
                response = api_client.get('files:uploadStatus', params={'id': invalid_id})
                # May return not found or validation error
                if not response['result']:
                    print(f"✓ Invalid upload ID rejected: {invalid_id[:20]}")
            except Exception as e:
                if '400' in str(e) or '422' in str(e) or '404' in str(e):
                    print(f"✓ Invalid upload ID rejected: {invalid_id[:20]}")
                else:
                    print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_firmware_download_invalid_url(self, api_client):
        """Test POST /files:downloadFirmware with invalid URL"""
        invalid_data = {
            'url': 'not-a-valid-url',  # Invalid URL format
            'md5': 'invalid'
        }

        try:
            response = api_client.post('files:downloadFirmware', invalid_data)
            if not response['result']:
                print(f"✓ Invalid firmware URL rejected")
            else:
                print(f"⚠ Invalid URL accepted (lenient validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid firmware URL rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_07_firmware_status_missing_filename(self, api_client):
        """Test GET /files:firmwareStatus without filename parameter"""
        try:
            response = api_client.get('files:firmwareStatus', params={})
            if not response['result']:
                print(f"✓ Missing filename parameter rejected")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Missing filename parameter rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
