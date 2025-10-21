# mikopbx-js-style

Comprehensive JavaScript style guide skill for MikoPBX project following ES6+ standards and best practices.

## What This Skill Does

This skill validates and guides JavaScript code formatting according to:
- **ES6+ modern JavaScript** standards (const/let, arrow functions, template literals, destructuring)
- **MikoPBX project conventions** (module patterns, jQuery integration, API communication)
- **Fomantic-UI components** (dropdowns, modals, forms, tables)
- **Form validation patterns** (built-in and custom rules)

## Quick Start

Use this skill when:
- Writing new JavaScript code
- Reviewing pull requests
- Refactoring existing code
- Checking code style compliance
- Learning JavaScript best practices

## File Structure

- **[SKILL.md](SKILL.md)** - Main guide with essential patterns and quick reference
- **[ES6_FEATURES.md](ES6_FEATURES.md)** - Complete guide to modern JavaScript features
- **[FOMANTIC_UI.md](FOMANTIC_UI.md)** - Fomantic-UI component patterns and best practices
- **[PATTERNS.md](PATTERNS.md)** - Real-world patterns from MikoPBX codebase
- **[VALIDATION.md](VALIDATION.md)** - Comprehensive form validation guide

## Quick Checklist

Essential checks for JavaScript code:

- [ ] Module structure follows standard pattern
- [ ] Variables use const/let (never var)
- [ ] jQuery objects prefixed with $
- [ ] Arrow functions for callbacks
- [ ] Template literals for strings
- [ ] Strict equality (===)
- [ ] JSDoc comments present
- [ ] Error handling implemented
- [ ] Loading states shown
- [ ] Translations use globalTranslate

## Code Example

```javascript
/* global globalRootUrl, globalTranslate, PbxApi */

/**
 * Module description
 * @module moduleName
 */
const moduleName = {
    $mainElement: $('#main-element'),
    timeOut: 10000,

    initialize() {
        moduleName.initializeEventHandlers();
        moduleName.initializeUIComponents();
    },

    initializeEventHandlers() {
        moduleName.$mainElement.on('click', '.button', (e) => {
            e.preventDefault();
            moduleName.handleClick($(e.currentTarget));
        });
    },

    initializeUIComponents() {
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();
    }
};

$(document).ready(() => {
    moduleName.initialize();
});
```

## Key Principles

1. **Consistency** - Follow established patterns across the codebase
2. **Modern JavaScript** - Use ES6+ features for cleaner code
3. **Proper jQuery** - Cache selectors, use event delegation
4. **Component Management** - Initialize and re-initialize UI components correctly
5. **Error Handling** - Always handle errors gracefully with user feedback
6. **Performance** - Optimize with caching, debouncing, proper event handling

## Integration

This skill replaces the previous `sites/admin-cabinet/assets/js/JS-STYLE-GUIDE.md` document.

References in the project:
- `CLAUDE.md` - Main project guide
- `src/AdminCabinet/CLAUDE.md` - AdminCabinet development guide

## Statistics

- **Total lines**: 3,762
- **Main file (SKILL.md)**: 622 lines
- **Reference files**: 5 comprehensive guides
- **Real-world examples**: 50+ patterns from actual codebase

## Best Practices Covered

- Module structure and initialization
- ES6+ features (const/let, arrow functions, destructuring, spread/rest)
- jQuery patterns (caching, event delegation, chaining)
- Fomantic-UI components (dropdowns, modals, forms, tables)
- API communication (callbacks, error handling, loading states)
- Form validation (built-in rules, custom rules, complex scenarios)
- State management and storage
- Event bus integration
- Performance optimization (debouncing, throttling)

## Created

2025-10-21 - Based on best practices from Claude Agent Skills documentation
