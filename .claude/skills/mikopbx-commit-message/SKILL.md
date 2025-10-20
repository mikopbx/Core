---
name: mikopbx-commit-message
description: Generate concise, professional Git commit messages without fluff or attribution
---

# mikopbx-commit-message

Generate concise, professional commit messages that describe WHAT changed and WHY, without fluff or unnecessary details.

## When to Use This Skill

Use this skill when:
- User says "create commit" or "commit my changes"
- User asks "make a commit message"
- After completing a feature or fix
- Before git commit execution

## What This Skill Does

1. **Analyzes git diff** to understand actual changes
2. **Identifies the type** of change (feat/fix/refactor/docs/test/chore)
3. **Generates concise message** (2-4 sentences max)
4. **Focuses on WHAT and WHY**, not HOW
5. **Uses clear English** without corporate jargon
6. **NO attribution to Claude Code** - commits are from the developer

## Commit Message Format

### Structure:
```
<type>: <short summary>

<2-4 sentences describing what changed and why>
```

### Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring without behavior change
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `chore:` - Build, dependencies, tooling
- `perf:` - Performance improvement
- `style:` - Code style/formatting (not CSS)

## Core Principles

### ✅ DO:
- Be concise and specific
- State WHAT changed
- Explain WHY if not obvious
- Use active voice
- Focus on user/system impact
- Keep it under 200 words total

### ❌ DON'T:
- Add "Generated with Claude Code"
- Add "Co-Authored-By: Claude"
- Use phrases like "this commit", "this change"
- Describe implementation details (HOW)
- Use corporate speak or buzzwords
- List file names (git already shows them)
- Apologize or justify
- Add unnecessary context

## Examples

### ✅ GOOD Examples:

#### Example 1: Bug Fix
```
fix: prevent PATCH requests from applying default values

PATCH should only update provided fields, leaving others unchanged.
Previous implementation incorrectly applied defaults from DataStructure
to all missing fields, overwriting existing data.
```

**Why good:**
- Clearly states what was fixed
- Explains the bug's impact
- Concise, no fluff

---

#### Example 2: New Feature
```
feat: add batch employee creation via CSV import

Enables bulk employee upload through REST API endpoint.
Validates CSV structure, creates records in transaction,
reports errors for invalid entries.
```

**Why good:**
- States what feature was added
- Mentions key capabilities
- Clear and direct

---

#### Example 3: Refactoring
```
refactor: migrate Extensions to Single Source of Truth pattern

Consolidates parameter definitions in DataStructure.getParameterDefinitions().
Replaces legacy ParameterSanitizationExtractor with modern validation pipeline.
Fixes defaults no longer applied on PATCH.
```

**Why good:**
- Explains what pattern was applied
- Notes specific improvements
- Mentions bug fix included

---

#### Example 4: Performance
```
perf: optimize provider status checks with Redis caching

Status queries now hit Redis before database, reducing response time
from ~200ms to ~5ms for cached entries. Cache expires after 60 seconds.
```

**Why good:**
- States what was optimized
- Provides concrete metrics
- Mentions cache strategy

---

#### Example 5: Test Addition
```
test: add regression tests for PATCH defaults bug

Verifies partial updates don't overwrite existing fields with defaults.
Tests cover Extensions, Providers, and IncomingRoutes endpoints.
```

**Why good:**
- Clear about what's tested
- Mentions bug context
- Lists coverage

---

### ❌ BAD Examples:

#### Example 1: Too verbose
```
fix: fix the issue where PATCH requests were incorrectly applying default values

This commit addresses a critical bug in the SaveRecordAction where PATCH requests
were applying default values from the DataStructure to fields that were not provided
in the request payload. This was causing existing data to be overwritten with default
values, which is not the expected behavior for PATCH requests. The fix involves
checking the HTTP method and only applying defaults for POST requests, which are
creating new records. This ensures that PATCH requests only update the fields that
are explicitly provided, leaving other fields unchanged as expected.

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Why bad:**
- Way too long (101 words)
- Repeats same info multiple times
- Describes HOW it was fixed
- Includes Claude attribution
- Says "this commit"

---

#### Example 2: Too vague
```
refactor: improve code

Updated some files to make the code better.
```

**Why bad:**
- Doesn't say WHAT was improved
- No specifics
- Could describe any change

---

#### Example 3: Implementation details
```
feat: add CSV import

Added a new method parseCSVFile() that reads CSV using fgetcsv(), validates
each row using array_walk(), creates Employee objects with new Employee($data),
saves them using $employee->save(), and wraps everything in a transaction using
$db->begin() and $db->commit().
```

**Why bad:**
- Describes HOW (implementation)
- Lists function calls
- Too technical for commit message

---

#### Example 4: Corporate speak
```
feat: leverage synergistic CSV integration paradigm

