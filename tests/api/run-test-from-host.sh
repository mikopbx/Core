#!/bin/bash
# Script to run test with fresh Python cache

set -e

echo "Clearing all Python caches..."
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
rm -rf .pytest_cache 2>/dev/null || true

echo "Verifying test file has no subprocess..."
if grep -q "subprocess" test_18b_sip_providers_manualattributes_pjsip_conf.py; then
    echo "ERROR: File still contains subprocess!"
    exit 1
fi
echo "✓ File is clean"

echo ""
echo "Running test..."
export PYTHONDONTWRITEBYTECODE=1
python3 -m pytest test_18b_sip_providers_manualattributes_pjsip_conf.py -v -s "$@"
