# CRUD Operation Examples

Complete workflows demonstrating Create, Read, Update, Delete operations for common MikoPBX resources.

## Extensions CRUD Workflow

### Complete Extension Lifecycle

```bash
# Step 1: Create extension
echo "=== Creating Extension ==="
./api-request.sh POST extensions \
  --json '{
    "number": "301",
    "username": "alice_smith",
    "mobile": "1234567890",
    "email": "alice@example.com",
    "secret": "strongPassword123"
  }'

# Step 2: Verify creation
echo -e "\n=== Verifying Extension ==="
./api-request.sh GET "extensions/301"

# Step 3: Update extension
echo -e "\n=== Updating Mobile Number ==="
./api-request.sh PATCH "extensions/301" \
  --data "mobile=9998887777"

# Step 4: Verify update
echo -e "\n=== Verifying Update ==="
./api-request.sh GET "extensions/301"

# Step 5: Search for extension
echo -e "\n=== Searching Extensions ==="
./api-request.sh GET "extensions?search=alice"

# Step 6: Delete extension
echo -e "\n=== Deleting Extension ==="
./api-request.sh DELETE "extensions/301"

# Step 7: Verify deletion
echo -e "\n=== Verifying Deletion (should return 404) ==="
./api-request.sh GET "extensions/301" || echo "Extension successfully deleted"
```

### Batch Extension Creation

```bash
#!/bin/bash
# Create multiple extensions

echo "Creating extensions 401-410..."

for i in {401..410}; do
    echo "Creating extension $i..."

    ./api-request.sh POST extensions \
      --data "number=$i&username=user_$i&mobile=555000$i" \
      --lines 10

    # Brief pause to avoid overwhelming the API
    sleep 0.5
done

echo -e "\n=== Verification: List all created extensions ==="
./api-request.sh GET "extensions?search=user_&limit=20"
```

## Providers CRUD Workflow

### SIP Provider Lifecycle

```bash
# Step 1: Create SIP provider
echo "=== Creating SIP Provider ==="
./api-request.sh POST providers \
  --json '{
    "type": "sip",
    "description": "Test SIP Trunk",
    "host": "sip.testprovider.com",
    "username": "test_account",
    "secret": "test_password",
    "disabled": "0",
    "qualify": "1",
    "registration": "1"
  }'

# Extract provider ID from response
RESPONSE=$(./api-request.sh POST providers \
  --json '{
    "type": "sip",
    "description": "Test SIP Trunk",
    "host": "sip.testprovider.com",
    "username": "test_account",
    "secret": "test_password"
  }' --lines 0)

PROVIDER_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Created provider ID: $PROVIDER_ID"

# Step 2: Read provider
echo -e "\n=== Reading Provider ==="
./api-request.sh GET "providers/$PROVIDER_ID"

# Step 3: Update provider
echo -e "\n=== Disabling Provider ==="
./api-request.sh PATCH "providers/$PROVIDER_ID" --data "disabled=1"

# Step 4: Enable provider
echo -e "\n=== Enabling Provider ==="
./api-request.sh PATCH "providers/$PROVIDER_ID" --data "disabled=0"

# Step 5: Update credentials
echo -e "\n=== Updating Credentials ==="
./api-request.sh PATCH "providers/$PROVIDER_ID" \
  --data "username=new_account&secret=new_password"

# Step 6: Delete provider
echo -e "\n=== Deleting Provider ==="
./api-request.sh DELETE "providers/$PROVIDER_ID"
```

### IAX Provider Example

```bash
# Create IAX provider
echo "=== Creating IAX Provider ==="
./api-request.sh POST providers \
  --json '{
    "type": "iax",
    "description": "IAX Test Provider",
    "host": "iax.testprovider.com",
    "username": "iax_user",
    "secret": "iax_password",
    "disabled": "0"
  }'
```

## Incoming Routes CRUD Workflow

### Route Management

```bash
# Prerequisite: Create provider and extension first
PROVIDER_ID=1
EXTENSION_NUMBER=201

# Step 1: Create incoming route
echo "=== Creating Incoming Route ==="
./api-request.sh POST incoming-routes \
  --json '{
    "provider": "'$PROVIDER_ID'",
    "number": "88001234567",
    "extension": "'$EXTENSION_NUMBER'",
    "priority": "1",
    "note": "Main incoming line"
  }'

# Get route ID
ROUTE_RESPONSE=$(./api-request.sh POST incoming-routes \
  --json '{
    "provider": "'$PROVIDER_ID'",
    "number": "88001234567",
    "extension": "'$EXTENSION_NUMBER'",
    "priority": "1"
  }' --lines 0)

ROUTE_ID=$(echo "$ROUTE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Created route ID: $ROUTE_ID"

# Step 2: Read route
echo -e "\n=== Reading Route ==="
./api-request.sh GET "incoming-routes/$ROUTE_ID"

# Step 3: Update destination
echo -e "\n=== Changing Destination to Extension 202 ==="
./api-request.sh PATCH "incoming-routes/$ROUTE_ID" --data "extension=202"

# Step 4: Update priority
echo -e "\n=== Changing Priority ==="
./api-request.sh PATCH "incoming-routes/$ROUTE_ID" --data "priority=5"

# Step 5: Delete route
echo -e "\n=== Deleting Route ==="
./api-request.sh DELETE "incoming-routes/$ROUTE_ID"
```

