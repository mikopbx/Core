#!/bin/bash
# Test script for MikoPBX SQLite Inspector Skill
# This demonstrates basic functionality

set -e

echo "=== MikoPBX SQLite Inspector Skill Test ==="
echo ""

# Get container ID
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

if [ -z "$CONTAINER_ID" ]; then
    echo "Error: No MikoPBX container found"
    exit 1
fi

echo "Using container: $CONTAINER_ID"
echo ""

# Test 1: Basic query
echo "Test 1: List first 5 extensions"
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid FROM m_Extensions LIMIT 5" -header -column
echo ""

# Test 2: Count records
echo "Test 2: Count extensions by type"
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT type, COUNT(*) as count FROM m_Extensions GROUP BY type" -header -column
echo ""

# Test 3: Check relationships
echo "Test 3: Extensions with SIP accounts"
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number, e.callerid, s.transport
   FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.type = 'SIP'
   LIMIT 5" -header -column
echo ""

# Test 4: JSON output
echo "Test 4: Providers in JSON format"
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, type, description, disabled FROM m_Providers LIMIT 3" -json
echo ""

# Test 5: Data consistency check
echo "Test 5: Check for orphaned SIP accounts"
ORPHANS=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE s.extension IS NOT NULL AND e.number IS NULL")
echo "Orphaned SIP accounts: $ORPHANS (should be 0)"
echo ""

# Test 6: Using helper script
echo "Test 6: Using helper script"
if [ -f "$(dirname $0)/db-query.sh" ]; then
    $(dirname $0)/db-query.sh $CONTAINER_ID \
      "SELECT COUNT(*) as total_extensions FROM m_Extensions" column
else
    echo "Helper script not found (this is OK for testing)"
fi
echo ""

echo "=== All tests completed ==="
