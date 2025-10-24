# Commit Message Templates

Ready-to-use templates for different types of commits in MikoPBX development.

## How to Use Templates

1. Copy the template for your change type
2. Replace `<placeholders>` with actual content
3. Remove optional sections if not needed
4. Keep total message under 200 words
5. Review against checklist before committing

---

## feat: New Feature Template

```
feat: <brief description of new functionality>

<What capability was added>. <Key features or behaviors>.
<Impact on users/system if significant>.
```

### Example with placeholders:
```
feat: add <resource> <operation> via <method>

Enables <primary use case>. <Key validation or behavior>.
<Additional capabilities or context>.
```

### Filled example:
```
feat: add employee CSV import via REST API

Enables bulk employee creation from CSV files.
Validates structure, creates records in transaction.
Reports errors with line numbers for invalid entries.
```

---

## fix: Bug Fix Template

```
fix: <what was broken or incorrect>

<Expected correct behavior>. <Actual wrong behavior>.
<Impact or consequence of bug>.
```

### Example with placeholders:
```
fix: prevent <incorrect behavior> in <component>

<Component> should <correct behavior>.
Previous implementation <what went wrong>.
```

### Filled example:
```
fix: prevent PATCH from applying defaults in Extensions

PATCH should only update provided fields.
Previous implementation applied defaults to all missing fields,
overwriting existing data.
```

---

## refactor: Code Restructuring Template

```
refactor: <pattern or approach applied> for <component>

<What was changed or consolidated>. <What was removed or replaced>.
<Improvement or benefit>.
```

### Example with placeholders:
```
refactor: migrate <component> to <pattern>

<Core change description>. Replaces <old approach> with <new approach>.
<Additional benefit or fix>.
```

### Filled example:
```
refactor: migrate IncomingRoutes to SSOT pattern

Centralizes parameter definitions in DataStructure.getParameterDefinitions().
Replaces hardcoded validation with schema-driven approach.
Fixes PATCH defaults bug during migration.
```

---

## perf: Performance Optimization Template

```
perf: optimize <operation> with <technique>

<How optimization works>. <Metrics: before → after>.
<Cache/strategy details if applicable>.
```

### Example with placeholders:
```
perf: optimize <operation> with <caching/indexing/etc>

<Operation> now <optimization approach>.
Response time reduced from <before>ms to <after>ms.
<Cache expiration or strategy>.
```

### Filled example:
```
perf: optimize provider status checks with Redis caching

Status queries hit Redis before database.
Response time reduced from ~200ms to ~5ms for cached entries.
Cache expires after 60 seconds.
```

---

## test: Test Addition Template

```
test: add <test type> for <component/feature>

<What scenarios are tested>. <Coverage scope>.
<Bug context if regression test>.
```

### Example with placeholders:
```
test: add <comprehensive/regression/unit> tests for <feature>

Covers <test scenarios>. Tests <specific behaviors>.
<Additional context or validation mode>.
```

### Filled example:
```
test: add regression tests for PATCH defaults bug

Verifies partial updates don't overwrite existing fields.
Tests cover Extensions, Providers, and IncomingRoutes.
Includes SCHEMA_VALIDATION_STRICT mode validation.
```

---

## docs: Documentation Template

```
docs: add <document type> for <topic>

Covers <key topics or sections>.
<Examples or target audience if relevant>.
```

### Example with placeholders:
```
docs: add <guide/reference/readme> for <topic>

Documents <primary content>. Includes <examples/sections>.
<Target audience or use cases>.
```

### Filled example:
```
docs: add REST API development guide

Covers DataStructure patterns, SaveRecordAction phases, and validation.
Includes examples from Extensions and Providers implementations.
Target audience: developers implementing new endpoints.
```

---

## chore: Build/Dependencies Template

```
chore: update <dependency> to <version>

<Reason for update if significant>.
```

### Example with placeholders:
```
chore: update <package> to <version>

<Security fixes / new features / bug fixes included>.
```

### Filled example:
```
chore: update Phalcon to 5.8.1

Includes security patches for SQL injection vulnerability.
```

---

## style: Code Formatting Template

```
style: apply <style guide> to <component>

<Brief description of changes>.
```

### Example with placeholders:
```
style: apply <PSR-12/airbnb/etc> formatting to <files/component>

Fixes <indentation/spacing/line length> to match <standard>.
```

### Filled example:
```
style: apply PSR-12 formatting to Extensions controller

Fixes indentation, line length, and spacing to match PSR-12.
```

---

## revert: Revert Template

```
revert: remove <feature/change>

<Reason for revert>. <Future plan if applicable>.
```

### Example with placeholders:
```
revert: remove <feature>

<What problem it caused>. Will be reimplemented with <approach>.
```

### Filled example:
```
revert: remove CSV batch import feature

Feature caused memory issues with large files.
Will be reimplemented with streaming approach.
```

---

## Common MikoPBX Patterns

### Pattern: SSOT Migration

```
refactor: migrate <Resource> to Single Source of Truth pattern

Implements DataStructure.getParameterDefinitions() with request/response sections.
Replaces legacy ParameterSanitizationExtractor with modern validation.
Fixes defaults no longer applied on PATCH.
```

**When to use:** Migrating endpoints to DataStructure pattern

**Variations:**
- Single resource: "migrate Extensions to SSOT pattern"
- Multiple resources: "standardize API parameter validation"

---

### Pattern: New API Resource

```
feat: add <Resource> REST API endpoints

Implements full CRUD operations for <resource> management.
Validates <key constraints> and enforces <key rules>.
Returns responses matching OpenAPI schema.
```

**When to use:** Creating new REST API endpoints

