# Good Commit Message Examples

This file contains examples of well-written commit messages that follow MikoPBX standards.

## Example 1: Bug Fix

```
fix: prevent PATCH requests from applying default values

PATCH should only update provided fields, leaving others unchanged.
Previous implementation incorrectly applied defaults from DataStructure
to all missing fields, overwriting existing data.
```

**Why this is good:**
- Clearly states what was fixed
- Explains the bug's impact
- Concise, no fluff
- Uses imperative mood
- Focuses on WHAT and WHY

---

## Example 2: New Feature

```
feat: add batch employee creation via CSV import

Enables bulk employee upload through REST API endpoint.
Validates CSV structure, creates records in transaction,
reports errors for invalid entries.
```

**Why this is good:**
- States what feature was added
- Mentions key capabilities
- Clear and direct
- Lists important behaviors

---

## Example 3: Refactoring

```
refactor: migrate Extensions to Single Source of Truth pattern

Consolidates parameter definitions in DataStructure.getParameterDefinitions().
Replaces legacy ParameterSanitizationExtractor with modern validation pipeline.
Fixes defaults no longer applied on PATCH.
```

**Why this is good:**
- Explains what pattern was applied
- Notes specific improvements
- Mentions bug fix included
- Shows architecture change

---

## Example 4: Performance Optimization

```
perf: optimize provider status checks with Redis caching

Status queries now hit Redis before database, reducing response time
from ~200ms to ~5ms for cached entries. Cache expires after 60 seconds.
```

**Why this is good:**
- States what was optimized
- Provides concrete metrics (200ms → 5ms)
- Mentions cache strategy
- Quantifiable improvement

---

## Example 5: Test Addition

```
test: add regression tests for PATCH defaults bug

Verifies partial updates don't overwrite existing fields with defaults.
Tests cover Extensions, Providers, and IncomingRoutes endpoints.
```

**Why this is good:**
- Clear about what's tested
- Mentions bug context
- Lists coverage scope
- Purpose-driven

---

## Example 6: API Endpoint Creation

```
feat: add AsteriskManagers CRUD endpoints

Implements REST API for AMI user management with full CRUD operations.
Validates permissions (call, cdr, originate, reporting) and network filters.
Returns standardized responses matching DataStructure schema.
```

**Why this is good:**
- Clear feature scope (CRUD)
- Lists key validations
- Mentions schema compliance
- Comprehensive but concise

---

## Example 7: Schema Migration

```
refactor: migrate IncomingRoutes to SSOT pattern

Centralizes parameter definitions in DataStructure.getParameterDefinitions().
Implements 7-phase processing pipeline in SaveRecordAction.
Removes legacy ParameterSanitizationExtractor and hardcoded validation.
```

**Why this is good:**
- Named pattern (SSOT)
- Shows old vs new approach
- Lists what was removed
- Architecture-level change

---

## Example 8: Security Fix

```
fix: prevent XSS in extension name field

Sanitizes HTML entities in user-provided extension names.
Previous implementation allowed script injection through name parameter.
```

**Why this is good:**
- Security issue clearly stated
- Explains vulnerability
- Shows what protection was added
- Critical context provided

---

## Example 9: Comprehensive Test Suite

```
test: add comprehensive Extensions API test suite

Covers CRUD operations, validation rules, and edge cases.
Tests PATCH behavior to prevent defaults regression.
Includes schema validation tests with SCHEMA_VALIDATION_STRICT mode.
```

**Why this is good:**
- Scope is clear (comprehensive)
- Lists test categories
- Mentions regression prevention
- Notes validation mode

---

## Example 10: Multiple Related Changes

```
refactor: standardize API parameter validation

Migrates Extensions, Providers, and IncomingRoutes to DataStructure pattern.
Removes legacy ParameterSanitizationExtractor usage.
Fixes PATCH defaults bug across all endpoints.
```

**Why this is good:**
- Groups related changes logically
- Lists affected components
- Shows consistency improvement
- Bug fix mentioned

---

## Example 11: Breaking Change

```
feat: require authentication for all API endpoints

All endpoints now enforce Bearer token authentication.
Public access removed to improve security.
Clients must obtain token via /auth/login before API calls.
```

**Why this is good:**
- Breaking change is clear
- Security motivation stated
- Migration path provided
- Impact on clients explained

---

## Example 12: Bug Fix with Refactoring

```
fix: resolve race condition in provider status updates

Introduces mutex locking around status write operations.
Refactors status check method to use atomic Redis operations.
```

**Why this is good:**
- Bug type identified (race condition)
- Solution approach mentioned
- Refactoring context included
- Concurrency fix is clear

---

## Example 13: Urgent Hotfix

```
fix: resolve critical authentication bypass in REST API

Auth middleware was not validating token expiration properly.
Expired tokens were accepted, allowing unauthorized access.
```

**Why this is good:**
- Severity clear (critical)
- Vulnerability explained
- Impact stated
- No unnecessary details

---

## Example 14: Dependency Update

```
chore: update Phalcon to 5.8.1

Includes security patches for SQL injection vulnerability.
```

**Why this is good:**
- Version specified
- Reason for update (security)
- Short and clear
- Important context only

---

## Example 15: Documentation Addition

```
docs: add REST API development guide

Covers DataStructure patterns, SaveRecordAction phases, and validation rules.
Includes examples from Extensions and Providers implementations.
```

**Why this is good:**
- Content scope listed
- Key topics mentioned
- Example sources noted
- Helpful for developers

---

## Example 16: Reverting Changes

```
revert: remove CSV batch import feature

Feature caused memory issues with large CSV files.
Will be reimplemented with streaming approach.
```

**Why this is good:**
- Reason for revert stated
- Problem explained
- Future plan mentioned
- Honest about issue

---

## Common Success Patterns

### Pattern: Clear Summary
- Start with action verb (imperative mood)
- Be specific about component/feature
- Keep under 72 characters

### Pattern: Focused Body
- 2-4 sentences maximum
- Answer "what changed and why"
- Skip implementation details
- Mention impact when significant

### Pattern: No Fluff
- No "this commit"
- No apologies
- No unnecessary context
- No file name lists
- No Claude attribution

### Pattern: Active Voice
- "Add feature" not "Feature was added"
- "Fix bug" not "Bug has been fixed"
- "Remove code" not "Code removed"

### Pattern: Specific Metrics
- "200ms → 5ms" not "faster"
- "3 endpoints" not "several"
- "60 seconds" not "short time"
