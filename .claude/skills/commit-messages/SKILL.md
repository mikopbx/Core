---
name: commit-messages
description: Генерация лаконичных, профессиональных Git сообщений коммитов без лишнего или атрибуции. Использовать когда пользователь запрашивает создание коммита, после завершения функций или перед выполнением git commit.
allowed-tools: Bash, Read, Grep, Glob
---

# MikoPBX Commit Message Generating

Generate concise, professional commit messages that describe WHAT changed and WHY, without fluff or unnecessary details.

## What This Skill Does

1. **Analyzes git diff** to understand actual changes
2. **Identifies the type** of change (feat/fix/refactor/docs/test/chore)
3. **Generates concise message** (2-4 sentences max)
4. **Focuses on WHAT and WHY**, not HOW
5. **Uses clear English** without corporate jargon
6. **NO attribution to Claude Code** - commits are from the developer

## When to Use This Skill

Automatically activate when:
- User says "create commit" or "commit my changes"
- User asks "make a commit message"
- After completing a feature or fix
- Before git commit execution

DO NOT activate when:
- User just asks about git status
- User is exploring changes (git diff)
- Changes are not ready (tests failing)

## How It Works

### Step 1: Analyze Changes

Run git commands to understand what changed:

```bash
git status --short        # See which files changed
git diff                  # See actual changes
git diff --cached         # See staged changes if any
```

### Step 2: Identify Change Type

See [commit-types.md](reference/commit-types.md) for complete reference.

Quick guide:
- `feat:` - New functionality added
- `fix:` - Bug corrected
- `refactor:` - Code reorganized, no behavior change
- `test:` - Tests added/updated
- `docs:` - Documentation only
- `chore:` - Dependencies, build, tooling
- `perf:` - Performance optimized
- `style:` - Code formatting only

### Step 3: Extract Core Changes

From the diff, identify:
- **What component** was changed (Extensions API, SaveRecordAction, etc.)
- **What behavior** changed or was added
- **Why** this change matters (bug impact, new capability, etc.)

### Step 4: Write Commit Message

Format:
```
<type>: <concise description>

<2-4 sentences describing what changed and why>
```

Rules:
- Summary line: max 72 characters, lowercase after colon, no period
- Body: 2-4 sentences, under 150 words total
- Imperative mood: "add" not "added" or "adds"
- Active voice: "Add feature" not "Feature added"

## Core Principles

### ✅ DO:
- Be concise and specific
- State WHAT changed
- Explain WHY if not obvious
- Use active voice
- Focus on user/system impact
- Keep under 200 words total

### ❌ DON'T:
- Add "Generated with Claude Code"
- Add "Co-Authored-By: Claude"
- Use phrases like "this commit", "this change"
- Describe implementation details (HOW)
- Use corporate speak or buzzwords
- List file names (git already shows them)
- Apologize or justify

## Quick Examples

### ✅ Good Example:
```
fix: prevent PATCH requests from applying default values

PATCH should only update provided fields, leaving others unchanged.
Previous implementation incorrectly applied defaults from DataStructure
to all missing fields, overwriting existing data.
```

### ❌ Bad Example:
```
fix: fix the issue where PATCH requests were incorrectly applying defaults

This commit addresses a critical bug where PATCH requests were applying
default values from DataStructure to fields not provided in the payload.
The fix involves checking the HTTP method and only applying defaults for
POST requests...

Generated with Claude Code
```

**Why bad:** Too verbose, describes HOW, includes attribution, says "this commit"

For more examples:
- [Good examples](examples/good-examples.md) - 16 well-written commits
- [Bad examples](examples/bad-examples.md) - 14 anti-patterns to avoid

## Commit Message Templates

Use ready-made templates for common scenarios. See [commit-templates.md](templates/commit-templates.md) for complete collection.

### feat: Template
```
feat: <brief description>

<What capability was added>. <Key features or behaviors>.
<Impact on users/system if significant>.
```

### fix: Template
```
fix: <what was broken>

<Expected correct behavior>. <Actual wrong behavior>.
<Impact or consequence of bug>.
```

### refactor: Template
```
refactor: <pattern or approach> for <component>

<What was changed>. <What was removed or replaced>.
<Improvement or benefit>.
```

See [templates](templates/commit-templates.md) for all types.

## Language & Style Guide

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

## Common MikoPBX Patterns

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

### Pattern: Security Fix
```
fix: prevent <vulnerability type> in <component>

<What protection was added>. Previous implementation <vulnerability details>.
```