## CDR Operations

### Query Call Records

```bash
# Get today's calls
TODAY=$(date +%Y-%m-%d)
echo "=== Today's Calls ==="
./api-request.sh GET "cdr?dateFrom=$TODAY&limit=20"

# Get calls from specific date range
echo -e "\n=== Last Week's Calls ==="
DATE_FROM=$(date -d '7 days ago' +%Y-%m-%d)
DATE_TO=$(date +%Y-%m-%d)
./api-request.sh GET "cdr?dateFrom=$DATE_FROM&dateTo=$DATE_TO%2023:59:59&limit=50"

# Search by phone number
echo -e "\n=== Calls with Specific Number ==="
./api-request.sh GET "cdr?search=79643442732&limit=10"

# Search by caller name
echo -e "\n=== Calls from Ivan ==="
./api-request.sh GET "cdr?search=Ivan&limit=10"
```

### CDR Playback Workflow

```bash
# Step 1: Get call record ID from CDR list
CDR_RESPONSE=$(./api-request.sh GET "cdr?limit=1" --lines 0)
CALL_ID=$(echo "$CDR_RESPONSE" | python3 -c "import sys,json; items=json.load(sys.stdin)['data']['items']; print(items[0]['id'] if items else '')")

if [[ -n "$CALL_ID" ]]; then
    echo "Processing call ID: $CALL_ID"

    # Step 2: Get playback token
    echo -e "\n=== Getting Playback Token ==="
    TOKEN_RESPONSE=$(./api-request.sh POST "cdr:playback" --data "id=$CALL_ID" --lines 0)
    PLAYBACK_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

    echo "Playback token: ${PLAYBACK_TOKEN:0:50}..."

    # Step 3: Construct playback URL
    PLAYBACK_URL="http://127.0.0.1:8081/pbxcore/api/v3/cdr/playback?token=$PLAYBACK_TOKEN"
    echo "Playback URL: $PLAYBACK_URL"

    # Step 4: Download recording (optional)
    echo -e "\n=== Downloading Recording ==="
    ./api-request.sh POST "cdr:download" --data "id=$CALL_ID" --lines 20
else
    echo "No CDR records found"
fi
```

### Delete Old CDR Records

```bash
# Get CDR records older than 30 days
CUTOFF_DATE=$(date -d '30 days ago' +%Y-%m-%d)

echo "=== Finding Old CDR Records (before $CUTOFF_DATE) ==="
OLD_RECORDS=$(./api-request.sh GET "cdr?dateTo=$CUTOFF_DATE&limit=100" --lines 0)

# Extract IDs
IDS=$(echo "$OLD_RECORDS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['result'] and 'items' in data['data']:
    for item in data['data']['items']:
        print(item['id'])
")

# Delete each record
if [[ -n "$IDS" ]]; then
    echo "$IDS" | while read -r ID; do
        echo "Deleting CDR record: $ID"
        ./api-request.sh DELETE "cdr/$ID" --lines 5
        sleep 0.2
    done
else
    echo "No old records found"
fi
```

## IVR Menu Workflow

```bash
# Step 1: Create IVR menu
echo "=== Creating IVR Menu ==="
./api-request.sh POST ivr-menus \
  --json '{
    "name": "Main Menu",
    "extension": "5000",
    "timeout": "10",
    "timeoutExtension": "201",
    "allowDialInternal": "1"
  }'

# Get IVR ID
IVR_RESPONSE=$(./api-request.sh POST ivr-menus \
  --json '{"name":"Main Menu","extension":"5000"}' --lines 0)

IVR_ID=$(echo "$IVR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# Step 2: Add menu actions
echo -e "\n=== Adding Menu Actions ==="
./api-request.sh POST "ivr-menus/$IVR_ID/actions" \
  --json '{
    "digit": "1",
    "extension": "201",
    "description": "Sales Department"
  }'

./api-request.sh POST "ivr-menus/$IVR_ID/actions" \
  --json '{
    "digit": "2",
    "extension": "202",
    "description": "Support Department"
  }'

# Step 3: Update timeout
echo -e "\n=== Updating Timeout ==="
./api-request.sh PATCH "ivr-menus/$IVR_ID" --data "timeout=15"

# Step 4: Delete IVR
echo -e "\n=== Deleting IVR Menu ==="
./api-request.sh DELETE "ivr-menus/$IVR_ID"
```

