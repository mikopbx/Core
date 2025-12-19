---
name: h-fix-skipped-tests-teamcity
branch: fix/skipped-tests-teamcity
status: in-progress
created: 2025-12-19
---

# Fix All Skipped Tests for TeamCity CI/CD

## Problem/Goal
При запуске тестов в TeamCity значительная часть тестов пропускается из-за hardcoded дат октября 2025 в CDR seed data.

## Success Criteria
- [x] **CDR seed данные с динамическими датами**
- [x] **Документация TeamCity** - README_TEAMCITY.md
- [x] **Исправлены CDR delete тесты**
- [ ] **Полный прогон в TeamCity**

## Work Log

### 2025-12-19: CDR Dynamic Dates + Delete Tests

**Commits:**
- `95fe5a918` - fix(cdr): dynamic date generation for CDR seed data
- `9421b2631` - fix(tests): handle CDR API response format in delete tests

**Files Created/Modified:**
- `tests/api/scripts/generate_cdr_fixtures.py` (new)
- `tests/api/scripts/seed_cdr_database.sh` (modified)
- `tests/api/test_00a_cdr_seed.py` (modified)
- `tests/api/test_43_cdr_delete.py` (modified)
- `tests/api/README_TEAMCITY.md` (new)

**Results:** CDR tests: 76 passed, 2 skipped (was 74 passed, 2 failed, 2 skipped)

## Remaining Work
1. Push branch `fix/skipped-tests-teamcity`
2. Test in TeamCity environment
