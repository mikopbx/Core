# MikoPBX Claude Code Skills

This directory contains specialized skills for Claude Code to assist with MikoPBX development, testing, and maintenance.

## Available Skills

### 🔍 mikopbx-code-search
**Purpose**: Advanced code search using ast-grep (syntax-aware) and semantic patterns

**Use when**: Searching for specific code patterns, functions, classes, or understanding codebase structure

**Key features**:
- Syntax-aware search with ast-grep
- Pattern matching for PHP/JavaScript
- Related code discovery
- Context-aware results

---

### 🔨 mikopbx-babel-compile
**Purpose**: Transpile ES6+ JavaScript to ES5 for browser compatibility

**Use when**: After modifying JavaScript source files in `sites/admin-cabinet/assets/js/src/`

**Key features**:
- Automatic Docker-based transpilation
- Core Admin Cabinet files support
- Module/Extension files support
- Airbnb preset configuration

---

### 🧪 mikopbx-api-test-generator
**Purpose**: Generate comprehensive pytest tests for REST API endpoints

**Use when**:
- Creating new API endpoints
- Adding test coverage for existing endpoints
- Need CRUD test suites

**Key features**:
- Analyzes DataStructure.php definitions
- Generates complete pytest test files
- Includes positive, negative, and edge case tests
- Schema validation tests
- Proper fixtures and authentication

**Output**: Complete, runnable pytest test file in `tests/api/`

---

### 📝 mikopbx-commit-message
**Purpose**: Generate concise, professional commit messages without fluff

**Use when**:
- User says "commit my changes"
- After completing a feature or fix
- User asks "create a commit message"

**Key features**:
- Analyzes git diff to understand changes
- Generates 2-4 sentence messages
- Focuses on WHAT and WHY, not HOW
- Uses conventional commit format (feat/fix/refactor/etc.)
- NO Claude Code attribution
- Clear English without corporate jargon

**Output**: Ready-to-use commit message in format: `<type>: <summary>\n\n<2-4 sentences>`

---

### 📊 mikopbx-log-analyzer
**Purpose**: Efficiently analyze logs inside Docker container to diagnose issues and monitor system

**Use when**:
- User reports an error or issue
- Need to diagnose API/database problems
- After tests fail (find root cause)
- User asks "check logs" or "what's wrong?"
- Tracking worker process behavior
- Investigating performance issues

**Key features**:
- Intelligent log file selection based on issue type
- Filters noise to show only relevant entries
- Correlates logs across multiple files
- Tracks process status and health
- Provides structured analysis with actionable insights
- Supports real-time monitoring

**Output**: Structured log analysis report with errors, warnings, process status, and recommendations

---

### 🌍 mikopbx-translation-manager
**Purpose**: Manage multilingual translations for MikoPBX across 29 supported languages

**Use when**:
- Adding new translation keys for features
- Translating Russian keys to all languages
- Checking translation consistency
- Creating new translation files for modules
- Removing obsolete translations

