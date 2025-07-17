---
allowed-tools: Bash(gh issue:*), Bash(git:*), FileSystemWrite, FileSystemEdit
description: Create GitHub issue for mikopbx/core with English title and bilingual description
---

## Task: Create GitHub Issue

Based on the description: $ARGUMENTS

Please create a GitHub issue for the mikopbx/core repository following this structure:

### Requirements:

1. **Title**: Must be in English, clear and concise (50-100 characters)
2. **Description**: Must include both English and Russian sections
3. **Structure**: Follow the template below

### Template Structure:

```markdown
# GitHub Issue: [Feature/Bug/Enhancement Title]

## Title
[Clear English title that summarizes the issue]

## Description

### English Description

[Detailed description in English including:]
- Current situation/problem
- Proposed solution or expected behavior
- Technical details if applicable
- Benefits and impact

#### Current Implementation Overview (if applicable)
- ✅ What currently works
- ❌ What doesn't work or is missing

#### Proposed Changes/Solution
[Detailed list of proposed changes]

#### Benefits
- [List of benefits]

---

### Русское описание

[Полное описание на русском языке, включая:]
- Текущая ситуация/проблема
- Предлагаемое решение или ожидаемое поведение
- Технические детали, если применимо
- Преимущества и влияние

#### Обзор текущей реализации (если применимо)
- ✅ Что в данный момент работает
- ❌ Что не работает или отсутствует

#### Предлагаемые изменения/решение
[Подробный список предлагаемых изменений]

#### Преимущества
- [Список преимуществ]

---

### Labels
[Suggest appropriate labels based on the issue type]

### Milestone
[Suggest appropriate milestone]
```

### Steps to complete:

1. Parse the user's description and understand the context
2. Generate an appropriate English title
3. Create a comprehensive description in both languages
4. Save the issue content to a file `github-issue-[timestamp].md` in the project root
5. Use GitHub CLI to create the issue:
   ```bash
   gh issue create --repo mikopbx/core --title "[Title]" --body-file github-issue-[timestamp].md
   ```
6. Show the created issue URL to the user

### Additional Guidelines:

- Keep technical terminology consistent between English and Russian versions
- Use clear, professional language in both sections
- Include code examples where relevant
- Reference related issues or PRs if applicable
- Consider the impact on different user groups
- Include testing requirements for bugs
- Suggest acceptance criteria for features

### Common Label Categories:
- **Type**: bug, enhancement, feature, documentation
- **Component**: core, ui, api, providers, extensions
- **Priority**: critical, high, medium, low
- **Status**: needs-triage, confirmed, in-progress

Remember to analyze the description carefully and create a well-structured issue that will be helpful for developers and project maintainers.