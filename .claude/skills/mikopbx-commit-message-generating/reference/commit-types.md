# Commit Types Reference

Complete reference for all commit types used in MikoPBX development.

## Overview

Commit types follow the Conventional Commits standard, categorizing changes by their nature and impact.

---

## feat: New Feature

**When to use:**
- Adding new functionality
- Implementing new API endpoints
- Creating new components
- Adding new capabilities

**Structure:**
```
feat: <what was added>

<Primary capability>. <Secondary capabilities or context>.
<User/system impact if significant>.
```

**Examples:**
```
feat: add CSV batch import for employees

Enables bulk employee upload through REST API endpoint.
Validates CSV structure, creates records in transaction,
reports errors for invalid entries.
```

```
feat: add AsteriskManagers CRUD endpoints

Implements REST API for AMI user management with full CRUD operations.
Validates permissions (call, cdr, originate, reporting) and network filters.
Returns standardized responses matching DataStructure schema.
```

**Key points:**
- Focus on user/system capability added
- Mention primary use case
- Note validation/security if relevant
- Keep under 150 words

---

## fix: Bug Fix

**When to use:**
- Correcting incorrect behavior
- Resolving errors or crashes
- Fixing validation issues
- Addressing security vulnerabilities

**Structure:**
```
fix: <what was broken>

<Expected behavior>. <Actual behavior that was wrong>.
<Impact of the bug if significant>.
```

**Examples:**
```
fix: prevent PATCH requests from applying default values

PATCH should only update provided fields, leaving others unchanged.
Previous implementation incorrectly applied defaults from DataStructure
to all missing fields, overwriting existing data.
```

```
fix: prevent XSS in extension name field

Sanitizes HTML entities in user-provided extension names.
Previous implementation allowed script injection through name parameter.
```

**Key points:**
- State what was broken
- Explain correct vs incorrect behavior
- Mention impact if security/data-related
- Be specific about the fix

---

## refactor: Code Restructuring

**When to use:**
- Reorganizing code without changing behavior
- Migrating to new patterns
- Consolidating duplicate code
- Improving code structure

**Structure:**
```
refactor: <what pattern/approach used>

<What was changed>. <What was removed/replaced>.
<Improvement or fix included>.
```

**Examples:**
```
refactor: migrate Extensions to Single Source of Truth pattern

Consolidates parameter definitions in DataStructure.getParameterDefinitions().
Replaces legacy ParameterSanitizationExtractor with modern validation pipeline.
Fixes defaults no longer applied on PATCH.
```

```
refactor: standardize API parameter validation

Migrates Extensions, Providers, and IncomingRoutes to DataStructure pattern.
Removes legacy ParameterSanitizationExtractor usage.
Fixes PATCH defaults bug across all endpoints.
```

**Key points:**
- Name the pattern/approach
- Mention what was replaced
- Note any bugs fixed during refactoring
- Explain architecture improvement

---

## perf: Performance Improvement

**When to use:**
- Optimizing speed
- Reducing memory usage
- Improving response times
- Adding caching

**Structure:**
```
perf: <what was optimized>

<Optimization technique>. <Performance metrics before/after>.
<Cache/resource strategy if relevant>.
```

**Examples:**
```
perf: optimize provider status checks with Redis caching

Status queries now hit Redis before database, reducing response time
from ~200ms to ~5ms for cached entries. Cache expires after 60 seconds.
```

**Key points:**
- State what was optimized
- Include before/after metrics
- Mention optimization technique
- Note caching/indexing strategy

---

## test: Test Addition/Modification

**When to use:**
- Adding new tests
- Updating existing tests
- Adding regression tests
- Improving test coverage

**Structure:**
```
test: <what is being tested>

<Test coverage>. <What scenarios are covered>.
<Bug context if regression test>.
```

**Examples:**
```
test: add regression tests for PATCH defaults bug

Verifies partial updates don't overwrite existing fields with defaults.
Tests cover Extensions, Providers, and IncomingRoutes endpoints.
```

```
test: add comprehensive Extensions API test suite

Covers CRUD operations, validation rules, and edge cases.
Tests PATCH behavior to prevent defaults regression.
Includes schema validation tests with SCHEMA_VALIDATION_STRICT mode.
```

**Key points:**
- Specify what's being tested
- Mention test coverage scope
- Note regression context if applicable
- List key scenarios covered

---

## docs: Documentation

**When to use:**
- Adding/updating documentation
- Writing guides or references
- Updating README files
- Adding code comments

