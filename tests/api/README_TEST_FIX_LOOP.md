# Test-Fix-Loop Agent Usage Guide

## Overview

The **test-fix-loop-agent** is an automated testing and error remediation agent that:
- Runs MikoPBX REST API tests in a continuous loop
- Monitors logs for exceptions and errors during test execution
- Automatically fixes detected issues in the codebase
- Restarts containers when needed
- Re-runs tests until all pass or maximum iterations reached

## When to Use

Use this agent when you need:
- **Regression testing** after code changes
- **Automated debugging** of test failures
- **Continuous integration** with self-healing capabilities
- **Post-deployment validation** with automatic fixes
- **Refactoring verification** with error correction

## How to Invoke the Agent

### Option 1: Through Claude Code (Recommended)

Simply ask Claude to run the agent:

```
"Запусти тесты API и исправь все найденные ошибки"
"Run API tests and fix all errors found"
"Протестируй API в цикле и автоматически исправь проблемы"
```

Claude will automatically launch the test-fix-loop-agent using the Task tool.

### Option 2: Manual Task Tool Usage

```python
# In Claude Code conversation
Task(
    subagent_type="test-fix-loop-agent",
    description="Test and fix API",
    prompt="Run all MikoPBX API tests, analyze logs for errors, fix issues, and repeat until all tests pass. Maximum 10 iterations."
)
```

## What the Agent Does

### Iteration Workflow

Each iteration follows this process:

```
1. Pre-Test Setup
   ├── Verify Docker container running
   ├── Check worker processes healthy
   └── Clear previous test artifacts

2. Execute Tests
   ├── Run pytest with appropriate filters
   ├── Capture stdout, stderr, exit code
   └── Save test report

3. Analyze Results
   ├── Check test exit code
   ├── Parse pytest output for failures
   └── Extract error messages and tracebacks

4. Log Investigation
   ├── Check /storage/usbdisk1/mikopbx/log/system/messages
   ├── Check /storage/usbdisk1/mikopbx/log/php/error.log
   ├── Look for exceptions, fatal errors, warnings
   └── Correlate log entries with failed tests

5. Error Classification
   ├── PHP Syntax/Fatal errors (HIGH priority)
   ├── Database constraint violations (MEDIUM)
   ├── API validation errors (MEDIUM)
   └── Warnings and notices (LOW)

6. Fix Implementation
   IF errors found:
     ├── Determine root cause from logs and code
     ├── Implement fix in codebase
     ├── Run syntax checks (php -l)
     ├── Restart container if backend changed
     ├── Document fix in iteration report
     └── GOTO step 1 (next iteration)
   ELSE:
     └── All tests passed → EXIT with success report

7. Safety Checks
   ├── Maximum 10 iterations limit
   ├── Same error 3 times → Ask user
   └── Critical system error → STOP and alert
```

## Test Runner Helper

The agent uses `tests/api/helpers/test_runner.py` for test execution and log analysis.

### Safe Test Execution (Recommended)

⚠️ **IMPORTANT:** Some tests modify network settings (firewall, routes, DNS) and may break connectivity to the container.

Use the safe test runner to exclude dangerous tests:

```bash
cd tests/api

# Run all SAFE tests (excludes dangerous_network marker)
./run-safe-tests.sh

# Run specific safe tests
./run-safe-tests.sh test_15_extensions_crud.py

# Run dangerous tests ONLY (with confirmation prompt)
./run-dangerous-tests.sh

# Force dangerous tests (skip confirmation)
./run-dangerous-tests.sh --force
```

See [DANGEROUS_NETWORK_TESTS.md](DANGEROUS_NETWORK_TESTS.md) for details.

### Direct Usage (Optional)

You can also use the helper script directly:

```bash
cd tests/api

# Run all tests (includes dangerous ones!)
python3 helpers/test_runner.py

# Run SAFE tests only
python3 -m pytest -v -m "not dangerous_network"

# Run specific tests
python3 helpers/test_runner.py -k auth

# Only check logs for errors
python3 helpers/test_runner.py --check-logs

# Only check worker status
python3 helpers/test_runner.py --check-workers

# Restart container
python3 helpers/test_runner.py --restart

# Check more log lines
python3 helpers/test_runner.py --check-logs --lines 1000
```

### Python API

