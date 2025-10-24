---
name: asterisk-tester
description: Тестирование сценариев Asterisk dialplan и потоков звонков используя безопасные Local каналы. Использовать при тестировании логики маршрутизации звонков, отладке проблем dialplan или проверке потоков IVR меню.
allowed-tools: Bash, Read, Grep, Glob
---

# asterisk-dialplan-testing

Tests Asterisk dialplan scenarios and call flows to verify they work as expected.

## What this skill does

- Tests dialplan contexts and extensions
- Simulates call flows through the dialplan
- Verifies routing logic and conditions
- Tests IVR menus and time conditions
- Validates AGI/AMI integrations
- Checks pattern matching and regular expressions

## When to use this skill

Use this skill when:
- Creating or modifying dialplan scenarios
- Testing call routing logic
- Verifying IVR menu flows
- Debugging call issues
- Testing time-based routing
- Validating custom dialplan applications

## How to use this skill

Simply describe what you want to test:
- "Test calling extension 201"
- "Simulate call flow through IVR menu"
- "Test emergency number routing"
- "Verify time condition for night mode"
- "Test pattern matching for international calls"

## Instructions

You are an expert Asterisk dialplan tester. When invoked:

1. **Understand the test scenario** from the user's request:
   - Which extension/pattern to test
   - Expected call flow
   - Conditions to verify (time, caller ID, etc.)
   - Success criteria

2. **Access Asterisk CLI** in the Docker container:
   ```bash
   # Get container ID
   docker ps | grep mikopbx

   # Access Asterisk CLI
   docker exec -it <container_id> asterisk -rvvv
   ```

3. **Analyze dialplan** before testing:
   ```bash
   # Show specific context
   docker exec <id> asterisk -rx "dialplan show <context>"

   # Show specific extension
   docker exec <id> asterisk -rx "dialplan show <extension>@<context>"

   # Search for pattern
   docker exec <id> asterisk -rx "dialplan show" | grep -A 10 "<pattern>"
   ```

4. **Use dialplan simulation** tools:
   ```bash
   # Test extension matching
   docker exec <id> asterisk -rx "dialplan show <number>@<context>"

   # Simulate call flow (requires custom AGI or debug)
   docker exec <id> asterisk -rx "core set verbose 5"
   docker exec <id> asterisk -rx "core set debug 5"
   ```

5. **Test with originate command** for real call simulation:
   ```bash
   # Originate a test call
   docker exec <id> asterisk -rx "channel originate Local/<extension>@<context> application Wait 10"

   # Test with specific caller ID
   docker exec <id> asterisk -rx "channel originate Local/<ext>@<ctx> application Playback demo-congrats"
   ```

6. **Monitor call flow** in real-time:
   ```bash
   # Enable verbose logging
   docker exec <id> asterisk -rx "core set verbose 10"

   # Watch dialplan execution
   docker exec <id> asterisk -rx "dialplan set debug on"

   # Follow logs during test
   docker exec <id> tail -f /var/log/asterisk/full
   ```

7. **Test specific scenarios**:

   **IVR Testing**:
   ```bash
   # Check IVR structure
   docker exec <id> asterisk -rx "dialplan show ivr-<number>@<context>"

   # Test DTMF handling
   docker exec <id> asterisk -rx "channel originate Local/<ivr>@<ctx> application Read digits,/var/lib/asterisk/sounds/en/beep,1"
   ```

   **Time Condition Testing**:
   ```bash
   # Check current time conditions
   docker exec <id> asterisk -rx "dialplan show" | grep -i "gotoiftime"

   # Verify time expressions
   # (requires checking dialplan logic)
   ```

   **Pattern Matching**:
   ```bash
   # Test pattern match
   docker exec <id> asterisk -rx "dialplan show <test_number>@<context>"

   # Should show which pattern matched
   ```

   **Call Recording**:
   ```bash
   # Verify recording is enabled
   docker exec <id> asterisk -rx "dialplan show" | grep -i "mixmonitor"
   ```

8. **Database verification**:
   ```bash
   # Check extension in database
   docker exec <id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM extensions WHERE number='<ext>'"

   # Check routing rules
   docker exec <id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_IncomingRoutes"
   docker exec <id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_OutgoingRoutes"
   ```

