#!/usr/bin/env python3
"""
CDR Database Seeder for Test Environment

This helper populates the test CDR database with realistic anonymized data
and creates corresponding recording files for playback testing.

IMPORTANT: This seeder is designed to run INSIDE the Docker container.
The pytest tests are executed inside the container, and this seeder
works directly with local filesystem paths and SQLite database using
the sqlite3 CLI command (not Python's sqlite3 module).

Technical Implementation:
- Uses subprocess to call sqlite3 CLI for database operations
- Creates minimal valid MP3 files (417 bytes) for recording tests
- Operates on container paths: /storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db

Usage:
    from helpers.cdr_seeder import CDRSeeder

    # In conftest.py
    @pytest.fixture(scope="session", autouse=True)
    def seed_cdr_database():
        seeder = CDRSeeder()
        seeder.seed()
        yield
        seeder.cleanup()
"""

import json
import os
import subprocess
import shutil
from pathlib import Path
from typing import Optional


class CDRSeeder:
    """
    Seed CDR database with test data

    This class:
    1. Loads test CDR data from JSON fixture
    2. Inserts records into SQLite CDR database directly
    3. Creates minimal MP3 files for recordings
    4. Cleans up test data after tests complete

    Note: Runs inside Docker container, uses direct filesystem access
    """

    def __init__(self):
        # Paths inside container
        self.fixture_dir = Path(__file__).parent.parent / "fixtures"
        self.sql_file = self.fixture_dir / "cdr_seed_data.sql"
        self.json_file = self.fixture_dir / "cdr_test_data.json"
        self.cdr_db_path = Path("/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db")
        self.monitor_base = Path("/tmp/test_monitor")

    def seed(self) -> bool:
        """
        Seed CDR database with test data

        Returns:
            True if seeding successful, False otherwise
        """
        # Check if seeding is enabled
        if os.getenv('ENABLE_CDR_SEED', '1') != '1':
            print("CDR seeding disabled (ENABLE_CDR_SEED=0)")
            return False

        print("=" * 60)
        print("CDR Database Seeding Started")
        print("=" * 60)

        try:
            # 1. Check if database exists
            if not self.cdr_db_path.exists():
                print(f"✗ CDR database not found: {self.cdr_db_path}")
                return False

            # 2. Load test data
            test_data = self._load_test_data()
            if not test_data:
                print("✗ Failed to load test data")
                return False

            print(f"✓ Loaded {len(test_data)} test CDR records")

            # 3. Seed database
            if not self._seed_database():
                print("✗ Failed to seed database")
                return False

            print("✓ Database seeded successfully")

            # 4. Create recording files
            recordings_created = self._create_recording_files(test_data)
            print(f"✓ Created {recordings_created} recording files")

            # 5. Verify seeding
            count = self._verify_seeding()
            if count > 0:
                print(f"✓ Verification: {count} records in database")
                print("=" * 60)
                print("CDR Seeding Completed Successfully")
                print("=" * 60)
                return True
            else:
                print("✗ Verification failed: no records found")
                return False

        except Exception as e:
            print(f"✗ CDR seeding failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def cleanup(self):
        """
        Clean up test CDR data and recording files

        This is called after all tests complete to remove test data
        """
        if os.getenv('ENABLE_CDR_CLEANUP', '1') != '1':
            print("CDR cleanup disabled (ENABLE_CDR_CLEANUP=0)")
            return

        print("\nCleaning up CDR test data...")

        try:
            # Delete test records from database
            self._execute_sql("DELETE FROM cdr_general WHERE id BETWEEN 1 AND 1000;")

            # Remove test recording files
            if self.monitor_base.exists():
                shutil.rmtree(self.monitor_base)

            print("✓ CDR test data cleaned up")

        except Exception as e:
            print(f"⚠ Cleanup warning: {str(e)}")

    def _load_test_data(self) -> Optional[list]:
        """Load test data from JSON fixture"""
        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"✗ Test data file not found: {self.json_file}")
            return None
        except json.JSONDecodeError as e:
            print(f"✗ Invalid JSON in test data: {e}")
            return None

    def _seed_database(self) -> bool:
        """Execute SQL seed file to populate database using sqlite3 CLI"""
        if not self.sql_file.exists():
            print(f"✗ SQL seed file not found: {self.sql_file}")
            return False

        try:
            # Execute SQL using sqlite3 CLI command
            # Read the SQL file and pipe it to sqlite3
            result = subprocess.run(
                ['sqlite3', str(self.cdr_db_path)],
                stdin=open(self.sql_file, 'r'),
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                print(f"✗ SQLite CLI error: {result.stderr}")
                return False

            return True

        except subprocess.TimeoutExpired:
            print("✗ Database seeding timed out after 30 seconds")
            return False
        except FileNotFoundError:
            print("✗ sqlite3 command not found in container")
            return False
        except Exception as e:
            print(f"✗ Failed to seed database: {e}")
            return False

    def _execute_sql(self, sql: str) -> bool:
        """Execute SQL command using sqlite3 CLI"""
        try:
            result = subprocess.run(
                ['sqlite3', str(self.cdr_db_path), sql],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                print(f"✗ SQLite CLI error: {result.stderr}")
                return False

            return True
        except Exception as e:
            print(f"✗ Failed to execute SQL: {e}")
            return False

    def _create_recording_files(self, test_data: list) -> int:
        """
        Create minimal MP3 files for test recordings

        For each CDR record with recordingfile, create a minimal valid MP3 file
        """
        count = 0

        # Minimal valid MP3 file (ID3v2 header + 1 frame of silence)
        # This is a 417-byte valid MP3 file
        minimal_mp3 = bytes.fromhex(
            # ID3v2.3 header (10 bytes)
            '494433030000000000'
            # MP3 frame header (4 bytes): MPEG 1 Layer 3, 128kbps, 44100Hz, mono
            'FFFB90C4'
            # Frame data (413 bytes of silence)
            + '00' * 413
        )

        for record in test_data:
            recordingfile = record.get('recordingfile', '')
            if not recordingfile or recordingfile == '':
                continue

            try:
                # Create directory structure
                rec_path = Path(recordingfile)
                rec_path.parent.mkdir(parents=True, exist_ok=True)

                # Write minimal MP3 file
                with open(rec_path, 'wb') as f:
                    f.write(minimal_mp3)

                count += 1

            except Exception as e:
                print(f"⚠ Failed to create recording file {recordingfile}: {e}")
                continue

        return count

    def _verify_seeding(self) -> int:
        """Verify that records were inserted successfully using sqlite3 CLI"""
        try:
            result = subprocess.run(
                ['sqlite3', str(self.cdr_db_path),
                 'SELECT COUNT(*) FROM cdr_general WHERE id BETWEEN 1 AND 1000;'],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                return int(result.stdout.strip())
            return 0
        except Exception:
            return 0

    def get_test_cdr_ids(self) -> list:
        """Get list of test CDR IDs for use in tests using sqlite3 CLI"""
        try:
            result = subprocess.run(
                ['sqlite3', str(self.cdr_db_path),
                 'SELECT id FROM cdr_general WHERE id BETWEEN 1 AND 1000 ORDER BY id;'],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                # Parse output - one ID per line
                return [int(line.strip()) for line in result.stdout.strip().split('\n') if line.strip()]
            return []
        except Exception:
            return []


def create_minimal_mp3(output_path: str) -> bool:
    """
    Create a minimal valid MP3 file for testing

    Args:
        output_path: Path where to create the MP3 file

    Returns:
        True if successful, False otherwise
    """
    # Minimal valid MP3 (417 bytes)
    minimal_mp3 = bytes.fromhex(
        # ID3v2.3 header (10 bytes)
        '494433030000000000'
        # MP3 frame header (4 bytes): MPEG 1 Layer 3, 128kbps, 44100Hz, mono
        'FFFB90C4'
        # Frame data (413 bytes of silence)
        + '00' * 413
    )

    try:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        with open(output, 'wb') as f:
            f.write(minimal_mp3)

        return True

    except Exception as e:
        print(f"Failed to create MP3 file: {e}")
        return False


# Standalone usage
if __name__ == '__main__':
    print("CDR Seeder - designed to run inside Docker container")
    print("\nManual seeding:")
    print("  from helpers.cdr_seeder import CDRSeeder")
    print("  CDRSeeder().seed()")
    print("\nManual cleanup:")
    print("  from helpers.cdr_seeder import CDRSeeder")
    print("  CDRSeeder().cleanup()")
