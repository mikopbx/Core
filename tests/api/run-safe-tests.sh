#!/usr/bin/env bash
#
# Safe Test Runner - excludes dangerous_network tests
#
# Usage:
#   ./run-safe-tests.sh              # Run all safe tests
#   ./run-safe-tests.sh test_01_*    # Run specific safe tests
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔒 Running SAFE tests (excluding dangerous_network)"
echo "   Total tests: 734"
echo "   Dangerous: 14 (skipped)"
echo "   Safe: 720"
echo ""

# Run pytest excluding dangerous_network tests
python3 -m pytest -v -m "not dangerous_network" "$@"

echo ""
echo "✅ Safe tests completed"
echo ""
echo "To run dangerous tests (may break network):"
echo "   python3 -m pytest -v -m \"dangerous_network\""
