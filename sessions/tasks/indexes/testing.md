---
index: testing
name: Testing Infrastructure
description: Tasks related to test frameworks, test infrastructure, and testing tools for MikoPBX
---

# Testing Infrastructure

## Active Tasks

### High Priority
- `h-fix-api-test-failures/` - Fix 22 failed REST API tests to achieve 100% pass rate (CDR seeding, extensions, custom files, SIP providers)

### Medium Priority
- `m-refactor-api-tests-hardcoded-params.md` - Eliminate hardcoded paths, URLs, passwords in 9 Python API test files; use centralized config.py and api_client fixture

### Low Priority

### Investigate

## Completed Tasks
- `m-refactor-calls-tests.md` - Refactoring bash/PHP call flow integration tests (tests/Calls): deduplication, assertions, cleanup safety, WebM support (completed 2026-02-11)
- `h-implement-pjsua-python-swig.md` - Implement PJSUA with Python SWIG bindings to replace GoPhone for reliable VoIP testing (completed 2025-11-17)
- `h-fix-pjsua2-resource-leaks.md` - Fix PJSUA2 resource management issues (event handler, endpoint cleanup, future exceptions) (completed 2025-11-18)
