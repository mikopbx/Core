#!/usr/bin/env node

/**
 * PostToolUse hook: cleans up pre-commit flag files after successful git commit.
 *
 * Deletes .claude/.review-pass and .claude/.translations-pass only after
 * the git commit Bash command succeeds. This prevents losing flags when
 * a commit fails (e.g. merge conflict, git hook failure).
 */

const fs = require('fs');
const path = require('path');

let inputData = {};
try {
    const stdin = fs.readFileSync(0, 'utf-8');
    inputData = JSON.parse(stdin);
} catch (e) {
    process.exit(0);
}

const toolName = inputData.tool_name || '';
const toolInput = inputData.tool_input || {};
const toolResult = inputData.tool_result || {};

// Only handle successful Bash git commit calls
if (toolName !== 'Bash') {
    process.exit(0);
}

const command = (toolInput.command || '').trim();
if (!/\bgit\s+commit\b/.test(command)) {
    process.exit(0);
}

// Check if the command succeeded (exit code 0, no error)
const isError = toolResult.is_error === true;
if (isError) {
    process.exit(0); // Commit failed — keep flags intact
}

// Commit succeeded — clean up flag files
const projectDir = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const flags = [
    path.join(projectDir, '.claude', '.review-pass'),
    path.join(projectDir, '.claude', '.translations-pass'),
];

for (const flag of flags) {
    try {
        if (fs.existsSync(flag)) {
            fs.unlinkSync(flag);
        }
    } catch (e) {
        // Ignore cleanup errors
    }
}

process.exit(0);