**Structure:**
```
docs: <what documentation was added/updated>

<Content summary>. <Target audience if relevant>.
<Examples/sections included>.
```

**Examples:**
```
docs: add REST API development guide

Covers DataStructure patterns, SaveRecordAction phases, and validation rules.
Includes examples from Extensions and Providers implementations.
```

**Key points:**
- State what documentation was added
- Summarize key topics covered
- Mention examples if included
- Target audience if specific

---

## chore: Build/Dependencies/Tooling

**When to use:**
- Updating dependencies
- Build system changes
- CI/CD modifications
- Tooling updates

**Structure:**
```
chore: <what was updated/changed>

<Reason for change if significant>.
<Version or impact if relevant>.
```

**Examples:**
```
chore: update Phalcon to 5.8.1

Includes security patches for SQL injection vulnerability.
```

**Key points:**
- Specify what was changed
- Mention reason if important
- Note version numbers
- State impact if security-related

---

## style: Code Style/Formatting

**When to use:**
- Code formatting changes
- Linting fixes
- Whitespace cleanup
- Code style standardization

**Structure:**
```
style: <what was formatted>

<Style standard applied if relevant>.
```

**Examples:**
```
style: apply PSR-12 formatting to Extensions controller

Fixes indentation, line length, and spacing to match PSR-12 standard.
```

**Key points:**
- State what was formatted
- Mention style guide if applicable
- Keep very brief (no behavior change)

---

## revert: Reverting Previous Changes

**When to use:**
- Reverting a previous commit
- Rolling back problematic changes
- Undoing features

**Structure:**
```
revert: <what is being reverted>

<Reason for revert>. <Future plan if applicable>.
```

**Examples:**
```
revert: remove CSV batch import feature

Feature caused memory issues with large CSV files.
Will be reimplemented with streaming approach.
```

**Key points:**
- State what's being reverted
- Explain reason for revert
- Mention future plans if any
- Be honest about the issue

---

## Special Case: Breaking Changes

**When to use:**
- Changes break backward compatibility
- API changes that affect clients
- Database schema changes
- Configuration changes

**How to indicate:**
Add `BREAKING CHANGE:` in body or use `!` after type:

```
feat!: require authentication for all API endpoints

All endpoints now enforce Bearer token authentication.
Public access removed to improve security.
Clients must obtain token via /auth/login before API calls.
```

**Key points:**
- Clearly state it's breaking
- Explain what breaks
- Provide migration path
- Mention impact on clients

---

## Type Selection Guide

### Quick Decision Tree:

1. **Does it add new functionality?** → `feat:`
2. **Does it fix a bug?** → `fix:`
3. **Does it change code structure without behavior change?** → `refactor:`
4. **Does it improve performance?** → `perf:`
5. **Does it add/update tests?** → `test:`
6. **Does it only change documentation?** → `docs:`
7. **Does it update dependencies/build?** → `chore:`
8. **Does it only change formatting?** → `style:`
9. **Does it revert a previous change?** → `revert:`

### Multiple Types?

If change includes multiple types:
- Choose the **primary** type
- Mention secondary changes in body
- Or split into separate commits

Example:
```
refactor: migrate Extensions to SSOT pattern

Centralizes parameter definitions in DataStructure.
Fixes PATCH defaults bug during migration.
```
(Refactor is primary, fix is mentioned)

---

## Type Priority (When Multiple Apply)

1. `fix:` - Bug fixes take priority
2. `feat:` - New features second
3. `refactor:` - Refactoring third
4. `perf:` - Performance fourth
5. Others as appropriate

**Rationale:** Fixes are most critical, features are visible, refactoring is internal.

---

## Scope (Optional)

Some teams use scopes to add more context:

```
feat(api): add employee CSV import
fix(auth): prevent token bypass
refactor(extensions): migrate to SSOT pattern
```

**MikoPBX convention:** Scopes are optional. Use when helpful, skip when obvious.

---

## Summary

| Type | Purpose | User Visible? | Breaking? |
|------|---------|---------------|-----------|
| feat | New feature | ✅ Yes | Possibly |
| fix | Bug fix | ✅ Yes | Rarely |
| refactor | Code restructure | ❌ No | Rarely |
| perf | Performance | ✅ Yes | Rarely |
| test | Tests | ❌ No | No |
| docs | Documentation | ⚠️ Maybe | No |
| chore | Build/tools | ❌ No | Rarely |
| style | Formatting | ❌ No | No |
| revert | Undo change | ⚠️ Maybe | Possibly |
