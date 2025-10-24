# MikoPBX Specialized Agents

This directory contains autonomous agent configurations for complex multi-step tasks in MikoPBX development.

## What are Agents?

Agents are specialized, autonomous assistants that can:
- Execute multi-step workflows independently
- Make decisions based on context and results
- Iterate and retry until task completion
- Use multiple tools and skills in combination
- Provide structured reports and documentation

## Available Agents

### 🧪 Testing & Quality Assurance

#### test-fix-loop-agent
**Purpose**: Automated testing with error remediation loop
**Use When**: Need continuous integration with self-healing capabilities

**What it does**:
- Runs Python pytest tests for MikoPBX REST API
- Monitors logs for exceptions and errors during execution
- Automatically fixes detected issues in codebase
- Restarts containers when needed
- Repeats until all tests pass or max iterations reached

**Example Usage**:
```
"Run API tests in fix loop and fix all errors"
"Test and fix API until everything passes"
"Запусти тесты и исправь все найденные ошибки"
```

**Documentation**: [tests/api/README_TEST_FIX_LOOP.md](../../tests/api/README_TEST_FIX_LOOP.md)

---

### 🎨 Code Optimization & Refactoring

#### js-optimizer-mikopbx
**Purpose**: Optimize and refactor JavaScript code
**Use When**: Working with Fomantic UI, ensuring ES6 compliance, transpiling JS

**What it does**:
- Optimizes JavaScript code for MikoPBX admin interface
- Ensures ES6 airbnb code style compliance
- Integrates with Fomantic UI components
- Transpiles JavaScript after modifications

**Example Usage**:
```
"Optimize extension-modify.js"
"Refactor this JavaScript to use modern ES6 patterns"
```

#### php-refactoring-specialist
**Purpose**: Modernize PHP code to PHP 8.3 standards
**Use When**: Need to refactor legacy code or improve code quality

**What it does**:
- Refactors PHP code to modern PHP 8.3 standards
- Optimizes class structures
- Eliminates code duplication
- Improves maintainability

**Example Usage**:
```
"Refactor UserController.php to PHP 8.3"
"Modernize this PHP class and remove duplication"
```

#### security-audit-analyzer
**Purpose**: Comprehensive security analysis
**Use When**: Pre-deployment security validation needed

**What it does**:
- Analyzes JavaScript frontend components
- Audits PHP backend code
- Identifies security vulnerabilities
- Provides remediation recommendations

**Example Usage**:
```
"Audit authentication module for security issues"
"Check payment processing for vulnerabilities"
```

---

### 🌍 Translation Management

#### pbx-translation-expert
**Purpose**: Manage multilingual translations
**Use When**: Adding/updating translations, Russian-first workflow

**What it does**:
- Translates technical PBX/Asterisk text from Russian
- Manages translation files in /src/Common/Messages
- Handles 29 languages
- Cleans up unused translations

**Example Usage**:
```
"Translate this new feature text to all languages"
"Add Russian translation for 'Call Forwarding' feature"
```

---

### 🔌 API Testing

#### rest-api-docker-tester
**Purpose**: Test REST API inside Docker containers
**Use When**: API code changes, need to verify endpoints

**What it does**:
- Executes CURL requests inside Docker containers
- Manages container restarts when API code changes
- Tests with custom ports
- Provides compliance reports

**Example Usage**:
```
"Test authentication endpoint after my changes"
"Check if all user management endpoints work correctly"
```

---

### 🖥️ Web Testing

#### mikopbx-web-tester
**Purpose**: Test MikoPBX web interface
**Use When**: Verifying UI functionality, validating user workflows

**What it does**:
- Tests MikoPBX web interface with Playwright
- Verifies UI elements work correctly
- Validates form submissions and workflows
- Checks navigation flows

**Example Usage**:
```
"Test the extension creation form"
"Verify call history table displays correctly"
```

#### playwright-test-generator
**Purpose**: Create automated browser tests
**Use When**: Need new test coverage for UI workflows

**Example Usage**:
```
"Create a test that logs in and creates an extension"
"Generate test for checkout flow"
```

#### playwright-test-healer
**Purpose**: Debug and fix failing tests
**Use When**: Tests are broken and need repair

**Example Usage**:
```
"Fix the login test that's failing"
"Debug user-registration.spec.ts"
```

