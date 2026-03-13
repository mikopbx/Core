#!/usr/bin/env node

/**
 * PreToolUse hook: validates translation files before git commit.
 *
 * When Claude attempts `git commit` and staged files include any translation
 * file from src/Common/Messages/, this hook:
 *   1. Parses all translation PHP files for all languages
 *   2. Checks that every language has the same keys per file (using ru as source of truth)
 *   3. Detects quote escaping problems (unescaped single quotes in values)
 *   4. Detects broken PHP syntax (unclosed strings, missing commas, etc.)
 *   5. Reports all issues and blocks the commit
 *
 * Flag file: .claude/.translations-pass (auto-deleted after successful commit)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Read stdin (PreToolUse hook input) ---
let inputData = {};
try {
    const stdin = fs.readFileSync(0, 'utf-8');
    inputData = JSON.parse(stdin);
} catch (e) {
    process.exit(0);
}

const toolName = inputData.tool_name || '';
const toolInput = inputData.tool_input || {};

if (toolName !== 'Bash') {
    process.exit(0);
}

const command = (toolInput.command || '').trim();
const isGitCommit = /\bgit\s+commit\b/.test(command);

if (!isGitCommit) {
    process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const flagFile = path.join(projectDir, '.claude', '.translations-pass');

// Check if validation was already done
if (fs.existsSync(flagFile)) {
    // Allow commit. Flag cleanup happens in post-commit-cleanup.js
    process.exit(0);
}

// --- Check if any translation files are staged ---
const messagesDir = 'src/Common/Messages/';
let stagedFiles = [];
try {
    const output = execSync('git diff --cached --name-only', {
        cwd: projectDir,
        encoding: 'utf-8',
        timeout: 5000,
    });
    stagedFiles = output.trim().split('\n').filter(f => f.startsWith(messagesDir));
} catch (e) {
    // Can't check staged files, don't block
    process.exit(0);
}

if (stagedFiles.length === 0) {
    // No translation files staged — nothing to validate
    process.exit(0);
}

// --- Determine which translation file basenames were modified ---
const modifiedBasenames = new Set();
for (const f of stagedFiles) {
    // f = "src/Common/Messages/en/Common.php"
    const basename = path.basename(f); // "Common.php"
    if (basename.endsWith('.php')) {
        modifiedBasenames.add(basename);
    }
}

if (modifiedBasenames.size === 0) {
    process.exit(0);
}

// --- Configuration ---
const MESSAGES_PATH = path.join(projectDir, messagesDir);

const ALL_LANGUAGES = [
    'az', 'cs', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'hr',
    'hu', 'it', 'ja', 'ka', 'nl', 'pl', 'pt', 'pt_BR', 'ro', 'ru',
    'sv', 'th', 'tr', 'uk', 'vi', 'zh_Hans',
];

const SOURCE_LANG = 'ru';

// --- PHP array key extractor ---
// Parses PHP translation files to extract keys and detect quote issues.
// Handles multiline values (values that span multiple lines).

/**
 * Parse a PHP translation file.
 * Returns { keys: Set<string>, errors: string[] }
 */
function parseTranslationFile(filePath) {
    const keys = new Set();
    const errors = [];
    let content;

    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        errors.push(`Cannot read file: ${e.message}`);
        return { keys, errors };
    }

    // Find the array content between "return [" and "];"
    const arrayStart = content.indexOf('return [');
    if (arrayStart === -1) {
        errors.push('Missing "return [" — not a valid translation file');
        return { keys, errors };
    }

    // Use a character-by-character state machine to parse key => value pairs
    // This correctly handles multiline values and escaped quotes
    const src = content.substring(arrayStart + 'return ['.length);
    let pos = 0;

    function lineAt(p) {
        // Count newlines in content up to position (arrayStart offset + 'return ['.length + p)
        const absPos = arrayStart + 'return ['.length + p;
        let line = 1;
        for (let i = 0; i < absPos && i < content.length; i++) {
            if (content[i] === '\n') line++;
        }
        return line;
    }

    function skipWhitespaceAndComments() {
        while (pos < src.length) {
            // Skip whitespace
            if (/\s/.test(src[pos])) { pos++; continue; }
            // Skip // line comments
            if (src[pos] === '/' && src[pos + 1] === '/') {
                while (pos < src.length && src[pos] !== '\n') pos++;
                continue;
            }
            // Skip /* block comments */
            if (src[pos] === '/' && src[pos + 1] === '*') {
                pos += 2;
                while (pos < src.length - 1 && !(src[pos] === '*' && src[pos + 1] === '/')) pos++;
                pos += 2;
                continue;
            }
            break;
        }
    }

    /**
     * Read a quoted string starting at current pos.
     * Returns { value: string, closed: boolean, startLine: number }
     * Advances pos past the closing quote.
     */
    function readQuotedString() {
        const quote = src[pos];
        const startLine = lineAt(pos);
        pos++; // skip opening quote
        let value = '';

        while (pos < src.length) {
            if (src[pos] === '\\') {
                // Escaped character
                if (pos + 1 < src.length) {
                    value += src[pos] + src[pos + 1];
                    pos += 2;
                } else {
                    pos++;
                }
                continue;
            }
            if (src[pos] === quote) {
                // Closing quote found
                pos++; // skip closing quote
                return { value, closed: true, startLine };
            }
            value += src[pos];
            pos++;
        }

        // Reached end without closing quote
        return { value, closed: false, startLine };
    }

    while (pos < src.length) {
        skipWhitespaceAndComments();

        // Check for end of array
        if (pos >= src.length || src[pos] === ']') break;

        // Expect a quoted key
        if (src[pos] !== "'" && src[pos] !== '"') {
            pos++;
            continue;
        }

        const keyStartLine = lineAt(pos);
        const keyResult = readQuotedString();
        if (!keyResult.closed) {
            errors.push(`Line ${keyStartLine}: Unclosed key string`);
            break; // Can't recover from unclosed key
        }

        const key = keyResult.value.replace(/\\'/g, "'").replace(/\\"/g, '"');
        keys.add(key);

        // Expect =>
        skipWhitespaceAndComments();
        if (src[pos] === '=' && src[pos + 1] === '>') {
            pos += 2;
        } else {
            // Malformed entry, skip
            continue;
        }

        // Expect quoted value
        skipWhitespaceAndComments();
        if (src[pos] !== "'" && src[pos] !== '"') {
            // Non-string value (number, constant) — skip until comma or ]
            while (pos < src.length && src[pos] !== ',' && src[pos] !== ']') pos++;
            if (src[pos] === ',') pos++;
            continue;
        }

        const valueQuote = src[pos];
        const valueStartLine = lineAt(pos);
        const valueResult = readQuotedString();

        if (!valueResult.closed) {
            errors.push(
                `Line ${valueStartLine}: Unclosed ${valueQuote === "'" ? 'single' : 'double'}-quoted string for key '${key}'`
            );
            break; // Can't reliably recover
        }

        // Skip trailing comma
        skipWhitespaceAndComments();
        if (pos < src.length && src[pos] === ',') pos++;
    }

    // --- Additional validation: use PHP lint if available ---
    // Quick sanity check: ensure file is valid PHP
    try {
        const result = execSync(`php -l "${filePath}" 2>&1`, {
            encoding: 'utf-8',
            timeout: 5000,
        });
        if (!result.includes('No syntax errors')) {
            // Extract error message
            const errorLine = result.split('\n').find(l => l.includes('error'));
            if (errorLine) {
                errors.push(`PHP syntax error: ${errorLine.trim()}`);
            }
        }
    } catch (e) {
        // php -l returned non-zero — syntax error
        const output = (e.stdout || '') + (e.stderr || '');
        const errorLine = output.split('\n').find(l => l.includes('error'));
        if (errorLine) {
            errors.push(`PHP syntax error: ${errorLine.trim()}`);
        }
    }

    return { keys, errors };
}

