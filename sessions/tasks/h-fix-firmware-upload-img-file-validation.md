---
name: h-fix-firmware-upload-img-file-validation
branch: fix/h-fix-firmware-upload-img-file-validation
status: pending
created: 2026-01-19
---

# Fix Firmware Upload .img File Validation Error

## Problem/Goal

After updating to version 2025.1.130, firmware updates using .img files are rejected by the web interface with an alert message about unsupported file format. This is a regression that blocks users from performing firmware updates.

**Symptoms:**
- User uploads .img firmware file through web interface
- JavaScript validation shows alert: file not supported
- Firmware update process cannot proceed

**Impact:**
- Critical regression blocking all firmware updates via web interface
- Affects production systems that need security/feature updates
- Workaround may exist via CLI but web UI is primary update method

**Investigation Focus:**
- JavaScript file upload validation code in web interface
- Changes introduced in or around version 2025.1.130
- File extension/MIME type validation logic
- Possible changes to accepted file formats

## Success Criteria
- [ ] .img files are accepted by JavaScript validation (no alert about unsupported file)
- [ ] Firmware upload process completes successfully with .img files
- [ ] Root cause identified: specific code change that introduced the regression
- [ ] Fix verified on version 2025.1.130 or later
- [ ] No regression with other supported firmware file formats (.gz, .iso, etc.)
- [ ] Code changes documented in commit explaining what validation logic was incorrect

## Context Manifest
<!-- Added by context-gathering agent -->

## User Notes

### Error Screenshot Provided

Error message from web interface:
```
mikopbx-2025.1.132-dev-x86_64-legacy.img has type not allowed, please upload files of type *.
```

**Key Observation:** The error says "upload files of type *" (meaning ANY type should be allowed), yet it rejects the .img file. This is contradictory and points to a validation logic bug.

**Initial Code Analysis:**

Found in `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/PbxAPI/files-api.js:232`:
```javascript
FilesAPI.uploadFile = function(file, callback, allowedFileTypes = ['*']) {
    const r = new Resumable(this.configureResumable({
        fileType: allowedFileTypes
    }));
```

The default `allowedFileTypes = ['*']` should allow all file types, but Resumable.js validation is rejecting .img files.

**Suspected Root Cause:**
- Recent refactoring commits changed how fileType is passed to Resumable.js
- Commit `377b2acdc` - "refactor: restructure file management API and update test suite"
- The `fileType: ['*']` syntax may not work correctly with Resumable.js validation
- Need to investigate how Resumable.js interprets the wildcard `*` vs actual file extensions

## Work Log
<!-- Updated as work progresses -->
- [YYYY-MM-DD] Started task, initial research
