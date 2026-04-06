#!/usr/bin/env python3
"""
Validate REST API translation keys between source code and RestApi.php.

This script compares extracted keys from source code with keys defined in
the RestApi.php translation file and reports:
- Missing keys (in code but not in RestApi.php)
- Unused keys (in RestApi.php but not used in code)
- Valid keys (present in both)
"""

import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, Set, List
from collections import defaultdict


class RestApiTranslationValidator:
    """Validates translation keys between code and RestApi.php."""

    def __init__(self, extracted_keys_file: str, restapi_file: str):
        self.extracted_keys_file = Path(extracted_keys_file)
        self.restapi_file = Path(restapi_file)

        self.code_keys: Dict[str, List[Dict]] = {}
        self.translation_keys: Set[str] = set()

        self.missing_keys: Set[str] = set()
        self.unused_keys: Set[str] = set()
        self.valid_keys: Set[str] = set()

    def validate(self):
        """Main validation method."""
        print("=" * 70)
        print("REST API TRANSLATION VALIDATION")
        print("=" * 70)

        # Load extracted keys from JSON
        self._load_extracted_keys()

        # Load translation keys from RestApi.php
        self._load_translation_keys()

        # Compare keys
        self._compare_keys()

        # Print results
        self._print_results()

    def _load_extracted_keys(self):
        """Load extracted keys from JSON file."""
        if not self.extracted_keys_file.exists():
            print(f"Error: Extracted keys file not found: {self.extracted_keys_file}", file=sys.stderr)
            print("Run extract_keys.py first!", file=sys.stderr)
            sys.exit(1)

        with self.extracted_keys_file.open('r', encoding='utf-8') as f:
            data = json.load(f)
            self.code_keys = data['keys']

        print(f"\n✅ Loaded {len(self.code_keys)} keys from source code")

    def _load_translation_keys(self):
        """Load translation keys from RestApi.php."""
        if not self.restapi_file.exists():
            print(f"Error: RestApi.php not found: {self.restapi_file}", file=sys.stderr)
            sys.exit(1)

        content = self.restapi_file.read_text(encoding='utf-8')

        # Pattern to match: 'rest_key' => 'translation'
        pattern = r'''['"](rest_[a-zA-Z0-9_]+)['"]'''

        for match in re.finditer(pattern, content):
            key = match.group(1)
            self.translation_keys.add(key)

        print(f"✅ Loaded {len(self.translation_keys)} keys from RestApi.php")

    def _compare_keys(self):
        """Compare code keys with translation keys."""
        code_key_set = set(self.code_keys.keys())

        # Find missing keys (in code but not in translations)
        self.missing_keys = code_key_set - self.translation_keys

        # Find unused keys (in translations but not in code)
        self.unused_keys = self.translation_keys - code_key_set

        # Find valid keys (present in both)
        self.valid_keys = code_key_set & self.translation_keys

    def _print_results(self):
        """Print validation results."""
        print("\n" + "=" * 70)
        print("VALIDATION RESULTS")
        print("=" * 70)

        # Summary
        total_code_keys = len(self.code_keys)
        valid_count = len(self.valid_keys)
        missing_count = len(self.missing_keys)
        unused_count = len(self.unused_keys)

        print(f"\n✅ Valid keys:    {valid_count}/{total_code_keys} ({self._percentage(valid_count, total_code_keys)}%)")
        print(f"❌ Missing keys:  {missing_count} (in code, not in RestApi.php)")
        print(f"⚠️  Unused keys:   {unused_count} (in RestApi.php, not used in code)")

        # Missing keys detail
        if self.missing_keys:
            print("\n" + "-" * 70)
            print("MISSING KEYS (need to add to RestApi.php):")
            print("-" * 70)

            # Group by prefix for better readability
            grouped = self._group_keys_by_prefix(self.missing_keys)

            for prefix, keys in sorted(grouped.items()):
                print(f"\n{prefix}:")
                for key in sorted(keys):
                    # Show first location
                    locations = self.code_keys[key]
                    first_loc = locations[0]
                    print(f"  - {key}")
                    print(f"    Location: {first_loc['file']}:{first_loc['line']}")
                    print(f"    Context:  {first_loc['context']}")
                    if len(locations) > 1:
                        print(f"    (Used in {len(locations)} places)")

        # Unused keys detail
        if self.unused_keys:
            print("\n" + "-" * 70)
            print("UNUSED KEYS (can be removed from RestApi.php):")
            print("-" * 70)

            # Group by prefix
            grouped = self._group_keys_by_prefix(self.unused_keys)

            for prefix, keys in sorted(grouped.items()):
                print(f"\n{prefix}:")
                for key in sorted(keys):
                    print(f"  - {key}")

        # Overall status
        print("\n" + "=" * 70)
        if not self.missing_keys and not self.unused_keys:
            print("✅ PERFECT! All translations are in sync.")
        elif not self.missing_keys:
            print("✅ No missing keys. Consider removing unused keys.")
        elif not self.unused_keys:
            print("⚠️  Missing keys found. Run sync_translations.py --add-missing")
        else:
            print("⚠️  Issues found. Run sync_translations.py to fix.")
        print("=" * 70)

    def _group_keys_by_prefix(self, keys: Set[str]) -> Dict[str, List[str]]:
        """Group keys by common prefix."""
        grouped = defaultdict(list)

        for key in keys:
            # Extract prefix (rest_xxx_)
            match = re.match(r'(rest_[a-z]+_)', key)
            if match:
                prefix = match.group(1)
            else:
                # Handle keys like rest_ApiDescription
                prefix = 'rest_'

            grouped[prefix].append(key)

        return grouped

    def _percentage(self, part: int, total: int) -> int:
        """Calculate percentage."""
        if total == 0:
            return 0
        return int((part / total) * 100)

    def get_summary(self) -> Dict:
        """Get validation summary as dict."""
        return {
            'valid_keys': len(self.valid_keys),
            'missing_keys': len(self.missing_keys),
            'unused_keys': len(self.unused_keys),
            'total_code_keys': len(self.code_keys),
            'total_translation_keys': len(self.translation_keys)
        }


def main():
    """Main entry point."""
    # Determine file paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent.parent.parent

    extracted_keys_file = script_dir / 'extracted_keys.json'
    restapi_file = project_root / 'src' / 'Common' / 'Messages' / 'ru' / 'RestApi.php'

    # Validate
    validator = RestApiTranslationValidator(
        str(extracted_keys_file),
        str(restapi_file)
    )
    validator.validate()


if __name__ == '__main__':
    main()
