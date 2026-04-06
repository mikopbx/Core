#!/usr/bin/env python3
"""
Manual test for sequential PATCH operations on custom file ID=88
"""
import requests
import time
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://mikopbx-php83.localhost:8445/pbxcore/api/v3"
USERNAME = "admin"
PASSWORD = "123456789MikoPBX#1"

def get_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth:login",
        data={"login": USERNAME, "password": PASSWORD, "rememberMe": "false"},
        verify=False
    )
    return response.json()["data"]["accessToken"]

def patch_custom_file(token, file_id, content, mode="append"):
    """PATCH custom file with form-urlencoded data"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    data = {
        "id": file_id,
        "content": content,
        "mode": mode
    }

    response = requests.patch(
        f"{BASE_URL}/custom-files",
        headers=headers,
        data=data,  # form-urlencoded
        verify=False
    )

    return response.json()

def get_file_from_disk(token, filepath):
    """Get file content from disk using Files API"""
    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/files{filepath}",
        headers=headers,
        verify=False
    )

    return response.json()["data"]["content"]

def get_custom_file(token, file_id):
    """Get custom file record from database"""
    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/custom-files/{file_id}",
        headers=headers,
        verify=False
    )

    return response.json()["data"]

def main():
    print("=" * 80)
    print("SEQUENTIAL PATCH TEST FOR CUSTOM FILE ID=88")
    print("=" * 80)

    file_id = "88"
    filepath = "/etc/asterisk/manager.conf"

    # Get token
    print("\n[1] Getting authentication token...")
    token = get_token()
    print(f"✓ Token obtained: {token[:50]}...")

    # First PATCH
    print("\n[2] First PATCH - Adding [phpagi99] section...")
    first_content = """[phpagi99]
secret=phpagi
deny=0.0.0.0/0.0.0.0
permit=127.0.0.1/255.255.255.255
read=all
write=all
eventfilter=!Event: Newexten
"""

    result1 = patch_custom_file(token, file_id, first_content, "append")
    print(f"✓ First PATCH result: {result1['result']}")
    print(f"  Changed flag: {result1['data']['changed']}")
    print(f"  Mode: {result1['data']['mode']}")

    # Wait for processing
    print("\n[3] Waiting 15 seconds for WorkerModelsEvents to process...")
    time.sleep(15)

    # Check disk
    print("\n[4] Checking file on disk...")
    disk_content1 = get_file_from_disk(token, filepath)
    has_phpagi99 = "[phpagi99]" in disk_content1
    print(f"  [phpagi99] present: {has_phpagi99}")

    if not has_phpagi99:
        print("✗ ERROR: First PATCH was not applied!")
        return

    print("✓ First PATCH successfully applied")

    # Check database
    db_record1 = get_custom_file(token, file_id)
    print(f"  Database changed flag: {db_record1['changed']}")

    # Second PATCH
    print("\n[5] Second PATCH - Changing to [phpagi11] section...")
    second_content = """[phpagi11]
secret=phpagi
deny=0.0.0.0/0.0.0.0
permit=127.0.0.1/255.255.255.255
read=all
write=all
eventfilter=!Event: Newexten
"""

    result2 = patch_custom_file(token, file_id, second_content, "append")
    print(f"✓ Second PATCH result: {result2['result']}")
    print(f"  Changed flag: {result2['data']['changed']}")
    print(f"  Mode: {result2['data']['mode']}")

    # Wait for processing
    print("\n[6] Waiting 15 seconds for WorkerModelsEvents to process...")
    time.sleep(15)

    # Check disk
    print("\n[7] Checking file on disk after second PATCH...")
    disk_content2 = get_file_from_disk(token, filepath)
    has_phpagi99_after = "[phpagi99]" in disk_content2
    has_phpagi11 = "[phpagi11]" in disk_content2

    print(f"  [phpagi99] present: {has_phpagi99_after}")
    print(f"  [phpagi11] present: {has_phpagi11}")

    # Check database
    db_record2 = get_custom_file(token, file_id)
    print(f"  Database changed flag: {db_record2['changed']}")

    # Final verdict
    print("\n" + "=" * 80)
    if has_phpagi11 and not has_phpagi99_after:
        print("✓ TEST PASSED: Second PATCH successfully replaced first content")
    elif has_phpagi11 and has_phpagi99_after:
        print("⚠ PARTIAL: Both sections present (append mode working)")
    elif not has_phpagi11:
        print("✗ TEST FAILED: Second PATCH was NOT applied!")
        print("\nLast 500 characters of file:")
        print(disk_content2[-500:])
    print("=" * 80)

if __name__ == "__main__":
    main()