```python
from helpers.test_runner import TestRunner

runner = TestRunner(container_name='mikopbx_php83')

# Run tests
result = runner.run_tests(
    test_path='test_15_extensions_crud.py',
    pytest_args=['-v'],
    verbose=True
)

# Get recent errors
errors = runner.get_recent_errors(lines=500)

# Check workers
workers = runner.check_workers()

# Restart container
success = runner.restart_container()
```

## Example Scenarios

### Scenario 1: PHP Syntax Error

```
Iteration 1:
  Test fails → Check PHP log → Fatal error syntax
  → Read file → Fix syntax → Verify php -l
  → Restart container → Re-run test

Iteration 2:
  All tests pass → SUCCESS
```

**Agent Output:**
```
═══════════════════════════════════════════════════════════
🔄 TEST-FIX-LOOP ITERATION #1
═══════════════════════════════════════════════════════════

📊 TEST EXECUTION
  Exit Code: 1
  Failed: 1

🔍 LOG ANALYSIS
  PHP Errors: 1

🐛 ERRORS DETECTED
  [CRITICAL] PHP Parse Error
    Location: src/PBXCoreREST/Controllers/ExtensionsController.php:123
    Message: syntax error, unexpected '}'

🔧 FIXES APPLIED
  1. Fixed syntax error - removed extra closing brace
     File: src/PBXCoreREST/Controllers/ExtensionsController.php:123
     Verified: ✅ Syntax OK

🔄 ACTIONS TAKEN
  ✅ Container restarted

═══════════════════════════════════════════════════════════
🔄 TEST-FIX-LOOP ITERATION #2
═══════════════════════════════════════════════════════════

📊 TEST EXECUTION
  Exit Code: 0
  Passed: 50

✅ All tests passed!

═══════════════════════════════════════════════════════════
✅ TEST-FIX-LOOP COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════
```

### Scenario 2: Database Constraint Violation

```
Iteration 1:
  Test fails → Check logs → UNIQUE constraint failed
  → Analyze code → Add duplicate check
  → Restart container → Re-run test

Iteration 2:
  All tests pass → SUCCESS
```

### Scenario 3: Worker Crash

```
Iteration 1:
  Test hangs → Check workers → Only 1 instance running
  → Check system log → Fatal error in worker
  → Fix error → Restart container → Workers OK

Iteration 2:
  Re-run test → SUCCESS
```

## Safety Features

### Iteration Limits
- **Maximum 10 iterations** - prevents infinite loops
- **Repeated error detection** - if same error appears 3 times, agent asks for user guidance
- **Critical error halt** - system corruption detected → STOP immediately

### User Interaction

If the agent gets stuck, it will ask:

```
⚠️  ITERATION STUCK - USER INPUT NEEDED

Issue: Same error repeating after 3 fix attempts
Error: UNIQUE constraint failed: Extensions.number

Attempted Fixes:
  1. Added duplicate check in controller
  2. Updated validation logic
  3. Fixed test data

Options:
1. Continue with alternative fix approach
2. Skip this test and continue with others
3. Stop and provide detailed diagnosis
4. Manual intervention required

Please advise how to proceed.
```

## Configuration

### Environment Variables

```bash
# MikoPBX connection (used by tests)
export MIKOPBX_API_URL=http://mikopbx_php83.localhost:8081/pbxcore/api/v3
export MIKOPBX_LOGIN=admin
export MIKOPBX_PASSWORD=123456789MikoPBX#1

# Container name (if different from default)
export MIKOPBX_CONTAINER=mikopbx_php83

# Enable/disable features
export ENABLE_SYSTEM_RESET=0  # Don't reset system during tests
export ENABLE_CDR_SEED=1      # Seed CDR data for tests
```

### Agent Parameters

You can customize agent behavior in the prompt:

```
"Run API tests with maximum 5 iterations, only fix critical errors"
"Test only authentication endpoints and fix issues"
"Run tests without container restarts, just report errors"
```

## Integration with Other Skills

The agent automatically uses these skills:

- **container-inspector** - Get container ID, restart containers, verify workers
- **log-analyzer** - Detailed log investigation, pattern recognition
- **api-client** - Manual API testing if needed
- **php-style** - Validate PHP code quality (optional)

## Best Practices

### 1. Start with Clean State
```bash
# Ensure container is healthy before starting
docker ps | grep mikopbx
docker exec <container> ps aux | grep Worker
```

### 2. Run Specific Test Subsets First
```
"Run authentication tests in fix loop"  # Test smaller subset first
"Run CRUD tests in fix loop"            # Then expand coverage
```

