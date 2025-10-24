#!/usr/bin/env python3
"""
Extract all rest_* translation keys from PBXCoreREST source code.

This script scans PHP files in /src/PBXCoreREST directory and extracts all
translation key references (rest_*) used in:
- ApiResource attributes (description)
- ApiOperation attributes (summary, description)
- ApiResponse attributes (description)
- ApiParameter attributes (description)
- Custom attribute fields

Output: JSON file with all found keys and their locations.
"""

import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict


class RestApiKeyExtractor:
    """Extracts rest_* translation keys from PHP source code."""

    def __init__(self, source_dir: str):
        self.source_dir = Path(source_dir)
        self.keys: Dict[str, List[Dict]] = defaultdict(list)
        self.stats = {
            'files_scanned': 0,
            'keys_found': 0,
            'unique_keys': 0
        }

    def extract_keys(self) -> Dict:
        """Main extraction method."""
        print(f"Scanning directory: {self.source_dir}")

        # Find all PHP files
        php_files = list(self.source_dir.rglob('*.php'))
        print(f"Found {len(php_files)} PHP files")

        for php_file in php_files:
            self._scan_file(php_file)

        # Calculate stats
        self.stats['unique_keys'] = len(self.keys)

        return {
            'keys': dict(self.keys),
            'stats': self.stats
        }

    def _scan_file(self, file_path: Path):
        """Scan single PHP file for rest_* keys."""
        try:
            content = file_path.read_text(encoding='utf-8')
            self.stats['files_scanned'] += 1

            # Find all rest_* key references
            # Pattern matches: 'rest_something' or "rest_something"
            pattern = r'''['"](rest_[a-zA-Z0-9_]+)['"]'''

            for match in re.finditer(pattern, content):
                key = match.group(1)
                line_num = content[:match.start()].count('\n') + 1

                # Extract context (attribute name or usage)
                context = self._extract_context(content, match.start())

                # Store key location
                relative_path = file_path.relative_to(self.source_dir.parent.parent.parent)
                self.keys[key].append({
                    'file': str(relative_path),
                    'line': line_num,
                    'context': context
                })

                self.stats['keys_found'] += 1

        except Exception as e:
            print(f"Error scanning {file_path}: {e}", file=sys.stderr)

    def _extract_context(self, content: str, position: int) -> str:
        """Extract context around key usage (attribute name, parameter, etc.)."""
        # Look backwards for attribute name or context
        before = content[max(0, position - 200):position]

        # Common patterns
        patterns = [
            (r'#\[ApiResource\([^)]*description:', 'ApiResource.description'),
            (r'#\[ApiOperation\([^)]*summary:', 'ApiOperation.summary'),
            (r'#\[ApiOperation\([^)]*description:', 'ApiOperation.description'),
            (r'#\[ApiResponse\([^)]*[\'"]', 'ApiResponse.description'),
            (r'#\[ApiParameter\([^)]*description:', 'ApiParameter.description'),
            (r'#\[ApiParameterRef\([^)]*description:', 'ApiParameterRef.description'),
            (r'tags:\s*\[', 'ApiResource.tags'),
            (r'summary:\s*', 'summary'),
            (r'description:\s*', 'description'),
        ]

        for pattern, context_name in patterns:
            if re.search(pattern, before, re.IGNORECASE):
                return context_name

        return 'unknown'

    def print_summary(self):
        """Print extraction summary."""
        print("\n" + "=" * 70)
        print("EXTRACTION SUMMARY")
        print("=" * 70)
        print(f"Files scanned:    {self.stats['files_scanned']}")
        print(f"Keys found:       {self.stats['keys_found']}")
        print(f"Unique keys:      {self.stats['unique_keys']}")
        print("=" * 70)

        # Top 10 most used keys
        sorted_keys = sorted(self.keys.items(), key=lambda x: len(x[1]), reverse=True)
        print("\nTop 10 most referenced keys:")
        for key, locations in sorted_keys[:10]:
            print(f"  {key}: {len(locations)} occurrences")

    def save_to_json(self, output_file: str):
        """Save extracted keys to JSON file."""
        data = {
            'keys': dict(self.keys),
            'stats': self.stats
        }

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with output_path.open('w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\nSaved to: {output_path}")


def main():
    """Main entry point."""
    # Determine source directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent.parent.parent
    source_dir = project_root / 'src' / 'PBXCoreREST'

    if not source_dir.exists():
        print(f"Error: Source directory not found: {source_dir}", file=sys.stderr)
        sys.exit(1)

    # Extract keys
    extractor = RestApiKeyExtractor(str(source_dir))
    data = extractor.extract_keys()

    # Print summary
    extractor.print_summary()

    # Save to JSON
    output_file = script_dir / 'extracted_keys.json'
    extractor.save_to_json(str(output_file))

    print("\n✅ Extraction complete!")


if __name__ == '__main__':
    main()
