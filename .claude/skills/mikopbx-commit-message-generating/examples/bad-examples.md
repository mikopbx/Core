# Bad Commit Message Examples (Anti-Patterns)

This file shows common mistakes in commit messages and explains why they should be avoided.

## Example 1: Too Verbose

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

**Why this is bad:**
- Way too long (101 words in body)
- Repeats same information multiple times
- Describes HOW it was fixed (implementation details)
- Includes Claude attribution (forbidden!)
- Uses "this commit" phrase
- Over-explains expected behavior
- Could be 3 sentences instead of 7

**Better version:**
```
fix: prevent PATCH requests from applying default values

PATCH should only update provided fields, leaving others unchanged.
Previous implementation incorrectly applied defaults from DataStructure
to all missing fields, overwriting existing data.
```

---

## Example 2: Too Vague

```
refactor: improve code

Updated some files to make the code better.
```

**Why this is bad:**
- Doesn't say WHAT was improved
- No specifics about what changed
- "better" is subjective and meaningless
- Could describe literally any change
- No value for future developers
- "some files" is too vague

**Better version:**
```
refactor: migrate Extensions to DataStructure pattern

Centralizes parameter definitions in getParameterDefinitions().
Removes legacy ParameterSanitizationExtractor usage.
```

---

## Example 3: Implementation Details

```
feat: add CSV import

Added a new method parseCSVFile() that reads CSV using fgetcsv(), validates
each row using array_walk(), creates Employee objects with new Employee($data),
saves them using $employee->save(), and wraps everything in a transaction using
$db->begin() and $db->commit().
```

**Why this is bad:**
- Describes HOW (implementation) instead of WHAT (feature)
- Lists function calls and code structure
- Too technical for commit message
- Reads like code documentation
- No mention of business value
- No user impact described

**Better version:**
```
feat: add batch employee creation via CSV import

Enables bulk employee upload through REST API endpoint.
Validates CSV structure, creates records in transaction,
reports errors for invalid entries.
```

---

## Example 4: Corporate Speak / Buzzwords

```
feat: leverage synergistic CSV integration paradigm

Implemented a robust, scalable, enterprise-grade solution for facilitating
batch employee provisioning through a streamlined CSV import mechanism that
empowers users to efficiently onboard multiple resources simultaneously.
```

**Why this is bad:**
- Full of meaningless buzzwords
- Sounds like marketing copy
- "Leverage", "synergistic", "paradigm" add no value
- "Robust, scalable, enterprise-grade" is fluff
- Unclear what actually changed
- Wastes reader's time

**Better version:**
```
feat: add CSV batch import for employees

Allows bulk employee creation via CSV upload.
Validates data and creates records in single transaction.
```

---

## Example 5: Lists File Names

```
fix: update validation

Modified files:
- src/PBXCoreREST/Controllers/Extensions/RestController.php
- src/PBXCoreREST/Lib/Extensions/SaveRecordAction.php
- src/PBXCoreREST/Lib/Extensions/DataStructure.php
- tests/api/test_extensions.py

Updated validation logic in these files to fix the bug.
```

**Why this is bad:**
- Git already shows which files changed
- File names add no value to commit message
- Doesn't explain WHAT was validated
- Doesn't explain WHAT bug was fixed
- Wastes space listing obvious info

**Better version:**
```
fix: prevent empty extension numbers in validation

Extension number is now required and cannot be empty string.
Previous validation allowed empty values, causing database errors.
```

---

## Example 6: Apologetic / Justifying

```
fix: sorry for the bug in the PATCH logic

I apologize for not catching this earlier. The PATCH endpoint was broken
because I didn't realize that defaults shouldn't be applied. This should
have been obvious but I made a mistake. Hopefully this fix works and doesn't
cause more problems. Please let me know if anything else breaks.
```

**Why this is bad:**
- Apologizing in commit message (unnecessary)
- Self-deprecating ("I made a mistake")
- Uncertain language ("hopefully", "should")
- Focuses on developer's feelings, not the fix
- No technical value
- Unprofessional tone

**Better version:**
```
fix: prevent PATCH requests from applying default values

PATCH should only update provided fields, leaving others unchanged.
Previous implementation applied defaults to missing fields.
```

---

## Example 7: Says "this commit" / "this change"

```
refactor: code improvements

This commit refactors the Extensions controller to use the new pattern.
This change makes the code more maintainable and easier to understand.
```

