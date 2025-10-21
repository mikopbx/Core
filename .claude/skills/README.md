# MikoPBX Development Skills

This directory contains specialized skills that extend Claude's capabilities for MikoPBX development. Skills activate automatically when you describe what you need in natural language.

## How Skills Work

**You don't need to explicitly invoke skills.** Just describe what you want:

```
✅ "Check if extension 201 was created in database"
✅ "Generate pytest tests for Extensions API"
✅ "Find all DataStructure classes"
✅ "Transpile extension-modify.js"
```

Claude automatically selects and uses the appropriate skill(s) based on your request.

## Available Skills (15)

### 🗄️ Database & API Testing

| Skill | Purpose |
|-------|---------|
| **mikopbx-sqlite-inspector** | Low-level database verification with schema reference |
| **mikopbx-sqlite-inspecting** | Quick database checks after API operations |
| **mikopbx-openapi-analyzing** | Extract and analyze OpenAPI 3.1.0 spec (259 endpoints) |
| **mikopbx-api-test-generating** | Generate comprehensive pytest tests for endpoints |
| **mikopbx-endpoint-validating** | Validate API compliance with OpenAPI and 7-phase pattern |

### 🐳 Container & Infrastructure

| Skill | Purpose |
|-------|---------|
| **mikopbx-container-inspector** | Get container IPs, ports, restart containers/workers |
| **mikopbx-log-analyzing** | Analyze logs for debugging (system, PHP, Asterisk, nginx) |
| **asterisk-config-validating** | Validate Asterisk configs and analyze logs |

### ✨ Code Quality & Style

| Skill | Purpose |
|-------|---------|
| **mikopbx-php-style** | PHP coding standards (PSR-1/4/12, PHP 8.3) |
| **mikopbx-js-style** | JavaScript standards (ES6+, Fomantic UI, jQuery) |
| **mikopbx-code-searching** | Syntax-aware search using ast-grep (not plain text grep) |
| **mikopbx-babel-compiling** | Transpile ES6+ JavaScript to ES5 via Docker |

### 🛠️ Development Tools

| Skill | Purpose |
|-------|---------|
| **mikopbx-translation-managing** | Manage translations across 29 languages (Russian-first) |
| **mikopbx-commit-message-generating** | Generate professional git commit messages |
| **asterisk-dialplan-testing** | Test dialplan scenarios and call flows |

## Common Usage Patterns

### API Development
```
"Create new API endpoint for queues"
→ Uses: mikopbx-php-style, mikopbx-api-test-generating, mikopbx-endpoint-validating
```

### Debugging Issues
```
"Extension 201 not working, help debug"
→ Uses: mikopbx-sqlite-inspecting, mikopbx-log-analyzing, asterisk-config-validating
```

### Frontend Development
```
"Add new settings page to admin interface"
→ Uses: mikopbx-js-style, mikopbx-babel-compiling, mikopbx-translation-managing
```

### Code Search & Refactoring
```
"Find all Worker classes in the codebase"
→ Uses: mikopbx-code-searching (with ast-grep)
```

## Skill Structure

Each skill directory contains:
- **SKILL.md** - Main skill instructions with YAML frontmatter
- **reference/** - Additional reference documentation
- **examples/** - Real-world usage examples
- **templates/** - Code/report templates
- **scripts/** - Helper scripts (if needed)

## Best Practices

### ✅ Do:
- Use natural language to describe what you need
- Let Claude choose the right skill automatically
- Combine multiple needs in one request (Claude uses multiple skills)

### ❌ Don't:
- Try to manually invoke skills (they activate automatically)
- Memorize skill names (not required)
- Repeat skill documentation in your requests

## Adding New Skills

1. Create directory: `.claude/skills/your-skill-name/`
2. Add `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: Your Skill Name
   description: What it does and when to use it (max 1024 chars)
   ---

   # Your Skill Name

   ## Instructions
   Clear step-by-step guidance for Claude...
   ```
3. Keep `SKILL.md` under 500 lines (use separate reference files for more)
4. Test with team members to verify activation

## Troubleshooting

**Skill doesn't activate?**
- Check YAML frontmatter syntax
- Ensure description is specific (includes trigger words)
- Verify file path: `.claude/skills/skill-name/SKILL.md`

**Need help with a specific skill?**
Each skill's SKILL.md contains complete documentation, examples, and troubleshooting guides.

## Team Sharing

These skills are project-level (committed to git). After `git pull`, all team members have access automatically.

```bash
git pull  # Skills automatically available
```

## Documentation

- **Main project guide**: `/Users/nb/PhpstormProjects/mikopbx/Core/CLAUDE.md`
- **Individual skill docs**: `.claude/skills/<skill-name>/SKILL.md`
- **Official docs**: https://docs.claude.com/en/docs/agents-and-tools/agent-skills

## Version

Last updated: 2025-01-21

Updated with complete skill inventory and usage guidelines following Claude Code Skills best practices.

---

**Questions?** Each SKILL.md contains detailed documentation, usage examples, and troubleshooting guides.