### Pattern: Validation Enhancement
```
fix: enforce <validation rule> in <component>

<Field> is now <required/validated/constrained>.
Previous validation allowed <invalid state>, causing <problem>.
```

See [templates](templates/commit-templates.md#common-mikopbx-patterns) for more patterns.

## Workflow

### 1. Analyze Changes
```bash
git status --short
git diff
```

### 2. Choose Type
Determine if feat/fix/refactor/test/docs/chore/perf/style

See [commit-types.md](reference/commit-types.md) for decision tree.

### 3. Write Summary
Format: `<type>: <what changed>`
- Max 72 characters
- Imperative mood
- Lowercase after colon

### 4. Write Body
2-4 sentences:
- Sentence 1: What changed
- Sentence 2: Why or impact
- Sentence 3-4: Additional context (optional)

### 5. Review Checklist

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

### 6. Present to User

Show message and ask for approval:

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

### 7. Execute Commit

After user approval:

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

## Special Cases

### Multiple Related Changes

If commit includes several related changes:

```
refactor: standardize API parameter validation

Migrates Extensions, Providers, and IncomingRoutes to DataStructure pattern.
Removes legacy ParameterSanitizationExtractor usage.
Fixes PATCH defaults bug across all endpoints.
```

Keep as one commit if changes are tightly coupled.

### Breaking Changes

If change breaks backward compatibility:

```
feat!: require authentication for all API endpoints

All endpoints now enforce Bearer token authentication.
Public access removed to improve security.
Clients must obtain token via /auth/login before API calls.
```

Add exclamation mark after type (feat!) or include BREAKING CHANGE: in body.

### Bug Fixes with Refactoring

If fix required refactoring:

```
fix: resolve race condition in provider status updates

Introduces mutex locking around status write operations.
Refactors status check method to use atomic Redis operations.
```

Primary type is `fix`, mention refactoring in body.

### Urgent Hotfixes

```
fix: resolve critical authentication bypass in REST API

Auth middleware was not validating token expiration properly.
Expired tokens were accepted, allowing unauthorized access.
```

Keep short, explain severity.

### Reverting Changes

```
revert: remove CSV batch import feature

Feature caused memory issues with large CSV files.
Will be reimplemented with streaming approach.
```

State why revert is needed.

## Quality Checklist

Every commit message must pass:

1. **Clarity** - Someone unfamiliar understands WHAT changed
2. **Conciseness** - 2-4 sentences, under 200 words
3. **Relevance** - Focuses on important changes
4. **Accuracy** - Truthfully represents changes
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

## Success Criteria

A good commit message should:
1. Be readable in `git log --oneline` (summary)
2. Provide context in `git log` (full message)
3. Help future developers understand the change
4. Take 30 seconds or less to read
5. Require no additional explanation

## When in Doubt

- Keep it shorter
- Be more specific
- Remove unnecessary words
- Focus on user/system impact
- Skip implementation details

## Additional Resources

### Reference Documentation
- **[Commit Types Reference](reference/commit-types.md)** - Complete guide to all commit types (feat, fix, refactor, perf, test, docs, chore, style, revert)
- **[Commit Templates](templates/commit-templates.md)** - Ready-to-use templates for each type with placeholders and MikoPBX-specific patterns

### Examples
- **[Good Examples](examples/good-examples.md)** - 16 well-written commit messages with explanations of what makes them effective
- **[Bad Examples (Anti-Patterns)](examples/bad-examples.md)** - 14 common mistakes to avoid with corrections

### Quick Links by Task

**Need to choose commit type?**
→ See [Commit Types Decision Tree](reference/commit-types.md#type-selection-guide)

**Need a template?**
→ See [Template Selection Flowchart](templates/commit-templates.md#template-selection-flowchart)

**Unsure if message is good?**
→ Compare against [Good Examples](examples/good-examples.md) and [Bad Examples](examples/bad-examples.md)

**Working on common MikoPBX changes?**
→ See [MikoPBX Patterns](templates/commit-templates.md#common-mikopbx-patterns)

## Remember

- **Quality over quantity** - Concise is better than verbose
- **WHAT over HOW** - Describe the change, not the code
- **WHY when relevant** - Explain motivation if not obvious
- **No attribution** - These are developer commits, not AI-generated
- **Active voice** - "Add feature" not "Feature added"
- **Imperative mood** - Command style ("Fix bug", "Add test")