**Key features**:
- Russian-first workflow (ru/*.php is primary)
- AI-assisted translation to 28 languages
- Consistency validation across all languages
- Technical term preservation (SIP, NAT, AMI, etc.)
- Smart localization (phone numbers, examples)
- Placeholder format enforcement (%variable%)
- Batch translation support

**Important rules**:
- Developers ONLY edit Russian translations
- Other languages sync via Weblate or AI
- Technical terms never translate
- All languages must match structure exactly

**Output**: Consistent multilingual translation files with validation report

---

### 📖 mikopbx-openapi-analyzer
**Purpose**: Extract and analyze OpenAPI 3.1.0 specification from MikoPBX (helper skill)

**Use when**:
- Other skills need OpenAPI data (endpoint-validator, api-test-generator)
- User asks to "check OpenAPI spec"
- Validating API compliance with OpenAPI standard

**Key features**:
- Fetches live OpenAPI spec (259 endpoints, 96 schemas, 9MB JSON)
- Extracts endpoint details (parameters, request/response schemas)
- Compares OpenAPI spec with actual code
- Generates test data from schema examples
- Validates OpenAPI standard compliance
- Python API for complex analysis
- CLI interface for quick queries

**Output**: Endpoint details, compliance reports, test data, schema documentation

---

### ☎️ asterisk-config-validator
**Purpose**: Validate Asterisk configuration files and analyze logs for correctness

**Use when**:
- After generating Asterisk configs via workers
- Debugging Asterisk startup or runtime issues
- Verifying configuration changes made by system methods
- Analyzing Asterisk logs for errors or warnings
- Checking if configurations follow best practices

**Key features**:
- Validates syntax of Asterisk configs (sip.conf, pjsip.conf, extensions.conf, etc.)
- Checks for common configuration errors and warnings
- Analyzes Asterisk logs for errors, warnings, and potential issues
- Verifies MikoPBX generation patterns
- Reports configuration inconsistencies and security issues
- Tests configuration loading via Asterisk CLI
- Provides actionable fixes with line numbers

**Output**: Structured validation report with status, issues, locations, and recommendations

---

### 📞 asterisk-dialplan-tester
**Purpose**: Test Asterisk dialplan scenarios and call flows

**Use when**:
- Creating or modifying dialplan scenarios
- Testing call routing logic
- Verifying IVR menu flows
- Debugging call issues
- Testing time-based routing
- Validating custom dialplan applications

**Key features**:
- Tests dialplan contexts and extensions
- Simulates call flows through dialplan
- Verifies routing logic and conditions
- Tests IVR menus and time conditions
- Validates AGI/AMI integrations
- Checks pattern matching and regular expressions
- Monitors real-time call flow execution
- Safe testing using Local channels (no actual SIP calls)

**Output**: Detailed test report with call flow steps, verification points, dialplan execution, and recommendations

---

### 🔄 mikopbx-docker-restart-tester
**Purpose**: Automatically restart Docker container and run tests after code changes

**Use when**:
- After modifying PHP code in `src/`
- Before running any API tests
- User says "test my changes"
- After making configuration changes

**Key features**:
- Detects files that require restart
- Safely restarts container with proper wait times
- Enables SCHEMA_VALIDATION_STRICT mode
- Waits for all services (PHP-FPM, Asterisk, Redis)
- Runs appropriate test suites
- Monitors logs during testing
- Detailed result reporting

**Critical understanding**: PHP code changes require container restart to take effect!

---

### ✅ mikopbx-endpoint-validator
**Purpose**: Validate REST API endpoints for OpenAPI schema compliance and parameter consistency

**Use when**:
- After implementing/modifying API endpoints
- Before merging API-related PRs
- User asks "validate my API changes"
- After changing DataStructure.php files

**Key features**:
- Validates OpenAPI schema compliance
- Checks parameter consistency (DataStructure ↔ SaveRecordAction)
- Detects common anti-patterns (defaults on PATCH, etc.)
- Tests with SCHEMA_VALIDATION_STRICT mode
- Generates detailed compliance reports with scores
- Provides actionable fixes with line numbers
- Suggests additional tests

**Output**: Comprehensive validation report with compliance score, issues, and fixes

---

## Skill Workflow Examples

### Example 1: Creating and Testing a New API Endpoint

```
User: "I want to create a new API endpoint for managing call queues"

Claude:
1. 🔍 Uses mikopbx-code-search to find similar endpoints (Extensions, Providers)
2. 📝 Guides user through creating DataStructure.php and SaveRecordAction.php
3. ✅ Uses mikopbx-endpoint-validator to check compliance
4. 🧪 Uses mikopbx-api-test-generator to create test suite
5. 🔄 Uses mikopbx-docker-restart-tester to restart container and run tests
6. ✅ Re-validates with mikopbx-endpoint-validator after fixes
```

### Example 2: Fixing a Bug in Existing Endpoint

```
User: "The Extensions API is applying defaults on PATCH requests"

Claude:
1. 🔍 Uses mikopbx-code-search to find Extensions/SaveRecordAction.php
2. ✅ Uses mikopbx-endpoint-validator to identify the issue
3. 📝 Fixes the code (adds HTTP method check for defaults)
4. 🔄 Uses mikopbx-docker-restart-tester to restart and test
5. ✅ Uses mikopbx-endpoint-validator to confirm fix
6. 🧪 Uses mikopbx-api-test-generator to add regression test
7. 📝 Uses mikopbx-commit-message to create commit message
```

### Example 3: Frontend JavaScript Changes

```
User: "I modified extension-modify.js to add new validation"

Claude:
1. 🔨 Uses mikopbx-babel-compile to transpile the JS file
2. 🔄 Does NOT restart container (JS doesn't require it)
3. 📝 Advises user to refresh browser to see changes
```

### Example 4: PHP Code Changes

```
User: "I added a new method to EmployeesAPI.php"

Claude:
1. 🔍 Uses mikopbx-code-search to verify the changes
2. ✅ Uses mikopbx-endpoint-validator to check consistency
3. 🔄 MUST use mikopbx-docker-restart-tester before testing
4. 🧪 Uses mikopbx-api-test-generator to create tests
5. 🔄 Runs tests automatically after restart
6. 📝 Uses mikopbx-commit-message to prepare commit
```

### Example 5: Completing a Feature

```
User: "I finished implementing the CSV import feature. Commit it."

Claude:
1. 📝 Uses mikopbx-commit-message to analyze changes
2. Shows commit message: "feat: add CSV batch import for employees"
3. User approves
4. Executes git commit (NO Claude attribution)
```

### Example 6: Diagnosing Test Failures

```
User: "The Extensions API tests are failing. What's wrong?"

Claude:
1. 📊 Uses mikopbx-log-analyzer to check recent logs
2. Finds: "PHP Fatal Error in SaveRecordAction.php:87 - Undefined variable"
3. Finds: "WorkerApiCommands[1637] process terminated unexpectedly"
4. 🔍 Uses mikopbx-code-search to locate SaveRecordAction.php:87
5. 📝 Fixes the undefined variable
6. 🔄 Uses mikopbx-docker-restart-tester to restart and retest
7. 📊 Uses mikopbx-log-analyzer to confirm no errors
8. ✅ Tests pass!
```

### Example 7: Adding New Feature Translations

```
User: "I'm adding a new Firewall feature. Need translations for 10 labels and 5 error messages."

Claude:
1. 🌍 Uses mikopbx-translation-manager
2. Asks: "Should I create a new Firewall.php file or add to existing?"
3. User: "Create new file with prefix 'fw_'"
4. Creates ru/Firewall.php with 15 keys in Russian
5. User: "Translate to all languages"
6. 🌍 AI translates to 28 languages (preserving SIP, NAT, etc.)
7. 🌍 Validates consistency across all 29 languages
8. Reports: "✅ All 29 languages ready, 15 keys each"
```

### Example 8: Fixing Translation Inconsistencies

```
User: "Some languages are missing new API Keys translations"

Claude:
1. 🌍 Uses mikopbx-translation-manager to check consistency
2. Finds: Thai missing 3 keys, Japanese has 2 extra old keys
3. Reports detailed discrepancies
4. User: "Fix it"
5. 🌍 Translates missing keys to Thai
6. 🌍 Removes obsolete keys from Japanese
7. ✅ All 29 languages now consistent (157 keys each)
```

### Example 9: Validating Asterisk Configuration

```
User: "Asterisk won't start after I regenerated configs. What's wrong?"

Claude:
1. ☎️ Uses asterisk-config-validator to analyze configs
2. Checks recent config generation logs in system messages
3. Validates syntax of all configs (/etc/asterisk/)
4. Finds: extensions.conf has syntax error at line 237 (missing semicolon)
5. Finds: pjsip.conf has weak transport security (encryption=no)
6. Reports: "❌ 1 critical error, ⚠️ 2 warnings"
7. Provides actionable fixes:
   - Add semicolon at extensions.conf:237
   - Enable TLS in pjsip.conf transport section
8. User: "Fix it"
9. 🔍 Uses mikopbx-code-search to find config generator
10. Fixes the generator code
11. 🔄 Uses mikopbx-docker-restart-tester to regenerate and test
12. ☎️ Re-validates with asterisk-config-validator
13. ✅ All configs valid, Asterisk starts successfully
```

### Example 10: Testing Dialplan Call Flow

```
User: "Test if extension 201 can call out to number 79001234567"

Claude:
1. 📞 Uses asterisk-dialplan-tester
2. Analyzes dialplan for extension 201 in internal context
3. Checks outbound routing patterns for 7900XXXXXXX
4. Simulates call flow:
   Step 1: 201@internal → Match found ✅
   Step 2: Dial(PJSIP/201) → Extension ready ✅
   Step 3: Dial 79001234567 → Routes to outgoing context ✅
   Step 4: Pattern _7900XXXXXXX matched → Route to provider-123 ✅
   Step 5: Dial(PJSIP/79001234567@provider-123) ✅
5. Tests with originate command (safe, no actual call)
6. Reports: "✅ Call flow complete, all steps verified"
7. Shows actual dialplan code tested
8. Recommendations:
   - Consider adding call recording (currently disabled)
   - Verify provider-123 has sufficient balance
```

### Example 11: Debugging SIP Registration Issues

```
User: "Provider 'Office-SIP' won't register. Check what's wrong."

Claude:
1. ☎️ Uses asterisk-config-validator to check logs
2. Searches Asterisk logs for registration attempts
3. Finds: "Registration failed: 403 Forbidden"
4. Checks pjsip.conf for Office-SIP endpoint
5. Finds: Password mismatch in auth section
6. Checks database: sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Sip WHERE provider='Office-SIP'"
7. Reports: "Config password doesn't match DB password"
8. 🔍 Uses mikopbx-code-search to find SipConf generator
9. Identifies issue in worker generation logic
10. Fixes the code
11. 🔄 Uses mikopbx-docker-restart-tester to restart and regenerate
12. ☎️ Re-validates with asterisk-config-validator
13. Monitors logs: "Registration successful: 200 OK"
14. ✅ Provider registered successfully
```

### Example 12: Testing Complex IVR Menu

```
User: "Test the main IVR menu with all DTMF options"

Claude:
1. 📞 Uses asterisk-dialplan-tester
2. Analyzes IVR dialplan structure (ivr-main@internal)
3. Lists all menu options:
   - Press 1: Sales (extension 201)
   - Press 2: Support (extension 202)
   - Press 3: Hours & Location (Playback)
   - Press 0: Operator (extension 200)
   - Invalid/Timeout: Repeat menu (3 times max)
4. Tests each option separately:
   Test 1: DTMF '1' → Routes to 201 ✅
   Test 2: DTMF '2' → Routes to 202 ✅
   Test 3: DTMF '3' → Playback(hours-message) ✅
   Test 4: DTMF '0' → Routes to 200 ✅
   Test 5: Invalid DTMF → Repeats menu ✅
   Test 6: Timeout → Repeats menu ✅
   Test 7: 3 failures → Hangs up ✅
5. Verifies recordings exist for all prompts
6. Shows actual dialplan code for each branch
7. Reports: "✅ All IVR paths tested successfully"
8. Recommendations:
   - Add background music for prompt 3
   - Consider reducing timeout from 10s to 7s
```

---

## Important Rules for Skills

### When Container Restart is Required ⚠️

Container restart is **REQUIRED** when:
- ✅ Any PHP file in `src/` is modified
- ✅ Configuration files changed
- ✅ Phalcon templates modified
- ✅ System scripts changed

Container restart is **NOT required** when:
- ❌ JavaScript files modified (after transpilation)
- ❌ CSS files changed
- ❌ Documentation updated
- ❌ Test files modified

### Schema Validation Mode

For accurate API testing, **SCHEMA_VALIDATION_STRICT=1** must be set in docker-compose.yml:

```yaml
environment:
  - SCHEMA_VALIDATION_STRICT=1
```

This enables:
- Automatic request/response schema validation
- OpenAPI compliance checking
- Detailed validation error messages

### Skill Activation Patterns

Skills should activate automatically when:

1. **mikopbx-code-search**:
   - User asks "where is..." or "find..."
   - User asks "how does X work?"
   - Need to understand code structure

2. **mikopbx-babel-compile**:
   - After JS file modifications in `src/`
   - User modifies files in `sites/admin-cabinet/assets/js/src/`

3. **mikopbx-api-test-generator**:
   - User says "generate tests for..."
   - User asks "how do I test this endpoint?"
   - New endpoint created without tests

4. **mikopbx-log-analyzer**:
   - User reports an error
   - Tests fail (need to find cause)
   - User asks "check logs" or "what's wrong?"
   - After container restart (monitor startup)
   - Investigating performance issues

5. **mikopbx-docker-restart-tester**:
   - After PHP code changes
   - User says "test this" or "run tests"
   - Before running any API tests
   - User asks "does it work?"

6. **mikopbx-endpoint-validator**:
   - After API endpoint changes
   - User asks "is this correct?" about API
   - User says "validate my endpoint"
   - Before PR submission

7. **mikopbx-commit-message**:
   - User says "commit" or "create commit"
   - User asks "what should the commit message be?"
   - After completing a feature/fix
   - Before git commit execution

8. **mikopbx-translation-manager**:
   - User says "add translation" or "create translation"
   - User asks "translate to all languages"
   - User says "check translation consistency"
   - User mentions working with Messages/*.php files
   - Creating new UI features that need localization
   - User reports "translation not showing"

9. **asterisk-config-validator**:
   - After Asterisk config generation
   - User reports Asterisk startup issues
   - User asks "validate asterisk config"
   - User says "check asterisk logs"
   - After modifying Asterisk config generators
   - Debugging call routing or SIP registration problems

10. **asterisk-dialplan-tester**:
    - User says "test extension" or "test call flow"
    - User asks "simulate a call"
    - User says "test IVR menu"
    - After modifying dialplan generation
    - Debugging call routing issues
    - Verifying time conditions or pattern matching

---

## Skill Dependencies

```
Development Flow:
─────────────────
mikopbx-code-search
    ↓
  (find code)
    ↓
mikopbx-endpoint-validator
    ↓
  (validate structure)
    ↓
mikopbx-api-test-generator
    ↓
  (create tests)
    ↓
mikopbx-docker-restart-tester
    ↓
  (restart & run tests)
    ├─ SUCCESS → mikopbx-commit-message (create commit)
    └─ FAILURE → mikopbx-log-analyzer (diagnose)
                     ↓
                  (fix issues)
                     ↓
            mikopbx-docker-restart-tester
                     ↓
              (retest & commit)
```

---

## Configuration

### Docker Container
- Default container pattern: `mikopbx/mikopbx`
- Default URL: `https://mikopbx_php83.localhost:8445`
- Default credentials:
  - Username: `admin`
  - Password: `123456789MikoPBX#1`

### Test Environment
- pytest for API testing
- Playwright (via MCP) for UI testing
- Schema validation via SCHEMA_VALIDATION_STRICT

### Important Paths
- Source code: `/Users/nb/PhpstormProjects/mikopbx/Core/src/`
- Tests: `/Users/nb/PhpstormProjects/mikopbx/Core/tests/`
- JS source: `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/`
- JS transpiled: `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/pbx/`
- Container logs: `/storage/usbdisk1/mikopbx/log/`
- Container DB: `/cf/conf/mikopbx.db`

---

## Best Practices

1. **Always validate before testing**: Use validator to catch issues early
2. **Always restart after PHP changes**: Container restart is mandatory
3. **Enable schema validation**: Set SCHEMA_VALIDATION_STRICT=1
4. **Generate tests for new endpoints**: Don't skip test coverage
5. **Check logs after tests**: Errors often appear in logs first
6. **Use appropriate skill**: Don't use restart skill for JS-only changes
7. **Wait for services**: Don't rush testing, wait for all services ready

---

## Troubleshooting

### "Tests fail after code changes"
→ Did you restart the container? Use mikopbx-docker-restart-tester

### "Schema validation not working"
→ Check SCHEMA_VALIDATION_STRICT=1 in docker-compose.yml

### "Container won't restart"
→ Check docker logs: `docker logs <container_id>`

### "Services timeout on startup"
→ Increase timeout values in restart script

### "Tests pass but code doesn't work"
→ Check if tests actually cover the edge cases (validate with endpoint-validator)

---

## Version History

- **2025-10-20**: Added asterisk-config-validator, asterisk-dialplan-tester for Asterisk testing and validation
- **2024-01-15**: Added mikopbx-api-test-generator, mikopbx-docker-restart-tester, mikopbx-endpoint-validator
- **2024-01-10**: Added mikopbx-babel-compile, mikopbx-code-search

---

## Support

For issues with skills:
1. Check this README for usage patterns
2. Review individual skill documentation
3. Check Docker container status and logs
4. Verify environment variables (SCHEMA_VALIDATION_STRICT)
5. Report issues at: https://github.com/mikopbx/Core/issues

---

Created with ❤️ for MikoPBX development team