**Variations:**
- Simple CRUD: "add Employees CRUD endpoints"
- Complex operations: "add AsteriskManagers with permission validation"

---

### Pattern: Security Fix

```
fix: prevent <vulnerability type> in <component>

<What protection was added>. Previous implementation <vulnerability details>.
<Impact or severity if critical>.
```

**When to use:** Fixing security vulnerabilities

**Variations:**
- XSS: "prevent XSS in user input fields"
- Auth: "fix authentication bypass in REST API"
- Injection: "sanitize SQL input in provider queries"

---

### Pattern: Validation Enhancement

```
fix: enforce <validation rule> in <component>

<Field> is now <required/validated/constrained>.
Previous validation allowed <invalid state>, causing <problem>.
```

**When to use:** Adding or fixing validation

**Variations:**
- Required fields: "enforce extension number requirement"
- Format validation: "validate email format in employee creation"

---

### Pattern: Multiple Related Changes

```
refactor: standardize <aspect> across <components>

Migrates <resource1>, <resource2>, and <resource3> to <pattern>.
Removes <deprecated approach>.
Fixes <bug> across all endpoints.
```

**When to use:** Applying same change to multiple components

**Keep grouped if:**
- Changes are tightly coupled
- Splitting would break functionality
- Same bug fixed across components

---

### Pattern: Breaking Change

```
feat!: <breaking change description>

<What changed>. <What broke>.
<Migration path or client impact>.
```

**When to use:** Changes that break backward compatibility

**Format:**
- Use `!` after type: `feat!:` or `fix!:`
- Or add `BREAKING CHANGE:` in body
- Clearly explain impact

---

## Template Selection Flowchart

```
Does it add new functionality?
├─ Yes → Use `feat:` template
└─ No
   ├─ Does it fix a bug?
   │  ├─ Yes → Use `fix:` template
   │  └─ No
   │     ├─ Does it restructure code?
   │     │  ├─ Yes → Use `refactor:` template
   │     │  └─ No
   │     │     ├─ Does it improve performance?
   │     │     │  ├─ Yes → Use `perf:` template
   │     │     │  └─ No
   │     │     │     ├─ Does it add/update tests?
   │     │     │     │  ├─ Yes → Use `test:` template
   │     │     │     │  └─ No
   │     │     │     │     ├─ Is it only documentation?
   │     │     │     │     │  ├─ Yes → Use `docs:` template
   │     │     │     │     │  └─ No → Use `chore:` or `style:`
```

---

## Quick Reference Card

| Type | One-liner Template |
|------|-------------------|
| `feat:` | `feat: add <feature>` |
| `fix:` | `fix: prevent <problem>` |
| `refactor:` | `refactor: migrate <component> to <pattern>` |
| `perf:` | `perf: optimize <operation> with <technique>` |
| `test:` | `test: add <test type> for <component>` |
| `docs:` | `docs: add <doc type> for <topic>` |
| `chore:` | `chore: update <dependency> to <version>` |
| `style:` | `style: apply <standard> to <component>` |
| `revert:` | `revert: remove <feature>` |

---

## Checklist Before Using Template

Before filling in a template:

- [ ] Understand what changed (read git diff)
- [ ] Identify the primary change type
- [ ] Know the component/feature affected
- [ ] Understand the impact or reason
- [ ] Have metrics if performance-related
- [ ] Know what was replaced if refactoring

After filling in template:

- [ ] Summary line under 72 characters
- [ ] Body is 2-4 sentences
- [ ] Describes WHAT and WHY, not HOW
- [ ] No implementation details
- [ ] No file names
- [ ] No Claude attribution
- [ ] Active voice used
- [ ] Total under 200 words
- [ ] Imperative mood ("Add", not "Added")

---

## Common Substitutions

### For `<component>`:
- Extensions
- Providers
- IncomingRoutes
- AsteriskManagers
- REST API
- SaveRecordAction
- DataStructure
- Auth middleware

### For `<pattern>`:
- Single Source of Truth (SSOT)
- DataStructure validation
- Schema-driven approach
- Repository pattern
- Factory pattern

### For `<operation>`:
- CRUD operations
- CSV import
- Batch creation
- Status checks
- Validation
- Authentication

### For `<technique>`:
- Redis caching
- Database indexing
- Query optimization
- Connection pooling
- Lazy loading

---

## Example: Filling in a Template

### Start with template:
```
refactor: migrate <component> to <pattern>

<Core change>. Replaces <old> with <new>.
<Benefit or fix>.
```

### Analyze changes:
- Component: Extensions
- Pattern: SSOT (DataStructure)
- Old: ParameterSanitizationExtractor
- New: DataStructure.getParameterDefinitions()
- Benefit: Fixes PATCH defaults bug

### Fill in template:
```
refactor: migrate Extensions to SSOT pattern

Centralizes parameter definitions in DataStructure.getParameterDefinitions().
Replaces ParameterSanitizationExtractor with schema-driven validation.
Fixes PATCH defaults bug during migration.
```

### Review:
- ✅ Type correct (refactor)
- ✅ Summary under 72 chars
- ✅ Body 3 sentences
- ✅ Explains WHAT and WHY
- ✅ No HOW details
- ✅ Under 200 words
- ✅ Ready to commit!

---

## Tips for Template Usage

1. **Don't force fit** - If template doesn't match, write custom message
2. **Combine sections** - Merge similar ideas for brevity
3. **Skip optionals** - Only include what adds value
4. **Be specific** - Replace placeholders with concrete terms
5. **Keep concise** - Shorter is usually better
6. **Focus on impact** - Why this change matters
7. **Use active voice** - "Add feature" not "Feature added"
8. **No fluff** - Every word should add information
