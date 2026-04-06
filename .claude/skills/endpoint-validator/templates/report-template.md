# API Endpoint Validation Report Template

Copy and customize this template for validation reports.

---

## 📋 API Endpoint Validation Report

**Date**: {DATE}
**Endpoint**: {HTTP_METHOD} {API_PATH}
**Resource**: {RESOURCE_NAME}
**Validator**: {VALIDATOR_NAME}

---

## 📂 Files Analyzed

- ✅ **DataStructure.php**: `{PATH_TO_DATASTRUCTURE}`
- ✅ **SaveRecordAction.php**: `{PATH_TO_SAVEACTION}`
- ✅ **GetRecordAction.php**: `{PATH_TO_GETACTION}` *(if applicable)*

---

## 🔍 DataStructure Analysis

### ✅ Structure Compliance

- {✅/❌} Has `getParameterDefinitions()` method
- {✅/❌} Has `request` section with {N} parameters
- {✅/❌} Has `response` section with {N} parameters
- {✅/❌} Has `getRelatedSchemas()` method
- {✅/❌} Does NOT have legacy `getParametersConfig()` method

### ✅ Request Parameters ({N} total)

- {✅/❌} All have `type` defined
- {✅/❌} All have `description` defined
- {✅/❌} All have `example` defined
- {✅/❌} All have `required` flag defined

#### ⚠️ Missing Validation Constraints

{List parameters missing constraints, or "None - all parameters have appropriate constraints"}

**DataStructure Score**: {SCORE}/100 {✅/⚠️/❌}

---

## 🔍 SaveRecordAction Analysis

### ✅ Structure Compliance

- {✅/❌} Follows 7-phase processing pattern
- {✅/❌} Uses `DataStructure::getParameterDefinitions()`
- {✅/❌} Detects HTTP method (POST/PUT/PATCH/DELETE)
- {✅/❌} Loads existing record for PUT/PATCH/DELETE

### ❌ CRITICAL ISSUES

{List critical issues, or "None - implementation is compliant"}

**SaveRecordAction Score**: {SCORE}/100 {✅/⚠️/❌}

---

## 📊 Overall Compliance Score

**Total Score: {TOTAL_SCORE}/100** {✅/⚠️/❌}

**Status**:
- ✅ 90-100: Excellent - Ready for production
- ⚠️ 70-89: Good - Minor improvements needed
- ❌ <70: Needs Work - Critical issues must be fixed

---

## ✅ Recommendations

### 🔴 CRITICAL (Must Fix)
{List critical recommendations}

### 🟡 HIGH PRIORITY (Should Fix)
{List high priority recommendations}

### 🟢 MEDIUM PRIORITY (Nice to Have)
{List medium priority recommendations}

---

✅ Report generated: {TIMESTAMP}