### 3. Review Fixes After Completion
The agent documents all fixes - review them for code quality:
```bash
# Check git diff for all changes
git diff

# Run phpstan for quality check
php -d memory_limit=1G vendor/bin/phpstan analyse
```

### 4. Add Regression Tests
After fixes are applied, consider adding tests to prevent regression:
```python
# tests/api/test_XX_regression.py
def test_extension_duplicate_prevention(api_client):
    """Regression test for issue fixed by test-fix-loop-agent iteration 1"""
    # Test that duplicate extension creation fails gracefully
```

## Troubleshooting

### Agent Not Finding Container
```
⚠️  Container 'mikopbx_php83' not found
```
**Solution:** Check container name or set MIKOPBX_CONTAINER env var

### Tests Keep Failing Same Way
```
⚠️  ITERATION STUCK - Same error after 3 attempts
```
**Solution:** Review the error - may need manual intervention or test data fix

### Container Restart Fails
```
❌ Failed to restart container
```
**Solution:** Check Docker daemon, container status, system resources

### Permission Denied on Log Files
```
⚠️  Failed to read log /storage/usbdisk1/mikopbx/log/system/messages
```
**Solution:** Verify docker exec permissions, container user

## Output Interpretation

### Success Report
```
✅ TEST-FIX-LOOP COMPLETED SUCCESSFULLY

📊 SUMMARY
  Total Iterations: 3
  Total Fixes Applied: 4
  Final Test Results: 50 passed, 0 failed
```
**Meaning:** All tests passing, fixes were successful

### Partial Success
```
⚠️  ITERATION LIMIT REACHED

📊 SUMMARY
  Total Iterations: 10 (max)
  Remaining Failures: 2
```
**Meaning:** Some tests still failing after 10 iterations - manual review needed

### Critical Error
```
❌ CRITICAL ERROR - STOPPING

Error: Database corruption detected
```
**Meaning:** System-level issue requires manual intervention

## Advanced Usage

### Custom Test Selection
```python
Task(
    subagent_type="test-fix-loop-agent",
    prompt="""
    Run only these test files in fix loop:
    - test_15_extensions_crud.py
    - test_18_sip_providers.py

    Fix only critical errors (PHP fatal, exceptions).
    Ignore warnings and notices.
    Maximum 5 iterations.
    """
)
```

### Read-Only Mode (Diagnostics Only)
```python
Task(
    subagent_type="test-fix-loop-agent",
    prompt="""
    Run all API tests once.
    Analyze logs and report errors.
    DO NOT fix any issues.
    Provide diagnostic report only.
    """
)
```

### Focus on Specific Error Types
```python
Task(
    subagent_type="test-fix-loop-agent",
    prompt="""
    Run API tests in fix loop.
    Only fix database constraint violations.
    Ignore other error types for now.
    """
)
```

## Files Modified by Agent

The agent may modify:
- `src/PBXCoreREST/**/*.php` - API controllers, services, validators
- `src/Common/Models/*.php` - Database models
- `src/Core/**/*.php` - Core functionality
- Test fixtures (if test data issues found)

Always review changes with:
```bash
git status
git diff
```

## Success Criteria

The loop exits successfully when:
- ✅ All tests pass (exit code 0)
- ✅ No errors in logs during test execution
- ✅ No exceptions or fatal errors
- ✅ All workers running normally (WorkerApiCommands: 3 instances)
- ✅ Container healthy

## Support

If you encounter issues:

1. Check agent logs for error details
2. Review iteration reports for fix history
3. Manually verify container and worker status
4. Check system logs for critical errors
5. Ask Claude to provide detailed diagnostic report

Example diagnostic request:
```
"The test-fix-loop-agent stopped at iteration 5.
 Can you analyze what went wrong and provide recommendations?"
```

---

## Quick Reference Card

```bash
# Invoke agent via Claude
"Run API tests in fix loop"

# Check worker status
python3 helpers/test_runner.py --check-workers

# Check logs for errors
python3 helpers/test_runner.py --check-logs

# Restart container
python3 helpers/test_runner.py --restart

# Manual test run
python3 helpers/test_runner.py -k auth

# Review agent changes
git diff
```

**Remember:** The agent is autonomous but safe - it validates all changes, limits iterations, and asks for help when stuck. Trust the process, but always review the fixes! 🚀
