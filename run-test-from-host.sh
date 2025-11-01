#!/bin/bash
# Script to run DeleteAllSettingsTest from host machine
# This allows the test to survive container restarts

# Set environment variables
export BROWSERSTACK_USERNAME="bsuser63039"
export BROWSERSTACK_ACCESS_KEY="hqQXx7KMkEj3yMqoHArr"
export BROWSERSTACK_LOCAL="true"
export BROWSERSTACK_LOCAL_IDENTIFIER="local_test"
export BROWSERSTACK_DAEMON_START="true"
export SERVER_PBX="http://localhost:8081"
export BUILD_NUMBER="local-host-run"
export MIKO_LICENSE_KEY="MIKO-GW0DC-QEQQD-WN87S-C88PG"
export CONFIG_FILE="tests/AdminCabinet/config/local.conf.json"

# Run the test
echo "Running DeleteAllSettingsTest from host machine..."
echo "Server: $SERVER_PBX"
echo "Config: $CONFIG_FILE"
echo ""

./vendor/bin/phpunit tests/AdminCabinet/Tests/DeleteAllSettingsTest.php \
    --colors=never \
    --verbose \
    2>&1 | tee /tmp/host_test_run.log

echo ""
echo "Test completed. Log saved to /tmp/host_test_run.log"