**Why this is bad:**
- "This commit" is redundant (obviously it's this commit)
- "This change" is also redundant
- Doesn't explain what pattern
- "More maintainable" is vague
- No specifics about improvements

**Better version:**
```
refactor: migrate Extensions to SSOT pattern

Centralizes parameter definitions in DataStructure.
Replaces hardcoded validation with schema-driven approach.
```

---

## Example 8: Mixed Concerns

```
feat: add CSV import and fix PATCH bug and update documentation

Added CSV import feature. Also fixed a bug with PATCH requests applying
defaults. Updated README with new API examples. Refactored some validation
logic while I was there.
```

**Why this is bad:**
- Multiple unrelated changes in one commit
- Should be 3-4 separate commits
- Hard to revert specific changes
- Violates single responsibility
- "While I was there" refactoring

**Better approach:**
Split into separate commits:
1. `fix: prevent PATCH from applying defaults`
2. `feat: add CSV batch import for employees`
3. `docs: update README with CSV import examples`

---

## Example 9: Passive Voice

```
refactor: validation logic was improved

The parameter validation code was refactored and the old approach was replaced.
Better patterns were used and performance was improved.
```

**Why this is bad:**
- Passive voice throughout ("was improved", "was replaced")
- Less direct and clear
- Doesn't say WHO/WHAT did the action
- Reads weakly

**Better version:**
```
refactor: migrate to DataStructure validation pattern

Replaces hardcoded validation with schema-driven approach.
Centralizes parameter definitions in single location.
Reduces validation code by 40%.
```

---

## Example 10: No Context

```
fix: bug

Fixed it.
```

**Why this is bad:**
- No information about what bug
- No context for future developers
- Useless commit message
- Could be any bug anywhere
- Zero value in git log

**Better version:**
```
fix: prevent null pointer in provider status check

Status check now validates provider exists before accessing properties.
Previous code crashed when provider was deleted during check.
```

---

## Example 11: Future Tense / Past Tense (Wrong Mood)

```
feat: will add CSV import feature

This is going to add the ability to import employees from CSV files.
It will validate the data and will create the records.
```

**Why this is bad:**
- Uses future tense (wrong mood)
- Should use imperative mood
- "Going to add" sounds uncertain
- Not standard git convention

**Better version:**
```
feat: add CSV batch import for employees

Validates CSV structure and creates employee records.
Reports errors for invalid entries with line numbers.
```

---

## Example 12: Includes TODO/FIXME

```
feat: add CSV import (TODO: add better validation)

Basic CSV import working. FIXME: Need to add proper error messages.
NOTE: Performance might be slow with large files.
```

**Why this is bad:**
- TODOs/FIXMEs belong in code comments, not commits
- Incomplete feature should not be committed
- Uncertainty in commit message
- Sounds like work-in-progress

**Better version:**
Complete the feature first, then:
```
feat: add CSV batch import for employees

Validates CSV structure and field types.
Creates records in transaction with detailed error reporting.
Supports files up to 10,000 rows.
```

---

## Example 13: Jokes / Informal Language

```
fix: oops, forgot to check for null lol

Turns out checking if something exists before using it is important 😅
Who knew? Anyway, added null check so it doesn't crash anymore.
```

**Why this is bad:**
- Unprofessional tone
- Emojis in commit messages
- "lol", "oops", "who knew" are inappropriate
- Doesn't explain the actual problem
- Waste of time to read

**Better version:**
```
fix: prevent null pointer in provider status check

Status check now validates provider exists before accessing properties.
Previous code crashed when provider was deleted during check.
```

---

## Example 14: Includes Attribution (FORBIDDEN!)

```
feat: add API key management

Implemented new API key CRUD endpoints for user authentication management.

🤖 Generated with Claude Code (https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Why this is bad:**
- Claude Code attribution is STRICTLY FORBIDDEN
- Commits should be from the developer, not AI
- Breaks professional appearance
- Against skill instructions

**Correct version:**
```
feat: add API key management endpoints

Implements CRUD operations for API key lifecycle management.
Supports key creation, rotation, and revocation via REST API.
```

---

## Common Anti-Patterns to Avoid

### ❌ Redundant Phrases
- "This commit..."
- "This change..."
- "This patch..."
- "In this PR..."

### ❌ Weak Language
- "Hopefully fixes..."
- "Might improve..."
- "Tries to..."
- "Should work..."

### ❌ Unnecessary Details
- File names (git shows them)
- Function names (code shows them)
- Line numbers (irrelevant)
- Timestamps (git tracks them)

### ❌ Personal Comments
- Apologies
- Justifications
- Feelings
- Uncertainties

### ❌ Wrong Tense/Mood
- Past: "Added feature"
- Future: "Will add feature"
- Present continuous: "Adding feature"
- ✅ Correct: "Add feature" (imperative)

### ❌ Vague Terms
- "improve"
- "enhance"
- "optimize"
- "refactor"
(Without specifics)

### ❌ Marketing Speak
- "robust"
- "scalable"
- "enterprise-grade"
- "synergy"
- "leverage"

---

## How to Recognize Bad Commit Messages

### Red Flags:
1. **Over 200 words** → Too verbose
2. **Under 20 words** → Too vague
3. **Mentions Claude** → Forbidden attribution
4. **Lists file names** → Redundant
5. **Says "this commit"** → Redundant phrase
6. **Uses passive voice** → Weak writing
7. **Includes emojis** → Unprofessional
8. **Has TODO/FIXME** → Incomplete work
9. **Multiple topics** → Should be split
10. **Implementation details** → Too technical

### Good Smell:
1. **2-4 sentences** → Right length
2. **Imperative mood** → "Add", "Fix", "Remove"
3. **Specific components** → Names what changed
4. **Clear impact** → Explains why it matters
5. **Active voice** → Direct and clear
6. **No fluff** → Every word counts
7. **Professional tone** → No jokes or apologies
8. **Single topic** → Focused change
9. **No attribution** → Developer's work
10. **Measurable** → Includes metrics when relevant
