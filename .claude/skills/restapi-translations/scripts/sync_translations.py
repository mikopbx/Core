#!/usr/bin/env python3
"""
Synchronize REST API translation keys in RestApi.php.

This script modifies RestApi.php to:
- Add missing keys (found in code but not in RestApi.php)
- Remove unused keys (in RestApi.php but not used in code)

Features:
- Preserves file structure and comments
- Groups keys by resource
- Maintains alphabetical order
- Creates backup before modifications
- Validates PHP syntax after changes
"""

import os
import re
import json
import sys
import shutil
import argparse
from pathlib import Path
from typing import Dict, Set, List, Tuple
from collections import defaultdict
from datetime import datetime


class RestApiTranslationSync:
    """Synchronizes translation keys in RestApi.php."""

    def __init__(self, extracted_keys_file: str, restapi_file: str, dry_run: bool = False, auto_yes: bool = False):
        self.extracted_keys_file = Path(extracted_keys_file)
        self.restapi_file = Path(restapi_file)
        self.dry_run = dry_run
        self.auto_yes = auto_yes

        self.code_keys: Dict[str, List[Dict]] = {}
        self.missing_keys: Set[str] = set()
        self.unused_keys: Set[str] = set()

        self.changes_made = False

    def sync(self, add_missing: bool = False, remove_unused: bool = False):
        """Main synchronization method."""
        print("=" * 70)
        print("REST API TRANSLATION SYNCHRONIZATION")
        print("=" * 70)

        if self.dry_run:
            print("\n🔍 DRY RUN MODE - No changes will be made\n")

        if not add_missing and not remove_unused:
            print("Error: No action specified. Use --add-missing or --remove-unused")
            sys.exit(1)

        # Load data
        self._load_extracted_keys()
        missing, unused = self._find_differences()

        self.missing_keys = missing
        self.unused_keys = unused

        # Show summary
        self._print_summary(add_missing, remove_unused)

        # Confirm action
        if not self.dry_run and (self.missing_keys or self.unused_keys):
            if not self._confirm_action(add_missing, remove_unused):
                print("\n❌ Operation cancelled by user")
                return

        # Create backup
        if not self.dry_run:
            self._create_backup()

        # Perform sync
        if add_missing and self.missing_keys:
            self._add_missing_keys()

        if remove_unused and self.unused_keys:
            self._remove_unused_keys()

        # Validate PHP syntax
        if self.changes_made and not self.dry_run:
            self._validate_php_syntax()

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

    def _find_differences(self) -> Tuple[Set[str], Set[str]]:
        """Find missing and unused keys."""
        # Load current translation keys
        content = self.restapi_file.read_text(encoding='utf-8')
        translation_keys = set(re.findall(r'''['"](rest_[a-zA-Z0-9_]+)['"]''', content))

        # Find differences
        code_key_set = set(self.code_keys.keys())
        missing = code_key_set - translation_keys
        unused = translation_keys - code_key_set

        return missing, unused

    def _print_summary(self, add_missing: bool, remove_unused: bool):
        """Print operation summary."""
        print(f"\nActions to perform:")
        if add_missing:
            print(f"  ➕ Add missing keys:     {len(self.missing_keys)}")
        if remove_unused:
            print(f"  ➖ Remove unused keys:   {len(self.unused_keys)}")

        print(f"\nTotal changes:            {len(self.missing_keys) if add_missing else 0 + len(self.unused_keys) if remove_unused else 0}")

    def _confirm_action(self, add_missing: bool, remove_unused: bool) -> bool:
        """Ask user for confirmation."""
        print("\n" + "=" * 70)

        if add_missing and self.missing_keys:
            print(f"\n➕ Keys to add ({len(self.missing_keys)}):")
            for key in sorted(list(self.missing_keys)[:10]):
                print(f"  - {key}")
            if len(self.missing_keys) > 10:
                print(f"  ... and {len(self.missing_keys) - 10} more")

        if remove_unused and self.unused_keys:
            print(f"\n➖ Keys to remove ({len(self.unused_keys)}):")
            for key in sorted(list(self.unused_keys)[:10]):
                print(f"  - {key}")
            if len(self.unused_keys) > 10:
                print(f"  ... and {len(self.unused_keys) - 10} more")

        print("\n" + "=" * 70)

        if self.auto_yes:
            print("\nProceeding automatically (--yes flag)...")
            return True

        response = input("\nProceed with these changes? [y/N]: ")
        return response.lower() in ['y', 'yes']

    def _create_backup(self):
        """Create backup of RestApi.php."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = self.restapi_file.with_suffix(f'.php.bak.{timestamp}')

        shutil.copy2(self.restapi_file, backup_file)
        print(f"\n✅ Backup created: {backup_file}")

    def _add_missing_keys(self):
        """Add missing keys to RestApi.php."""
        print(f"\n➕ Adding {len(self.missing_keys)} missing keys...")

        content = self.restapi_file.read_text(encoding='utf-8')

        # Group keys by section
        grouped_keys = self._group_keys_for_insertion(self.missing_keys)

        # Insert keys into appropriate sections
        for section, keys in grouped_keys.items():
            content = self._insert_keys_into_section(content, section, keys)

        if not self.dry_run:
            self.restapi_file.write_text(content, encoding='utf-8')
            self.changes_made = True
        else:
            print("  [DRY RUN] Would add keys to RestApi.php")

    def _remove_unused_keys(self):
        """Remove unused keys from RestApi.php."""
        print(f"\n➖ Removing {len(self.unused_keys)} unused keys...")

        content = self.restapi_file.read_text(encoding='utf-8')

        # Remove each unused key
        for key in self.unused_keys:
            # Pattern to match entire line with key definition
            pattern = rf"^\s*['\"]({re.escape(key)})['\"].*?=>.*?['\"].*?['\"],?\s*$"
            content = re.sub(pattern, '', content, flags=re.MULTILINE)

        if not self.dry_run:
            self.restapi_file.write_text(content, encoding='utf-8')
            self.changes_made = True
        else:
            print("  [DRY RUN] Would remove keys from RestApi.php")

    def _group_keys_for_insertion(self, keys: Set[str]) -> Dict[str, List[str]]:
        """Group keys by section for organized insertion."""
        grouped = defaultdict(list)

        for key in keys:
            # Determine section based on key pattern
            if '_ApiDescription' in key:
                section = 'API_DESCRIPTIONS'
            elif re.match(r'rest_response_\d+_', key):
                section = 'API_RESPONSES'
            elif key.startswith('rest_security_'):
                section = 'SECURITY_SCHEMES'
            else:
                # Extract resource abbreviation (e.g., ext, fw, am)
                match = re.match(r'rest_([a-z]+)_', key)
                if match:
                    abbr = match.group(1)
                    section = f'RESOURCE_{abbr.upper()}'
                else:
                    section = 'MISC'

            grouped[section].append(key)

        return grouped

    def _insert_keys_into_section(self, content: str, section: str, keys: List[str]) -> str:
        """Insert keys into appropriate section of RestApi.php."""
        # Generate placeholder text for each key
        key_lines = []
        for key in sorted(keys):
            # Generate Russian placeholder based on key name
            placeholder = self._generate_placeholder(key)
            # Escape single quotes in placeholder for PHP string
            placeholder_escaped = placeholder.replace("'", "\\'")
            key_lines.append(f"    '{key}' => '{placeholder_escaped}',")

        # Find section or create if not exists
        section_pattern = rf"// {section}\s*\n// =+"

        if re.search(section_pattern, content):
            # Section exists, insert before next section
            next_section = rf"(// {section}\s*\n// =+.*?\n)(.*?)(\n\s*// =+)"
            replacement = r"\1\2" + "\n".join(key_lines) + r"\3"
            content = re.sub(next_section, replacement, content, flags=re.DOTALL)
        else:
            # Section doesn't exist, append to end before closing ];
            new_section = f"\n    // {'=' * 76}\n"
            new_section += f"    // {section}\n"
            new_section += f"    // {'=' * 76}\n"
            new_section += "\n".join(key_lines) + "\n"

            # Insert before final ];
            # Find and replace the closing ];
            if content.rstrip().endswith('];'):
                content = content.rstrip()[:-2]  # Remove ];
                content = content.rstrip() + "\n" + new_section + "];\n"
            else:
                # No closing ]; found, just append
                content = content.rstrip() + "\n" + new_section + "\n];\n"

        return content

    def _generate_placeholder(self, key: str) -> str:
        """Generate Russian placeholder text based on key name."""
        # Extract operation or description
        if '_ApiDescription' in key:
            return 'Описание API ресурса [ТРЕБУЕТ ПЕРЕВОДА]'
        elif key.startswith('rest_response_'):
            return 'Описание HTTP ответа [ТРЕБУЕТ ПЕРЕВОДА]'
        elif key.startswith('rest_security_'):
            return 'Описание метода аутентификации [ТРЕБУЕТ ПЕРЕВОДА]'
        elif 'GetList' in key:
            return 'Получить список [ТРЕБУЕТ ПЕРЕВОДА]'
        elif 'GetRecord' in key:
            return 'Получить запись [ТРЕБУЕТ ПЕРЕВОДА]'
        elif 'Create' in key:
            return 'Создать запись [ТРЕБУЕТ ПЕРЕВОДА]'
        elif 'Update' in key:
            return 'Обновить запись [ТРЕБУЕТ ПЕРЕВОДА]'
        elif 'Delete' in key:
            return 'Удалить запись [ТРЕБУЕТ ПЕРЕВОДА]'
        elif 'Desc' in key:
            return 'Подробное описание операции [ТРЕБУЕТ ПЕРЕВОДА]'
        else:
            return 'Описание [ТРЕБУЕТ ПЕРЕВОДА]'

    def _validate_php_syntax(self):
        """Validate PHP syntax after modifications."""
        print("\n🔍 Validating PHP syntax...")

        # Show actual error
        import subprocess
        result = subprocess.run(['php', '-l', str(self.restapi_file)],
                              capture_output=True, text=True)

        if result.returncode == 0:
            print("✅ PHP syntax is valid")
        else:
            print("❌ PHP syntax error detected!", file=sys.stderr)
            print(f"\nPHP Error Output:\n{result.stderr}", file=sys.stderr)
            print(f"\nPHP Output:\n{result.stdout}", file=sys.stderr)

            # Save broken file for debugging
            debug_file = self.restapi_file.with_suffix('.php.broken')
            shutil.copy2(self.restapi_file, debug_file)
            print(f"\n💾 Broken file saved to: {debug_file}", file=sys.stderr)

            print("\nRestoring from backup...", file=sys.stderr)
            # Find latest backup
            backups = sorted(self.restapi_file.parent.glob('RestApi.php.bak.*'))
            if backups:
                shutil.copy2(backups[-1], self.restapi_file)
                print(f"✅ Restored from {backups[-1]}")
            sys.exit(1)

    def _print_results(self):
        """Print operation results."""
        print("\n" + "=" * 70)
        print("SYNCHRONIZATION COMPLETE")
        print("=" * 70)

        if self.dry_run:
            print("\n🔍 DRY RUN - No changes were made")
            print("Remove --dry-run flag to apply changes")
        elif self.changes_made:
            print("\n✅ RestApi.php has been updated successfully!")
            print("\nNext steps:")
            print("  1. Review changes: git diff src/Common/Messages/ru/RestApi.php")
            print("  2. Translate placeholder text from Russian")
            print("  3. Run validate_translations.py to verify")
        else:
            print("\n✅ No changes needed - translations are in sync!")

        print("=" * 70)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Synchronize REST API translation keys in RestApi.php',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Add missing keys only
  %(prog)s --add-missing

  # Remove unused keys only
  %(prog)s --remove-unused

  # Full sync (add and remove)
  %(prog)s --add-missing --remove-unused

  # Preview changes without modifying
  %(prog)s --add-missing --dry-run
        """
    )

    parser.add_argument(
        '--add-missing',
        action='store_true',
        help='Add missing keys to RestApi.php'
    )

    parser.add_argument(
        '--remove-unused',
        action='store_true',
        help='Remove unused keys from RestApi.php'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying files'
    )

    parser.add_argument(
        '--yes', '-y',
        action='store_true',
        help='Skip confirmation prompts'
    )

    args = parser.parse_args()

    # Determine file paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent.parent.parent

    extracted_keys_file = script_dir / 'extracted_keys.json'
    restapi_file = project_root / 'src' / 'Common' / 'Messages' / 'ru' / 'RestApi.php'

    # Sync
    sync = RestApiTranslationSync(
        str(extracted_keys_file),
        str(restapi_file),
        dry_run=args.dry_run,
        auto_yes=args.yes
    )

    sync.sync(
        add_missing=args.add_missing,
        remove_unused=args.remove_unused
    )


if __name__ == '__main__':
    main()
