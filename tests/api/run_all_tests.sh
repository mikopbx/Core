#!/bin/bash
# Run all MikoPBX REST API v3 tests
# Usage: ./run_all_tests.sh [working|high|medium|low|all]

set -e

cd "$(dirname "$0")"

MODE="${1:-all}"

echo "=========================================="
echo "MikoPBX REST API v3 Test Suite"
echo "=========================================="
echo ""

case "$MODE" in
    working)
        echo "Running WORKING tests only (no DB writes)..."
        echo ""
        pytest test_16*.py test_20*.py test_21*.py test_22*.py test_23*.py \
               test_24*.py test_25*.py test_27*.py \
               test_43*.py test_44*.py test_45*.py test_46*.py \
               -v -s --tb=short
        ;;
    high)
        echo "Running HIGH PRIORITY tests (core features)..."
        echo ""
        pytest test_28*.py test_29*.py test_30*.py test_31*.py test_32*.py \
               test_33*.py test_34*.py test_35*.py test_36*.py test_37*.py \
               -v -s --tb=short
        ;;
    medium)
        echo "Running MEDIUM PRIORITY tests (configuration)..."
        echo ""
        pytest test_38*.py test_39*.py test_40*.py test_41*.py test_42*.py \
               -v -s --tb=short
        ;;
    low)
        echo "Running LOW PRIORITY tests (info/status)..."
        echo ""
        pytest test_43*.py test_44*.py test_45*.py test_46*.py test_47*.py test_48*.py \
               -v -s --tb=short
        ;;
    all)
        echo "Running ALL tests..."
        echo ""
        pytest test_*.py -v -s --tb=short
        ;;
    *)
        echo "Unknown mode: $MODE"
        echo "Usage: $0 [working|high|medium|low|all]"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Tests completed!"
echo "=========================================="
