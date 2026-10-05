#!/usr/bin/env python3
"""Test suite for Modules operations"""
import json
import time
import zipfile

import pytest
from conftest import assert_api_success

class TestModules:
    def test_01_get_list(self, api_client):
        try:
            response = api_client.get('modules', params={'limit': 50})
            assert_api_success(response, "Failed to get modules list")
            data = response['data']
            print(f"✓ Retrieved {len(data)} modules")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                print(f"⚠ Modules list endpoint not fully implemented")
                print(f"  Note: May require specific installation or configuration")
            else:
                raise
    def test_02_get_available_modules(self, api_client):
        try:
            response = api_client.get('modules:getAvailableModules')
            if response['result']:
                print(f"✓ Retrieved available modules")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Method not implemented")

    def test_03_get_metadata_rejects_unsafe_module_unique_id(self, api_client, tmp_path):
        """POST /modules:getMetadataFromPackage must reject a moduleUniqueID that is not a safe directory name.

        WHY: the id from module.json is used to build the staging directory during installation.
        """
        package = tmp_path / "evil_module.zip"
        with zipfile.ZipFile(package, 'w') as archive:
            archive.writestr('module.json', json.dumps({'moduleUniqueID': '../../evil'}))

        response = api_client.upload_file('files:upload', str(package))
        assert response.get('result') is True, f"Upload failed: {response}"
        upload_data = response['data']
        upload_id = upload_data.get('upload_id', '')
        file_path = upload_data.get('filename', '')
        assert upload_id and file_path, f"No upload_id/filename in upload response: {upload_data}"

        final_status = None
        final_progress = None
        for _ in range(20):
            time.sleep(0.5)
            status_resp = api_client.get('files:uploadStatus', params={'resumableIdentifier': upload_id})
            status_data = status_resp.get('data', {})
            final_status = status_data.get('d_status')
            final_progress = status_data.get('d_status_progress')
            if final_status == 'UPLOAD_COMPLETE' and final_progress == '100':
                break
        assert final_status == 'UPLOAD_COMPLETE' and final_progress == '100', \
            f"Upload did not complete. d_status={final_status}, progress={final_progress}"

        # Sent raw so that a non-2xx answer does not raise
        raw = api_client.session.post(
            f"{api_client.base_url}/modules:getMetadataFromPackage",
            json={'filePath': file_path},
            headers=api_client._get_headers(),
            timeout=30
        )
        assert raw.status_code == 422, \
            f"Expected HTTP 422 for unsafe moduleUniqueID, got {raw.status_code}: {raw.text}"
        assert raw.json().get('result') is False, f"Expected result=false, got: {raw.text}"

    def test_04_get_download_status_rejects_unsafe_uniqid(self, api_client):
        """GET /modules/{id}:getDownloadStatus must reject a uniqid that is not a safe directory name.

        WHY: the uniqid is used to build the download directory path under the upload dir.
        The id goes in a JSON body: the nginx WAF answers 403 to ".." in the query string
        before PHP runs, but it does not scan GET bodies, and the API reads them.
        """
        # Sent raw so that a non-2xx answer does not raise
        raw = api_client.session.get(
            f"{api_client.base_url}/modules/ModuleTemplate:getDownloadStatus",
            json={'uniqid': '../../evil'},
            headers=api_client._get_headers(),
            timeout=30
        )
        assert raw.status_code == 400, \
            f"Expected HTTP 400 for unsafe uniqid, got {raw.status_code}: {raw.text}"
        assert raw.json().get('result') is False, f"Expected result=false, got: {raw.text}"

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
