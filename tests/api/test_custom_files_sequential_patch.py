"""
Test sequential PATCH operations on the same custom file.

This test verifies that multiple consecutive PATCH operations on the same custom file
are properly applied and the 'changed' flag is correctly managed.

Issue: Second PATCH operation may not be applied if the first one hasn't completed processing.
"""
import pytest
import time
import base64
from typing import Dict, Any


def test_sequential_patch_custom_file(api_client):
    """
    Test that sequential PATCH operations on the same file are properly applied.

    Steps:
    1. Get current file content (ID=88, /etc/asterisk/manager.conf)
    2. PATCH with first content (add [phpagi99] section)
    3. Wait for file to be applied to disk
    4. Verify first content is applied
    5. PATCH with second content (change to [phpagi11] section)
    6. Wait for file to be applied to disk
    7. Verify second content is applied
    """
    file_id = "88"
    filepath = "/etc/asterisk/manager.conf"

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
    print("TEST: Sequential PATCH operations on custom file ID=88")
    print("=" * 80)

    # ========================================================================
    # STEP 1: Get current file state
    # ========================================================================
    print("\n[STEP 1] Getting current file state...")

    response = api_client.get(f"/custom-files/{file_id}")
    assert response.status_code == 200, f"Failed to get file: {response.text}"

    original_data = response.json()["data"]
    print(f"Original file mode: {original_data['mode']}")
    print(f"Original file changed flag: {original_data['changed']}")

    # ========================================================================
    # STEP 2: First PATCH - Add [phpagi99] section
    # ========================================================================
    print("\n[STEP 2] First PATCH - Adding [phpagi99] section...")

    patch_data_1 = {
        "id": file_id,
        "content": first_content,
        "mode": "append"
    }

    response = api_client.patch("/custom-files", data=patch_data_1)
    assert response.status_code == 200, f"First PATCH failed: {response.text}"

    result_1 = response.json()
    print(f"First PATCH response: {result_1}")
    assert result_1["result"] is True, "First PATCH result should be true"
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
    response = api_client.get(f"/files/{filepath}")
    assert response.status_code == 200, f"Failed to get file from disk: {response.text}"

    disk_content_1 = response.json()["data"]["content"]
    print(f"Disk content after first PATCH (length={len(disk_content_1)} chars)")

    assert "[phpagi99]" in disk_content_1, "First content should contain [phpagi99] section"
    print("✓ First content verified on disk: [phpagi99] section found")

    # Check changed flag was reset
    response = api_client.get(f"/custom-files/{file_id}")
    db_data_1 = response.json()["data"]
    print(f"Changed flag after first PATCH processing: {db_data_1['changed']}")

    # ========================================================================
    # STEP 5: Second PATCH - Change to [phpagi11] section
    # ========================================================================
    print("\n[STEP 5] Second PATCH - Changing to [phpagi11] section...")

    patch_data_2 = {
        "id": file_id,
        "content": second_content,
        "mode": "append"
    }

    response = api_client.patch("/custom-files", data=patch_data_2)
    assert response.status_code == 200, f"Second PATCH failed: {response.text}"

    result_2 = response.json()
    print(f"Second PATCH response: {result_2}")
    assert result_2["result"] is True, "Second PATCH result should be true"
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
    response = api_client.get(f"/files/{filepath}")
    assert response.status_code == 200, f"Failed to get file from disk: {response.text}"

    disk_content_2 = response.json()["data"]["content"]
    print(f"Disk content after second PATCH (length={len(disk_content_2)} chars)")

    # Check that old section is gone and new section is present
    print("Checking for [phpagi99] (should NOT be present)...")
    if "[phpagi99]" in disk_content_2:
        print("✗ PROBLEM: [phpagi99] still present on disk!")
        print("This indicates second PATCH was not applied")

    print("Checking for [phpagi11] (should be present)...")
    if "[phpagi11]" not in disk_content_2:
        print("✗ PROBLEM: [phpagi11] NOT found on disk!")
        print("Second PATCH was not applied")

        # Show last 500 chars of file for debugging
        print(f"Last 500 chars of file:\n{disk_content_2[-500:]}")

        # Check database state
        response = api_client.get(f"/custom-files/{file_id}")
        db_data_2 = response.json()["data"]
        print(f"Database changed flag: {db_data_2['changed']}")
        print(f"Database mode: {db_data_2['mode']}")

        pytest.fail("Second PATCH was not applied to disk")

    print("✓ Second content verified on disk: [phpagi11] section found")

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
    file_id = "88"
    filepath = "/etc/asterisk/manager.conf"

    print("=" * 80)
    print("TEST: Rapid sequential PATCH operations (race condition test)")
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

        response = api_client.patch("/custom-files", data=patch_data)
        assert response.status_code == 200, f"PATCH {i} failed: {response.text}"

        result = response.json()
        print(f"PATCH {i} response - changed: {result['data']['changed']}")

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

    response = api_client.get(f"/files/{filepath}")
    assert response.status_code == 200, f"Failed to get file from disk: {response.text}"

    disk_content = response.json()["data"]["content"]

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
