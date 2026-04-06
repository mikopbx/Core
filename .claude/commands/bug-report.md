---
allowed-tools: Bash(gh issue:*), Bash(git:*), FileSystemWrite, FileSystemRead
description: Create bug report for mikopbx/core with structured format
---

## Task: Create Bug Report

Based on the bug description: $ARGUMENTS

Please create a bug report for the mikopbx/core repository.

### Requirements:

1. Analyze the bug description
2. Create a structured bug report with:
   - Clear English title
   - Bilingual description (English and Russian)
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Bug Report Template:

```markdown
# Bug Report: [Bug Title]

## Title
[Clear English title describing the bug]

## Description

### English Description

**Summary:**
[Brief description of the bug]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- MikoPBX Version: [version]
- PHP Version: [if relevant]
- Browser: [if UI bug]
- OS: [if relevant]

**Additional Information:**
- Error logs (if available)
- Screenshots (if UI bug)
- Related issues

**Possible Solution:**
[If you have ideas on how to fix]

---

### Русское описание

**Краткое описание:**
[Краткое описание бага]

**Шаги для воспроизведения:**
1. [Шаг 1]
2. [Шаг 2]
3. [Шаг 3]
...

**Ожидаемое поведение:**
[Что должно происходить]

**Фактическое поведение:**
[Что происходит на самом деле]

**Окружение:**
- Версия MikoPBX: [версия]
- Версия PHP: [если актуально]
- Браузер: [если баг UI]
- ОС: [если актуально]

**Дополнительная информация:**
- Логи ошибок (если доступны)
- Скриншоты (если баг UI)
- Связанные issues

**Возможное решение:**
[Если есть идеи по исправлению]

---

### Labels
- bug

### Severity
- [ ] Critical (system crash, data loss)
- [ ] Major (feature broken, no workaround)
- [ ] Minor (feature broken, workaround exists)
- [ ] Trivial (cosmetic issue)
```

### Actions:
1. Create the bug report content
2. Save to `bug-report-[timestamp].md`
3. Create GitHub issue using CLI
4. Provide the issue URL