#### playwright-test-planner
**Purpose**: Create comprehensive test plans
**Use When**: Need organized test scenarios for web app

**Example Usage**:
```
"Create test plan for checkout process"
"Generate test scenarios for dashboard"
```

---

## How Agents Work

### Automatic Invocation
Claude automatically detects when to use agents based on your request:

```
User: "Run tests and fix errors"
Claude: Recognizes this needs test-fix-loop-agent → Launches it automatically
```

### Explicit Request
You can explicitly request a specific agent:

```
User: "Use the test-fix-loop-agent to validate API changes"
Claude: Launches test-fix-loop-agent with specified task
```

### Parallel Execution
Multiple agents can work together:

```
User: "Test API, then test web interface"
Claude: Launches rest-api-docker-tester, then mikopbx-web-tester
```

## Agent Characteristics

### Autonomy
- Make independent decisions during execution
- Adapt strategy based on results
- Continue until success or explicit stop condition

### Iteration
- Can run in loops (like test-fix-loop-agent)
- Retry with different approaches
- Learn from previous attempts

### Safety
- Built-in iteration limits (prevent infinite loops)
- User interaction when stuck
- Validation of all changes before applying

### Reporting
- Structured progress reports
- Clear success/failure indicators
- Actionable recommendations

## Best Practices

### 1. Be Specific About Goals
```
❌ "Test something"
✅ "Run API tests and fix all authentication errors"
```

### 2. Set Clear Boundaries
```
❌ "Fix everything"
✅ "Fix only critical PHP errors, ignore warnings"
```

### 3. Provide Context
```
❌ "The test is broken"
✅ "Test test_15_extensions_crud.py fails on line 45 with AssertionError"
```

### 4. Review Agent Work
After agent completes, always:
- Check git diff for changes
- Review iteration reports
- Run quality checks (phpstan, eslint)
- Test manually if critical changes

### 5. Document Lessons Learned
If agent fixed interesting issues:
- Add regression tests
- Update documentation
- Share knowledge with team

## Troubleshooting

### Agent Not Launching
**Problem**: Request doesn't trigger agent
**Solution**: Be more explicit: "Use test-fix-loop-agent to run tests"

### Agent Gets Stuck
**Problem**: Agent repeats same action
**Solution**: Agent will ask for guidance after 3 attempts - respond to the prompt

### Agent Makes Wrong Changes
**Problem**: Fix doesn't solve the issue
**Solution**: Use git to review and revert: `git diff` → `git checkout file.php`

### Agent Stops Prematurely
**Problem**: Agent exits before completing
**Solution**: Check iteration reports for stop reason, may need manual intervention

## Development

### Creating New Agents

To create a new agent:

1. Create markdown file: `.claude/agents/my-agent.md`
2. Define frontmatter with name, description, examples
3. Write detailed instructions for agent behavior
4. Test with various scenarios
5. Document in this README

### Agent Template Structure

```markdown
---
name: my-agent
description: What this agent does and when to use it
model: sonet
color: blue
---

[Detailed instructions for agent behavior]
[Workflows, best practices, output formats]
[Safety measures and constraints]
```

## Support

For agent-related issues:

1. Check agent's detailed documentation (linked above)
2. Review recent iteration reports
3. Check `.claude/agents/` for agent configuration
4. Ask Claude to diagnose: "Why did test-fix-loop-agent stop?"

## Quick Reference

| Agent | Trigger Keywords | Output |
|-------|------------------|--------|
| test-fix-loop-agent | "test and fix", "fix loop", "run tests until pass" | Test reports, fix documentation |
| js-optimizer-mikopbx | "optimize js", "refactor javascript", "transpile" | Optimized JS code |
| php-refactoring-specialist | "refactor php", "modernize", "php 8.3" | Refactored PHP code |
| security-audit-analyzer | "security audit", "vulnerabilities", "check security" | Security report |
| pbx-translation-expert | "translate", "add translation", "language" | Translation files |
| rest-api-docker-tester | "test api", "curl request", "check endpoint" | API test report |
| mikopbx-web-tester | "test ui", "test form", "check web interface" | UI test report |

---

**Remember**: Agents are powerful autonomous assistants - use them wisely, review their work, and they'll significantly accelerate your development workflow! 🚀