Implemented a robust, scalable, enterprise-grade solution for facilitating
batch employee provisioning through a streamlined CSV import mechanism that
empowers users to efficiently onboard multiple resources simultaneously.
```

**Why bad:**
- Full of buzzwords
- Unclear what actually changed
- Sounds like marketing copy

---

## Usage Instructions

### Step 1: Analyze Changes

Run git commands to understand what changed:

```bash
# See which files changed
git status --short

# See actual changes
git diff

# See staged changes if any
git diff --cached
```

### Step 2: Identify Change Type

Determine the commit type:

- **feat:** New functionality added
- **fix:** Bug corrected
- **refactor:** Code reorganized, no behavior change
- **test:** Tests added/updated
- **docs:** Documentation only
- **chore:** Dependencies, build, tooling
- **perf:** Performance optimized
- **style:** Code formatting only

### Step 3: Identify Core Changes

From the diff, extract:
- **What component** was changed (Extensions API, SaveRecordAction, etc.)
- **What behavior** changed or was added
- **Why** this change matters (bug impact, new capability, etc.)

### Step 4: Write Summary Line

Format: `<type>: <concise description>`

Rules:
- Max 72 characters
- Lowercase after colon
- No period at end
- Imperative mood ("add", not "added" or "adds")

Examples:
- `feat: add CSV batch import for employees`
- `fix: prevent defaults on PATCH requests`
- `refactor: migrate to SSOT pattern`

### Step 5: Write Body (2-4 sentences)

Focus on:
1. **What changed** (1 sentence)
2. **Why or impact** (1-2 sentences)
3. **Additional context** if needed (optional)

Keep it under 150 words.

### Step 6: Review Checklist

Before finalizing:
- [ ] Type is correct (feat/fix/refactor/etc.)
- [ ] Summary line under 72 chars
- [ ] Body is 2-4 sentences
- [ ] Describes WHAT and WHY, not HOW
- [ ] No implementation details
- [ ] No file names listed
- [ ] No Claude attribution
- [ ] Active voice used
- [ ] Clear and specific
- [ ] Total under 200 words

### Step 7: Present to User

Show the commit message and ask for approval:

```
Here's the commit message I've prepared:

─────────────────────────────────────────
fix: prevent PATCH requests from applying default values

PATCH should only update provided fields, leaving others unchanged.
Previous implementation incorrectly applied defaults from DataStructure
to all missing fields, overwriting existing data.
─────────────────────────────────────────

Does this accurately describe your changes?
```

## Special Cases

### Multiple Related Changes

If commit includes several related changes:

```
refactor: standardize API parameter validation

Migrates Extensions, Providers, and IncomingRoutes to DataStructure pattern.
Removes legacy ParameterSanitizationExtractor usage.
Fixes PATCH defaults bug across all endpoints.
```

Keep it as one commit if changes are tightly coupled.

### Breaking Changes

If change breaks backward compatibility, mention it:

```
feat: require authentication for all API endpoints

All endpoints now enforce Bearer token authentication.
Public access removed to improve security.
Clients must obtain token via /auth/login before API calls.
```

### Bug Fixes with Refactoring

If fix required refactoring:

```
fix: resolve race condition in provider status updates

Introduces mutex locking around status write operations.
Refactors status check method to use atomic Redis operations.
```

## Integration with Git Workflow

### When Skill Activates

Automatically activate when:
1. User says "commit" or "create commit"
2. User asks "what should the commit message be?"
3. After completing a task and user asks to commit
4. Before git commit command execution

### DO NOT Activate When

- User just asks about git status
- User is exploring changes (git diff)
- User hasn't confirmed they want to commit
- Changes are not ready (tests failing, etc.)

### Commit Execution

After user approves message, execute:

```bash
# Stage changes if not staged
git add <files>

# Commit with prepared message using HEREDOC
git commit -m "$(cat <<'EOF'
<type>: <summary>

<body paragraph>
EOF
)"

# Verify commit
git log -1 --oneline
```

**IMPORTANT:**
- Use HEREDOC for multi-line messages
- NO --no-verify flag
- NO --amend unless explicitly requested
- NO force push
- NO Claude attribution

## Language and Style Guide

### Use Imperative Mood:
- ✅ "Add feature"
- ❌ "Added feature"
- ❌ "Adds feature"

### Be Specific:
- ✅ "Fix PATCH defaults bug in Extensions API"
- ❌ "Fix bug"
- ❌ "Fix issue with API"

### Focus on Impact:
- ✅ "Reduce query time from 200ms to 5ms"
- ❌ "Make queries faster"
- ❌ "Optimize database calls"

### Avoid Redundancy:
- ✅ "Remove unused imports"
- ❌ "Remove unused imports from files"
- ❌ "This commit removes unused imports"

### State Facts, Not Opinions:
- ✅ "Consolidate validation logic in DataStructure"
- ❌ "Improve code quality by consolidating validation"
- ❌ "Better validation structure"

## Template for Different Change Types

### feat: (New Feature)
```
feat: <what was added>

