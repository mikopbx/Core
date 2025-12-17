"""
Test sequential PATCH operations on the same custom file.

This test verifies that multiple consecutive PATCH operations on the same custom file
are properly applied and the 'changed' flag is correctly managed.

Issue: Second PATCH operation may not be applied if the first one hasn't completed processing.
"""
import pytest
import time
import base64
from typing import Optional
from conftest import read_file_from_container


def _get_or_create_manager_conf_file(api_client) -> Optional[str]:
    """
    Find existing custom file for /etc/asterisk/manager.conf or create one.
    Returns the file ID or None if failed.
    """
    filepath = "/etc/asterisk/manager.conf"

    # First, try to find existing custom file
    response = api_client.get('custom-files', params={
        'search': 'manager.conf',
        'limit': 50
    })

    if response.get('result') and response.get('data'):
        for file in response['data']:
            if file.get('filepath') == filepath:
                print(f"Found existing custom file for {filepath}, ID={file['id']}")
                return str(file['id'])

    # Not found - try to create
    print(f"Custom file for {filepath} not found, creating...")
    initial_content = base64.b64encode(b"; Manager.conf custom config\n").decode()

    create_data = {
        'filepath': filepath,
        'content': initial_content,
        'mode': 'append',
        'description': 'Test custom file for sequential patch tests'
    }

    try:
        create_response = api_client.post('custom-files', create_data)
        if create_response.get('result') and create_response.get('data', {}).get('id'):
            file_id = str(create_response['data']['id'])
            print(f"Created custom file for {filepath}, ID={file_id}")
            return file_id
        else:
            print(f"Failed to create custom file: {create_response.get('messages', {})}")
            return None
    except Exception as e:
        print(f"Error creating custom file: {e}")
        return None


def test_sequential_patch_custom_file(api_client):
    """
    Test that sequential PATCH operations on the same file are properly applied.

    Steps:
    1. Get or create custom file for /etc/asterisk/manager.conf
    2. PATCH with first content (add [phpagi99] section)
    3. Wait for file to be applied to disk
    4. Verify first content is applied
    5. PATCH with second content (change to [phpagi11] section)
    6. Wait for file to be applied to disk
    7. Verify second content is applied
    """
    filepath = "/etc/asterisk/manager.conf"

    # Get or create the custom file dynamically
    file_id = _get_or_create_manager_conf_file(api_client)
    if not file_id:
        pytest.skip("Could not find or create custom file for manager.conf")

    # First content to add
    first_content = """[phpagi99]
secret=phpagi
deny=0.0.0.0/0.0.0.0
permit=127.0.0.1/255.255.255.255
read=all
write=all
eventfilter=!Event: Newexten
"""

    # Second content to add (different section name)
    second_content = """[phpagi11]
secret=phpagi
deny=0.0.0.0/0.0.0.0
permit=127.0.0.1/255.255.255.255
read=all
write=all
eventfilter=!Event: Newexten
"""

    print("=" * 80)
    print(f"TEST: Sequential PATCH operations on custom file ID={file_id}")
    print("=" * 80)

    # ========================================================================
    # STEP 1: Get current file state
    # ========================================================================
    print("\n[STEP 1] Getting current file state...")

    response = api_client.get(f"custom-files/{file_id}")
    assert response.get('result'), f"Failed to get file: {response}"

    original_data = response["data"]
    print(f"Original file mode: {original_data['mode']}")
    print(f"Original file changed flag: {original_data.get('changed', 'N/A')}")

    # ========================================================================
    # STEP 2: First PATCH - Add [phpagi99] section
    # ========================================================================
    print("\n[STEP 2] First PATCH - Adding [phpagi99] section...")

    patch_data_1 = {
        "id": file_id,
        "content": first_content,
        "mode": "append"
    }

    result_1 = api_client.patch("custom-files", patch_data_1)
    print(f"First PATCH response: result={result_1.get('result')}")
    assert result_1.get("result") is True, f"First PATCH result should be true: {result_1}"
    assert result_1["data"]["changed"] == "1", "Changed flag should be '1' after first PATCH"

    # ========================================================================
    # STEP 3: Wait for first change to be applied to disk
    # ========================================================================
    print("\n[STEP 3] Waiting for first change to be applied to disk (15 seconds)...")

    # Wait for WorkerModelsEvents to process the change
    time.sleep(15)

    # ========================================================================
    # STEP 4: Verify first content is applied to disk
    # ========================================================================
    print("\n[STEP 4] Verifying first content is on disk...")

    # Use Files API to check actual file content on disk
    try:
        disk_content_1 = read_file_from_container(api_client, filepath)
        print(f"Disk content after first PATCH (length={len(disk_content_1)} chars)")

        assert "[phpagi99]" in disk_content_1, "First content should contain [phpagi99] section"
        print("First content verified on disk: [phpagi99] section found")
    except Exception as e:
        pytest.fail(f"Failed to read file from disk: {e}")

    # Check changed flag was reset
    response = api_client.get(f"custom-files/{file_id}")
    db_data_1 = response["data"]
    print(f"Changed flag after first PATCH processing: {db_data_1.get('changed', 'N/A')}")

    # ========================================================================
    # STEP 5: Second PATCH - Change to [phpagi11] section
    # ========================================================================
    print("\n[STEP 5] Second PATCH - Changing to [phpagi11] section...")

    patch_data_2 = {
        "id": file_id,
        "content": second_content,
        "mode": "append"
    }

    result_2 = api_client.patch("custom-files", patch_data_2)
    print(f"Second PATCH response: result={result_2.get('result')}")
    assert result_2.get("result") is True, f"Second PATCH result should be true: {result_2}"
    assert result_2["data"]["changed"] == "1", "Changed flag should be '1' after second PATCH"

    # ========================================================================
    # STEP 6: Wait for second change to be applied to disk
    # ========================================================================
    print("\n[STEP 6] Waiting for second change to be applied to disk (15 seconds)...")

    time.sleep(15)

    # ========================================================================
    # STEP 7: Verify second content is applied to disk
    # ========================================================================
    print("\n[STEP 7] Verifying second content is on disk...")

    # Use Files API to check actual file content on disk
    try:
        disk_content_2 = read_file_from_container(api_client, filepath)
        print(f"Disk content after second PATCH (length={len(disk_content_2)} chars)")
    except Exception as e:
        pytest.fail(f"Failed to read file from disk: {e}")

    # Check that old section is gone and new section is present
    print("Checking for [phpagi99] (should NOT be present)...")
    if "[phpagi99]" in disk_content_2:
        print("PROBLEM: [phpagi99] still present on disk!")
        print("This indicates second PATCH was not applied")

    print("Checking for [phpagi11] (should be present)...")
    if "[phpagi11]" not in disk_content_2:
        print("PROBLEM: [phpagi11] NOT found on disk!")
        print("Second PATCH was not applied")

        # Show last 500 chars of file for debugging
        print(f"Last 500 chars of file:\n{disk_content_2[-500:]}")

        # Check database state
        response = api_client.get(f"custom-files/{file_id}")
        db_data_2 = response["data"]
        print(f"Database changed flag: {db_data_2.get('changed', 'N/A')}")
        print(f"Database mode: {db_data_2['mode']}")

        pytest.fail("Second PATCH was not applied to disk")

    print("Second content verified on disk: [phpagi11] section found")

    # Final assertion
    assert "[phpagi11]" in disk_content_2, "Second content should contain [phpagi11] section"
    assert "[phpagi99]" not in disk_content_2, "First content [phpagi99] should be replaced"

    print("\n" + "=" * 80)
    print("TEST PASSED: Sequential PATCH operations work correctly")
    print("=" * 80)


