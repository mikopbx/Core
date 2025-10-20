# MikoPBX Development Skills

A collection of specialized skills for Claude Code to streamline MikoPBX development, testing, and maintenance workflows.

## Overview

These skills provide automated assistance for common development tasks in the MikoPBX PBX system:

- **Code Analysis**: Syntax-aware search and pattern matching
- **Testing**: Automated test generation and execution
- **Configuration**: Asterisk dialplan and config validation
- **Translation**: Multi-language localization management
- **Build Tools**: JavaScript transpilation and compilation

## Available Skills

### Development & Code Analysis
- **mikopbx-code-search** - Syntax-aware code search using ast-grep
- **mikopbx-babel-compile** - ES6+ to ES5 JavaScript transpilation

### Testing & Validation
- **mikopbx-api-test-generator** - Generate pytest tests for REST API endpoints
- **mikopbx-docker-restart-tester** - Container restart with automated testing
- **mikopbx-endpoint-validator** - OpenAPI schema compliance validation
- **asterisk-config-validator** - Asterisk configuration validation
- **asterisk-dialplan-tester** - Dialplan scenario testing

### Analysis & Debugging
- **mikopbx-log-analyzer** - Docker container log analysis
- **mikopbx-openapi-analyzer** - OpenAPI specification extraction
- **mikopbx-sqlite-inspector** - SQLite database verification and validation

### Utilities
- **mikopbx-translation-manager** - Multi-language translation management
- **mikopbx-commit-message** - Professional Git commit message generation

## Usage

Skills are automatically invoked by Claude Code based on the task context. Each skill directory contains a `SKILL.md` file with:
- YAML frontmatter (name, description)
- Detailed instructions and examples
- Best practices and workflows

## Structure

```
.claude/skills/
├── skill-name/
│   └── SKILL.md          # Skill definition with frontmatter
├── another-skill/
│   └── SKILL.md
└── README.md             # This file
```

## Documentation

For detailed information about each skill, see the individual `SKILL.md` files in each skill directory.

For more about Claude Code Skills:
- [Official Documentation](https://docs.claude.com/en/docs/claude-code/skills)
- [Skill Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)

## Version

Last updated: 2025-10-20

Reorganized to follow Claude Code Skills best practices with YAML frontmatter and proper directory structure.
