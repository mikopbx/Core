#!/usr/bin/env python3
"""
Generate JSON fixtures from PHP Data Factories

This script extracts test data from PHP factory classes and converts them
to JSON format for use in Python/Schemathesis tests.

Usage:
    python generate_fixtures.py --data-dir ../AdminCabinet/Tests/Data --output-dir ../fixtures
"""

import re
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List

class PHPArrayParser:
    """Parse PHP arrays to Python dictionaries"""

    @staticmethod
    def parse_value(value: str) -> Any:
        """Convert PHP value to Python value"""
        value = value.strip()

        # Boolean
        if value == 'true':
            return True
        if value == 'false':
            return False

        # Null
        if value == 'null':
            return None

        # String (quoted)
        if (value.startswith("'") and value.endswith("'")) or \
           (value.startswith('"') and value.endswith('"')):
            return value[1:-1]

        # Number
        if value.isdigit():
            return int(value)
        if re.match(r'^-?\d+\.?\d*$', value):
            return float(value)

        # Array marker
        if value.startswith('['):
            return 'ARRAY'

        return value

    @staticmethod
    def extract_array_content(php_code: str) -> str:
        """Extract content between array brackets"""
        # Try pattern 1: private static array $...Data = [...]
        match = re.search(r'private static array \$\w+Data\s*=\s*(\[.*?\]);',
                         php_code, re.DOTALL)
        if match:
            return match.group(1)

        # Try pattern 2: private static array $... = [...] (without Data suffix)
        match = re.search(r'private static array \$\w+\s*=\s*(\[.*?\]);',
                         php_code, re.DOTALL)
        if match:
            return match.group(1)

        # Try pattern 3: private const string + private static array
        match = re.search(r'private static array \$\w+Files\s*=\s*(\[.*?\]);',
                         php_code, re.DOTALL)
        if match:
            return match.group(1)

        return ""

    @classmethod
    def parse(cls, php_code: str) -> Dict[str, Any]:
        """Parse PHP array syntax to Python dict"""
        content = cls.extract_array_content(php_code)
        if not content:
            return {}

        # Simple regex-based parsing for nested arrays
        # This handles the specific format used in Data Factories
        result = {}

        # Match top-level keys: 'key' => [...]
        pattern = r"'([^']+)'\s*=>\s*\[(.*?)\](?=,\s*'|\s*\])"
        matches = re.finditer(pattern, content, re.DOTALL)

        for match in matches:
            key = match.group(1)
            array_content = match.group(2)

            # Parse inner array
            item = {}
            # Match key-value pairs: 'key' => value
            kvp_pattern = r"'([^']+)'\s*=>\s*([^,\]]+)"
            for kvp_match in re.finditer(kvp_pattern, array_content):
                field_name = kvp_match.group(1)
                field_value = kvp_match.group(2).strip().rstrip(',')

                # Handle nested arrays
                if field_value == '[':
                    # Find closing bracket and parse nested content
                    nested_content = cls._extract_nested_array(array_content, kvp_match.end())
                    item[field_name] = nested_content
                else:
                    item[field_name] = cls.parse_value(field_value)

            result[key] = item

        return result

    @classmethod
    def _extract_nested_array(cls, content: str, start_pos: int) -> Dict[str, Any]:
        """Extract and parse nested array"""
        bracket_count = 1
        end_pos = start_pos

        while bracket_count > 0 and end_pos < len(content):
            if content[end_pos] == '[':
                bracket_count += 1
            elif content[end_pos] == ']':
                bracket_count -= 1
            end_pos += 1

        nested_content = content[start_pos:end_pos-1]

        # Parse nested key-value pairs
        nested = {}
        kvp_pattern = r"'([^']+)'\s*=>\s*([^,\]]+)"
        for match in re.finditer(kvp_pattern, nested_content):
            key = match.group(1)
            value = match.group(2).strip().rstrip(',')
            nested[key] = cls.parse_value(value)

        return nested


class FixtureGenerator:
    """Generate JSON fixtures from PHP Data Factories"""

    def __init__(self, data_dir: Path, output_dir: Path):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def find_factory_files(self) -> List[Path]:
        """Find all *DataFactory.php files"""
        return list(self.data_dir.glob('*DataFactory.php'))

    def extract_factory_data(self, factory_file: Path) -> Dict[str, Any]:
        """Extract test data from factory file"""
        try:
            content = factory_file.read_text(encoding='utf-8')
            return PHPArrayParser.parse(content)
        except Exception as e:
            print(f"⚠️  Error parsing {factory_file.name}: {e}")
            return {}

    def generate_fixture(self, factory_file: Path) -> None:
        """Generate JSON fixture from factory file"""
        # Extract data
        data = self.extract_factory_data(factory_file)

        if not data:
            print(f"⚠️  No data extracted from {factory_file.name}")
            return

        # Determine output filename
        # EmployeeDataFactory.php -> employees.json
        base_name = factory_file.stem.replace('DataFactory', '')
        # Convert CamelCase to snake_case
        snake_name = re.sub(r'(?<!^)(?=[A-Z])', '_', base_name).lower()
        output_file = self.output_dir / f"{snake_name}.json"

        # Write JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"✅ {factory_file.name} -> {output_file.name} ({len(data)} records)")

    def generate_all(self) -> None:
        """Generate all fixtures"""
        factory_files = self.find_factory_files()

        if not factory_files:
            print(f"❌ No factory files found in {self.data_dir}")
            return

        print(f"Found {len(factory_files)} factory files\n")
        print("=" * 80)

        for factory_file in sorted(factory_files):
            self.generate_fixture(factory_file)

        print("=" * 80)
        print(f"\n✅ Generated {len(factory_files)} fixtures in {self.output_dir}")

    def generate_index(self) -> None:
        """Generate index.json with all fixtures metadata"""
        fixtures = {}

        for json_file in sorted(self.output_dir.glob('*.json')):
            if json_file.name == 'index.json':
                continue

            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                fixtures[json_file.stem] = {
                    'file': json_file.name,
                    'count': len(data),
                    'keys': list(data.keys())
                }

        index_file = self.output_dir / 'index.json'
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(fixtures, f, indent=2, ensure_ascii=False)

        print(f"\n📋 Generated index: {index_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate JSON fixtures from PHP Data Factories'
    )
    parser.add_argument(
        '--data-dir',
        default='../../AdminCabinet/Tests/Data',
        help='Directory containing PHP Data Factory files'
    )
    parser.add_argument(
        '--output-dir',
        default='../fixtures',
        help='Output directory for JSON fixtures'
    )

    args = parser.parse_args()

    # Resolve paths relative to script location
    script_dir = Path(__file__).parent
    data_dir = (script_dir / args.data_dir).resolve()
    output_dir = (script_dir / args.output_dir).resolve()

    print("MikoPBX Fixture Generator")
    print("=" * 80)
    print(f"Data dir:   {data_dir}")
    print(f"Output dir: {output_dir}")
    print()

    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        return 1

    generator = FixtureGenerator(data_dir, output_dir)
    generator.generate_all()
    generator.generate_index()

    return 0


if __name__ == '__main__':
    exit(main())