// --- Run validation ---
const allErrors = [];

for (const basename of modifiedBasenames) {
    // Parse source language (Russian) as the reference
    const sourceFile = path.join(MESSAGES_PATH, SOURCE_LANG, basename);
    if (!fs.existsSync(sourceFile)) {
        allErrors.push(`[${basename}] Source file missing: ${SOURCE_LANG}/${basename}`);
        continue;
    }

    const sourceResult = parseTranslationFile(sourceFile);
    if (sourceResult.errors.length > 0) {
        for (const err of sourceResult.errors) {
            allErrors.push(`[${SOURCE_LANG}/${basename}] ${err}`);
        }
    }

    const sourceKeys = sourceResult.keys;

    // Check every language against source
    for (const lang of ALL_LANGUAGES) {
        if (lang === SOURCE_LANG) continue;

        const langFile = path.join(MESSAGES_PATH, lang, basename);
        if (!fs.existsSync(langFile)) {
            allErrors.push(`[${basename}] File missing for language: ${lang}/${basename}`);
            continue;
        }

        const langResult = parseTranslationFile(langFile);

        // Report parse/quote errors
        for (const err of langResult.errors) {
            allErrors.push(`[${lang}/${basename}] ${err}`);
        }

        // Check for missing keys (in source but not in this language)
        const missingKeys = [];
        for (const key of sourceKeys) {
            if (!langResult.keys.has(key)) {
                missingKeys.push(key);
            }
        }
        if (missingKeys.length > 0) {
            allErrors.push(
                `[${lang}/${basename}] Missing ${missingKeys.length} key(s) present in ${SOURCE_LANG}: ` +
                missingKeys.slice(0, 5).map(k => `'${k}'`).join(', ') +
                (missingKeys.length > 5 ? `, ... and ${missingKeys.length - 5} more` : '')
            );
        }

        // Check for extra keys (in this language but not in source)
        const extraKeys = [];
        for (const key of langResult.keys) {
            if (!sourceKeys.has(key)) {
                extraKeys.push(key);
            }
        }
        if (extraKeys.length > 0) {
            allErrors.push(
                `[${lang}/${basename}] Has ${extraKeys.length} extra key(s) not in ${SOURCE_LANG}: ` +
                extraKeys.slice(0, 5).map(k => `'${k}'`).join(', ') +
                (extraKeys.length > 5 ? `, ... and ${extraKeys.length - 5} more` : '')
            );
        }
    }
}

// --- Output results ---
if (allErrors.length === 0) {
    // All good — allow commit
    process.exit(0);
}

// Build error report
const errorReport = allErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');

console.error(`[Pre-Commit Translations] Found ${allErrors.length} issue(s) in translation files.

Modified translation files: ${[...modifiedBasenames].join(', ')}

Issues:
${errorReport}

To fix these issues:
1. For missing keys — add the missing translations to the corresponding language file.
   Use the "translations" skill: add translations for all languages.
2. For quote errors — escape single quotes with \\' inside single-quoted PHP strings.
   Example: 'It\\'s working' instead of 'It's working'
3. For extra keys — remove keys that don't exist in the Russian (source) file,
   or add them to the Russian file first if they're legitimate new translations.

After fixing all issues, create the validation pass flag:
  Write the file .claude/.translations-pass with content "validated"

Then retry the git commit command.`);

process.exit(2);
