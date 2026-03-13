#!/usr/bin/env node

/**
 * PreToolUse hook: enforces code review before every git commit.
 *
 * When Claude attempts `git commit`, this hook checks for a review flag file.
 * If the flag is missing, the commit is blocked and Claude is instructed to
 * spawn a code-review agent first. After review, Claude sets the flag and
 * retries the commit.
 *
 * Flag file: .claude/.review-pass  (auto-deleted after successful commit)
 */

const fs = require('fs');
const path = require('path');

// Read stdin (PreToolUse hook input)
let inputData = {};
try {
    const stdin = fs.readFileSync(0, 'utf-8');
    inputData = JSON.parse(stdin);
} catch (e) {
    process.exit(0); // Can't parse input, don't block
}

const toolName = inputData.tool_name || '';
const toolInput = inputData.tool_input || {};

// Only intercept Bash tool calls
if (toolName !== 'Bash') {
    process.exit(0);
}

const command = (toolInput.command || '').trim();

// Detect git commit commands (but not git commit --amend with no other changes, etc.)
const isGitCommit = /\bgit\s+commit\b/.test(command);

if (!isGitCommit) {
    process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const flagFile = path.join(projectDir, '.claude', '.review-pass');

// Check if code review was already done
if (fs.existsSync(flagFile)) {
    // Review done — allow commit. Flag cleanup happens in post-commit-cleanup.js
    // (not here, because if the commit fails we don't want to lose the flag)
    process.exit(0);
}

// Block the commit and instruct Claude to run code review first
console.error(`[Pre-Commit Review] Code review required before committing.

You MUST run a code-review agent before committing. Follow these steps:

1. Run \`git diff --cached\` to see what's being committed (staged changes).
   If nothing is staged, run \`git diff\` to see unstaged changes.

2. Launch a code-review agent with the diff output, modified files list, and review focus areas.
   Example:
   Agent(subagent_type="code-review", prompt="Review the following changes for security, bugs, and code quality: <paste diff and file list>")

3. After the review completes and any critical issues are addressed, create the review pass flag:
   Write the file .claude/.review-pass with content "reviewed"

4. Then retry the git commit command.

Do NOT skip the review or create the flag file without actually running the code-review agent.`);

process.exit(2);