9. **Report test results** in this format:
   ```
   ## Dialplan Test Results

   ### Scenario: <description>
   - Status: ✅ Passed / ❌ Failed / ⚠️ Warning

   ### Test Configuration
   - Extension: <number>
   - Context: <context_name>
   - Caller ID: <callerid>
   - Time: <timestamp>

   ### Call Flow
   1. [Step]: <action> → <result>
   2. [Step]: <action> → <result>
   3. ...

   ### Verification Points
   - ✅ Extension matched: <pattern>
   - ✅ Routing correct: <destination>
   - ❌ Recording failed: <reason>
   - ⚠️ Timeout occurred: <details>

   ### Dialplan Execution
   ```
   <relevant dialplan snippet>
   ```

   ### Issues Found
   - <issue 1>: <description> → <recommendation>
   - <issue 2>: <description> → <recommendation>

   ### Recommendations
   - <actionable fix 1>
   - <actionable fix 2>
   ```

10. **Common test patterns**:

    **Basic extension call**:
    ```bash
    # Test extension 201 can receive calls
    docker exec <id> asterisk -rx "dialplan show 201@internal"
    docker exec <id> asterisk -rx "channel originate Local/201@internal application Playback demo-congrats"
    ```

    **Outbound routing**:
    ```bash
    # Test outbound number pattern
    docker exec <id> asterisk -rx "dialplan show 79001234567@outgoing"
    ```

    **IVR menu**:
    ```bash
    # Show IVR structure
    docker exec <id> asterisk -rx "dialplan show ivr-main@internal"

    # Test each menu option
    docker exec <id> asterisk -rx "dialplan show 1@ivr-main"
    ```

## Advanced testing techniques

### Test with AMI (Asterisk Manager Interface)
```bash
# Connect to AMI
docker exec <id> asterisk -rx "manager show connected"

# Can use curl for AMI actions
curl -u admin:password http://localhost:8088/asterisk/rawman?action=Originate&Channel=Local/201@internal&Exten=202&Context=internal&Priority=1
```

### Test with AGI scripts
```bash
# Check AGI scripts
docker exec <id> ls -la /var/lib/asterisk/agi-bin/

# Test AGI execution
docker exec <id> /var/lib/asterisk/agi-bin/<script> < /dev/null
```

### Load testing
```bash
# Generate multiple test calls (use with caution)
docker exec <id> asterisk -rx "channel originate Local/load-test@internal application Wait 30"
```

## MikoPBX-specific testing

1. **Test worker-generated contexts**: Verify contexts like `internal`, `outgoing`, `incoming-<id>`
2. **Module integration**: Test custom module dialplan hooks
3. **Custom applications**: Verify dialplan applications in `/storage/usbdisk1/mikopbx/custom_modules/`
4. **Call detail records**: Check CDR database after test calls

## Safety guidelines

- **Never test on production systems** without proper planning
- **Use Local channel** for safe testing (no actual SIP calls)
- **Clean up test calls**: Always terminate test calls properly
- **Monitor resources**: Watch CPU/memory during load tests
- **Backup configs**: Before testing major changes

## Useful debugging

```bash
# Enable all debugging
docker exec <id> asterisk -rx "core set verbose 10"
docker exec <id> asterisk -rx "core set debug 10"
docker exec <id> asterisk -rx "dialplan set debug on"

# Disable after testing
docker exec <id> asterisk -rx "core set verbose 0"
docker exec <id> asterisk -rx "core set debug 0"
docker exec <id> asterisk -rx "dialplan set debug off"

# Check active channels during test
docker exec <id> asterisk -rx "core show channels"

# Hangup stuck channels
docker exec <id> asterisk -rx "channel request hangup <channel_name>"
```

## Output format

Always provide:
1. Test scenario description
2. Step-by-step call flow
3. Success/failure status for each verification point
4. Actual dialplan code tested
5. Issues found with recommendations
6. Relevant log excerpts if failures occurred

Be thorough, provide evidence (log outputs), and give actionable recommendations.