def test_rapid_sequential_patches(api_client):
    """
    Test rapid sequential PATCH operations without waiting between them.

    This tests the race condition where second PATCH happens before first is processed.
    """
    filepath = "/etc/asterisk/manager.conf"

    # Get or create the custom file dynamically
    file_id = _get_or_create_manager_conf_file(api_client)
    if not file_id:
        pytest.skip("Could not find or create custom file for manager.conf")

    print("=" * 80)
    print(f"TEST: Rapid sequential PATCH operations on custom file ID={file_id}")
    print("=" * 80)

    # Content for rapid patches
    contents = [
        "[phpagi_rapid_1]\nsecret=test1\n",
        "[phpagi_rapid_2]\nsecret=test2\n",
        "[phpagi_rapid_3]\nsecret=test3\n",
    ]

    # ========================================================================
    # Send 3 PATCH requests in rapid succession
    # ========================================================================
    print("\n[STEP 1] Sending 3 PATCH requests rapidly...")

    for i, content in enumerate(contents, 1):
        patch_data = {
            "id": file_id,
            "content": content,
            "mode": "append"
        }

        result = api_client.patch("custom-files", patch_data)
        assert result.get("result") is True, f"PATCH {i} failed: {result}"
        print(f"PATCH {i} response - changed: {result['data'].get('changed', 'N/A')}")

        # Small delay between patches (simulate UI behavior)
        time.sleep(0.5)

    # ========================================================================
    # Wait for all changes to be processed
    # ========================================================================
    print("\n[STEP 2] Waiting for all changes to be processed (20 seconds)...")
    time.sleep(20)

    # ========================================================================
    # Verify final state
    # ========================================================================
    print("\n[STEP 3] Verifying final state on disk...")

    try:
        disk_content = read_file_from_container(api_client, filepath)
    except Exception as e:
        pytest.fail(f"Failed to get file from disk: {e}")

    # Check which sections are present
    for i, content in enumerate(contents, 1):
        section = f"[phpagi_rapid_{i}]"
        is_present = section in disk_content
        print(f"{section}: {'PRESENT' if is_present else 'MISSING'}")

    # At least the last change should be present
    assert "[phpagi_rapid_3]" in disk_content, "At least the last PATCH should be applied"

    print("\n" + "=" * 80)
    print("TEST PASSED: Rapid PATCH operations handled")
    print("=" * 80)