## Call Queue Workflow

```bash
# Step 1: Create call queue
echo "=== Creating Call Queue ==="
./api-request.sh POST call-queues \
  --json '{
    "name": "Support Queue",
    "extension": "6000",
    "strategy": "rrmemory",
    "timeout": "30",
    "periodicAnnounce": "queue-periodic-announce"
  }'

# Get queue ID
QUEUE_RESPONSE=$(./api-request.sh POST call-queues \
  --json '{"name":"Support Queue","extension":"6000"}' --lines 0)

QUEUE_ID=$(echo "$QUEUE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# Step 2: Add members
echo -e "\n=== Adding Queue Members ==="
./api-request.sh POST "call-queues/$QUEUE_ID/members" \
  --data "extension=201"

./api-request.sh POST "call-queues/$QUEUE_ID/members" \
  --data "extension=202"

# Step 3: Update strategy
echo -e "\n=== Changing Ring Strategy ==="
./api-request.sh PATCH "call-queues/$QUEUE_ID" --data "strategy=ringall"

# Step 4: Delete queue
echo -e "\n=== Deleting Call Queue ==="
./api-request.sh DELETE "call-queues/$QUEUE_ID"
```

## Complete Test Scenario

```bash
#!/bin/bash
# Complete integration test

set -e  # Exit on error

echo "======================================"
echo "MikoPBX API Integration Test"
echo "======================================"

# 1. Create extension
echo -e "\n1. Creating test extension..."
EXT_RESPONSE=$(./api-request.sh POST extensions \
  --json '{
    "number": "999",
    "username": "test_user",
    "mobile": "5551234567",
    "email": "test@example.com"
  }' --lines 0)

EXT_ID=$(echo "$EXT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Created extension ID: $EXT_ID"

# 2. Verify extension exists
echo -e "\n2. Verifying extension..."
./api-request.sh GET "extensions/999" --lines 20

# 3. Update extension
echo -e "\n3. Updating extension mobile..."
./api-request.sh PATCH "extensions/999" --data "mobile=5559998888" --lines 10

# 4. Search for extension
echo -e "\n4. Searching for extension..."
./api-request.sh GET "extensions?search=test_user" --lines 20

# 5. Create provider
echo -e "\n5. Creating test provider..."
PROV_RESPONSE=$(./api-request.sh POST providers \
  --json '{
    "type": "sip",
    "description": "Test Provider",
    "host": "test.example.com",
    "username": "testuser",
    "secret": "testpass"
  }' --lines 0)

PROV_ID=$(echo "$PROV_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Created provider ID: $PROV_ID"

# 6. Create incoming route
echo -e "\n6. Creating incoming route..."
ROUTE_RESPONSE=$(./api-request.sh POST incoming-routes \
  --json '{
    "provider": "'$PROV_ID'",
    "number": "12345",
    "extension": "999",
    "priority": "1"
  }' --lines 0)

ROUTE_ID=$(echo "$ROUTE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Created route ID: $ROUTE_ID"

# 7. Verify route
echo -e "\n7. Verifying route..."
./api-request.sh GET "incoming-routes/$ROUTE_ID" --lines 20

# Cleanup
echo -e "\n8. Cleanup: Deleting test data..."
./api-request.sh DELETE "incoming-routes/$ROUTE_ID" --lines 5
./api-request.sh DELETE "providers/$PROV_ID" --lines 5
./api-request.sh DELETE "extensions/999" --lines 5

echo -e "\n======================================"
echo "Integration test completed successfully!"
echo "======================================"
```

## Error Handling Examples

### Handling Validation Errors

```bash
# Try to create extension with missing required field
echo "=== Testing Validation Error ==="
RESPONSE=$(./api-request.sh POST extensions \
  --data "username=test" --lines 0 2>&1) || {

    # Extract error messages
    ERRORS=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'messages' in data and 'error' in data['messages']:
        for err in data['messages']['error']:
            print('- ' + err)
except:
    print('Failed to parse error')
")

    echo "Validation failed:"
    echo "$ERRORS"
}
```

### Retry Logic

```bash
# Retry failed requests
MAX_RETRIES=3
RETRY_COUNT=0

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    echo "Attempt $((RETRY_COUNT + 1))/$MAX_RETRIES..."

    if ./api-request.sh GET extensions --lines 5; then
        echo "Success!"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; then
            echo "Failed, retrying in 2 seconds..."
            sleep 2
        else
            echo "All retries failed"
            exit 1
        fi
    fi
done
```

## See Also

- [HTTP Methods Reference](../reference/http-methods.md) - Method details
- [Common Endpoints](../reference/common-endpoints.md) - Endpoint reference
- [SKILL.md](../SKILL.md) - Main documentation
