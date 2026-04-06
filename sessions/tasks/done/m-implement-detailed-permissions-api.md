---
name: m-implement-detailed-permissions-api
branch: feature/detailed-permissions-api
status: completed
created: 2025-12-02
completed: 2025-12-03
submodules: [ModuleUsersUI]
---

# Implement Detailed Permissions API Endpoint

## Problem/Goal
ModuleUsersUI uses fragile local code parsing to build ACL tree by scanning controllers
and parsing Phalcon annotations. This breaks when Core changes controller patterns
(e.g., migrating from Phalcon Annotations to PHP 8 Attributes).

Create a centralized API endpoint `getDetailedPermissions` in Core that returns
comprehensive controller/action structure for building ACL tree.

## Success Criteria
- [x] New API endpoint `GET /pbxcore/api/v3/openapi:getDetailedPermissions`
- [x] Returns categories (AdminCabinet, PBX_CORE_REST, modules) with controllers/actions
- [x] Returns excluded rules (alwaysAllowed, alwaysDenied, linkedActions)
- [x] Tests pass for new endpoint
- [x] ModuleUsersUI refactored to use new API via PBXCoreRESTClientProvider
- [x] ModuleUsersUI EndpointConstants.php updated to v3 API
- [x] ModuleUsersUI CoreACL.php updated with new endpoint references
- [x] ModuleUsersUI module.json updated with min_pbx_version 2025.1.1
- [x] Separate module REST v3 endpoints from PBX_CORE_REST into module categories

## Context Manifest
### Critical Files
- `src/PBXCoreREST/Lib/OpenAPI/GetDetailedPermissionsAction.php` - Main action class
- `src/PBXCoreREST/Lib/OpenAPIManagementProcessor.php` - Action registration
- `src/PBXCoreREST/Controllers/OpenAPI/RestController.php` - Route definition
- `Extensions/ModuleUsersUI/App/Controllers/AccessGroupsRightsController.php` - Consumer to refactor

### Key Patterns
- PHP 8 Attributes for REST API (Pattern 4)
- Direct action call via `GetDetailedPermissionsAction::main()`
- ACL tree structure expected by ModuleUsersUI UI

## User Notes
Task originated from context-summary indicating need for centralized permissions API.

## Work Log

### 2025-12-02
**Completed:**
- Created `GetDetailedPermissionsAction` with comprehensive controller scanning:
  - AdminCabinet controllers (MVC pattern)
  - REST API controllers (PHP 8 Attributes)
  - Module APP controllers
  - Module REST controllers (Pattern 2 and Pattern 4)
- Registered action in `OpenAPIManagementProcessor`
- Added route `GET /pbxcore/api/v3/openapi:getDetailedPermissions`
- Added translations (en/ru) for endpoint
- Fixed import: replaced `Phalcon\Text` with `MikoPBX\Common\Library\Text`

### 2025-12-03
**Completed:**
- Refactored ModuleUsersUI to consume new API:
  - Updated `AccessGroupsRightsController` to use `PBXCoreRESTClientProvider`
  - Updated `EndpointConstants.php` with v3 API endpoints
  - Updated `CoreACL.php` with new endpoint references
  - Updated `module.json` min_pbx_version to 2025.1.1
- Implemented Module REST v3 endpoint separation:
  - Added `extractModuleIdFromClass()` for module detection by namespace
  - Modified `scanRestApiControllers()` to separate Core/Module endpoints
  - Module Pattern 4 endpoints now grouped under module categories (not PBX_CORE_REST)
  - Result: 45 Core endpoints in PBX_CORE_REST, module endpoints in respective module categories

### 2025-12-04
**Code Review & Completion:**
- Removed 'excluded' field from API response (ModuleUsersUI maintains exclusion rules locally)
- Added `CriticalErrorsHandler::handleExceptionWithSyslog()` for proper error logging
- Added documentation for Pattern 2 wildcard '*' actions (Phalcon Annotations limitation)
- Fixed array merging: use `+` operator to prevent key collisions during defensive merges
- Unified response structure: added 'label' field to all controller types (APP and REST)
- Updated test `test_13_get_detailed_permissions` to remove 'excluded' field assertions
- Fixed translation descriptions: removed "exclusion rules" mention from en/ru RestApi.php
- All tests passing (259 endpoints)
- Task completed and committed
