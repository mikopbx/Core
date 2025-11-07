#!/usr/bin/env bash
#
# Dangerous Test Runner - runs ONLY dangerous_network tests
#
# ⚠️  WARNING: These tests may break network connectivity!
# ⚠️  After running, you may need to restart container or network adapter
#
# Usage:
#   ./run-dangerous-tests.sh         # Run all dangerous tests (with confirmation)
#   ./run-dangerous-tests.sh --force # Skip confirmation
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for --force flag
if [[ "$1" != "--force" ]]; then
    echo "⚠️  WARNING: You are about to run DANGEROUS network tests!"
    echo ""
    echo "These tests will:"
    echo "  - Enable/disable firewall (may block container access)"
    echo "  - Create/modify static routes (may break routing)"
    echo "  - Modify DNS, hostname, gateway settings"
    echo ""
    echo "After running, you may need to:"
    echo "  1. Restart container: docker restart mikopbx-php83"
    echo "  2. Restart network adapter on host"
    echo ""
    echo "Tests to run: 14 dangerous_network tests"
    echo ""
    read -p "Continue? (yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

echo "🔥 Running DANGEROUS network tests"
echo "   Total dangerous tests: 14"
echo ""

# Run pytest with ONLY dangerous_network tests
python3 -m pytest -v -m "dangerous_network" "${@:2}"

exit_code=$?

echo ""
if [[ $exit_code -eq 0 ]]; then
    echo "✅ Dangerous tests completed successfully"
else
    echo "❌ Dangerous tests failed (exit code: $exit_code)"
fi

echo ""
echo "Checking container accessibility..."
if curl -f -s -o /dev/null http://192.168.117.2:8081; then
    echo "✅ Container is accessible"
else
    echo "⚠️  Container may be unreachable!"
    echo ""
    echo "Try to recover:"
    echo "  docker restart mikopbx-php83"
    echo "  # OR disable firewall manually:"
    echo "  docker exec mikopbx-php83 /usr/sbin/iptables -F"
fi

exit $exit_code