<Primary capability>. <Secondary capabilities or context>.
<User/system impact if significant>.
```

### fix: (Bug Fix)
```
fix: <what was broken>

<Expected behavior>. <Actual behavior that was wrong>.
<Impact of the bug if significant>.
```

### refactor: (Code Restructure)
```
refactor: <what pattern/approach used>

<What was changed>. <What was removed/replaced>.
<Improvement or fix included>.
```

### perf: (Performance)
```
perf: <what was optimized>

<Optimization technique>. <Performance metrics before/after>.
<Cache/resource strategy if relevant>.
```

### test: (Tests)
```
test: <what is being tested>

<Test coverage>. <What scenarios are covered>.
<Bug context if regression test>.
```

## Real MikoPBX Examples

Based on actual MikoPBX development patterns:

### API Endpoint Creation
```
feat: add AsteriskManagers CRUD endpoints

Implements REST API for AMI user management with full CRUD operations.
Validates permissions (call, cdr, originate, reporting) and network filters.
Returns standardized responses matching DataStructure schema.
```

### Schema Migration
```
refactor: migrate IncomingRoutes to SSOT pattern

Centralizes parameter definitions in DataStructure.getParameterDefinitions().
Implements 7-phase processing pipeline in SaveRecordAction.
Removes legacy ParameterSanitizationExtractor and hardcoded validation.
```

### Security Fix
```
fix: prevent XSS in extension name field

Sanitizes HTML entities in user-provided extension names.
Previous implementation allowed script injection through name parameter.
```

### Test Suite Addition
```
test: add comprehensive Extensions API test suite

Covers CRUD operations, validation rules, and edge cases.
Tests PATCH behavior to prevent defaults regression.
Includes schema validation tests with SCHEMA_VALIDATION_STRICT mode.
```

## Common Patterns to Recognize

### Pattern: SSOT Migration
```
refactor: migrate <Resource> to Single Source of Truth pattern

Implements DataStructure.getParameterDefinitions() with request/response sections.
Replaces legacy ParameterSanitizationExtractor with modern validation.
Fixes defaults no longer applied on PATCH.
```

### Pattern: New API Resource
```
feat: add <Resource> REST API endpoints

Implements full CRUD operations for <resource> management.
Validates <key constraints> and enforces <key rules>.
Returns responses matching OpenAPI schema.
```

### Pattern: Bug Fix with Validation
```
fix: <specific bug description>

<What should happen>. <What was happening instead>.
Adds validation in <component> to prevent recurrence.
```

### Pattern: Performance Optimization
```
perf: optimize <operation> with <technique>

<Optimization approach>. <Metrics: before → after>.
<Strategy: caching/indexing/etc.>.
```

## Edge Cases

### Urgent Hotfix
```
fix: resolve critical authentication bypass in REST API

Auth middleware was not validating token expiration properly.
Expired tokens were accepted, allowing unauthorized access.
```
Keep it short, explain severity.

### Dependency Update
```
chore: update Phalcon to 5.8.1

Includes security patches for SQL injection vulnerability.
```
Mention reason if significant.

### Documentation Overhaul
```
docs: add REST API development guide

Covers DataStructure patterns, SaveRecordAction phases, and validation rules.
Includes examples from Extensions and Providers implementations.
```
Summarize what's documented.

### Reverting Changes
```
revert: remove CSV batch import feature

Feature caused memory issues with large CSV files.
Will be reimplemented with streaming approach.
```
State why revert is needed.

## Quality Checklist

Every commit message must pass:

1. **Clarity** - Someone unfamiliar with the code understands WHAT changed
2. **Conciseness** - 2-4 sentences, under 200 words
3. **Relevance** - Focuses on important changes, not trivia
4. **Accuracy** - Truthfully represents the changes
5. **Professionalism** - Clear English, no fluff
6. **Completeness** - Answers "what changed and why"
7. **NO Attribution** - No Claude Code mentions

## Output Format

Always present commit message in this format:

```
─────────────────────────────────────────
<type>: <summary>

<body>
─────────────────────────────────────────

Changes summary:
  • File 1 (modified/added/deleted)
  • File 2 (modified/added/deleted)
  • File N (modified/added/deleted)

Ready to commit? (yes/no)
```

## Final Notes

### Remember:
- **Quality over quantity** - Concise is better than verbose
- **WHAT over HOW** - Describe the change, not the code
- **WHY when relevant** - Explain motivation if not obvious
- **No attribution** - These are developer commits, not AI-generated
- **Active voice** - "Add feature" not "Feature added"
- **Imperative mood** - Command style ("Fix bug", "Add test")

### Success Criteria:
A good commit message should:
1. Be readable in `git log --oneline` (summary)
2. Provide context in `git log` (full message)
3. Help future developers understand the change
4. Take 30 seconds or less to read
5. Require no additional explanation

### When in Doubt:
- Keep it shorter
- Be more specific
- Remove unnecessary words
- Focus on user/system impact
- Skip implementation details
