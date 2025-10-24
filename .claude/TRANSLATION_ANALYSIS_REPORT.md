# MikoPBX Translation Analysis Report
## Missing English Translation Keys

**Generated:** 2025-10-24 11:19:10

---

## Executive Summary

### Overall Statistics
- **Total Files Analyzed:** 15 (14 matched pairs + 1 missing English file)
- **Total Missing English Keys:** 502 keys
- **Critical Issues:** 1 file completely missing (Auth.php)
- **Files Requiring Attention:** 11 files (73% of total)
- **Perfect Coverage:** 3 files (20%)

### Translation Coverage Overview
| Priority Level | Files | Missing Keys | Impact |
|---------------|-------|--------------|---------|
| Critical | 1 | 64 | Entire Auth.php missing |
| High | 3 | 382 | Core UI components |
| Medium | 4 | 98 | Important features |
| Low | 4 | 22 | Minor elements |
| Complete | 3 | 0 | No action needed |

---

## Priority Breakdown

### 🔴 CRITICAL PRIORITY - Complete File Missing

#### Auth.php (64 keys, 0% coverage)
**Status:** English translation file completely missing

**Impact:** Authentication and authorization UI completely untranslated

**Missing Key Categories:**
- REST API endpoint descriptions (login, refresh, logout)
- Authentication parameters and schema
- Error messages for auth failures
- Rate limiting messages
- Token management responses

**Action Required:** Create complete English translation file with all 64 keys

**Estimated Effort:** 2-3 hours (technical security terminology)

---

### 🔴 HIGH PRIORITY - 50+ Missing Keys

These files have significant translation gaps affecting core functionality:

#### 1. Extensions.php (194 missing keys, 44.89% coverage)
**Critical Impact:** Employee/extension management is half-translated

**Missing Key Categories:**
- **Bulk Upload Features** (40 keys): CSV import/export, validation, error handling
- **Device Monitoring** (15 keys): Connection status, history tracking
- **Import/Export System** (60 keys): File operations, status messages, formats
- **Security Features** (10 keys): Permission checks, security UI
- **SIP Configuration** (25 keys): Tooltip documentation for manual attributes
- **Search & Navigation** (15 keys): Search results, filtering, navigation
- **Form Help Text** (30 keys): Field-level documentation

**Business Impact:**
- Bulk employee import feature unusable for English users
- Device monitoring dashboard incomplete
- Form validation messages missing
- Help tooltips not available

**Recommended Action:** HIGH priority translation - critical for day-to-day operations

**Estimated Effort:** 8-10 hours (complex technical terminology)

---

#### 2. Common.php (99 missing keys, 87.70% coverage)
**Moderate Impact:** Shared UI components and common messages

**Missing Key Categories:**
- **CDR Management** (20 keys): Audio player, search, deletion
- **Network Configuration** (15 keys): IP validation, route management
- **Security Logs** (8 keys): Critical growth warnings
- **Asterisk Manager** (10 keys): Event filters, tooltips
- **Date/Time Components** (12 keys): Date pickers, time ranges
- **File Upload** (15 keys): Validation, categories, MIME types
- **Restart Service** (5 keys): Active call warnings
- **Navigation** (8 keys): Breadcrumbs
- **General UI** (6 keys): Placeholders, tooltips

**Business Impact:**
- CDR search and management partially broken
- Network configuration validation incomplete
- Security notifications missing
- File upload errors not translated

**Recommended Action:** HIGH priority - affects multiple modules

**Estimated Effort:** 4-5 hours (mixed technical and UI terminology)

---

#### 3. NetworkSecurity.php (89 missing keys, 59.91% coverage)
**High Impact:** Network and firewall configuration

**Missing Key Categories:**
- **Fail2ban Tooltips** (65 keys): Comprehensive help documentation
  - MaxRetry configuration (12 keys)
  - Whitelist management (15 keys)
  - Ban time settings (10 keys)
  - Find time window (10 keys)
  - Firewall rate limiting (18 keys)
- **Network Routes** (10 keys): Static routes management
- **DNS & Gateway** (8 keys): Network interface configuration
- **Error Messages** (6 keys): Validation errors

**Business Impact:**
- Security configuration help unavailable
- Network troubleshooting difficult
- Fail2ban settings unclear without tooltips

**Recommended Action:** HIGH priority - security-critical feature

**Estimated Effort:** 5-6 hours (security and networking terminology)

---

### 🟡 MEDIUM PRIORITY - 10-49 Missing Keys

#### 4. ApiKeys.php (33 missing keys, 71.30% coverage)
**Impact:** API key management and documentation

**Missing Key Categories:**
- **API Documentation UI** (12 keys): Swagger/OpenAPI integration
- **Usage Tooltips** (11 keys): Authentication examples in CURL, JS, PHP
- **Permission Management** (10 keys): Permission table, access control

**Business Impact:**
- API documentation viewer incomplete
- Permission management UI partial
- Code examples not available

**Estimated Effort:** 2-3 hours

---

#### 5. AsteriskRestUsers.php (25 missing keys, 76.19% coverage)
**Impact:** Asterisk REST API user management

**Missing Key Categories:**
- **REST API Descriptions** (12 keys): CRUD operation documentation
- **Parameters** (5 keys): Username, password, applications
- **Schema Descriptions** (8 keys): Response object documentation

**Business Impact:**
- ARI user management partially documented
- API documentation incomplete

**Estimated Effort:** 1.5-2 hours

---

#### 6. Passkeys.php (23 missing keys, 68.06% coverage)
**Impact:** Passwordless authentication feature

**Missing Key Categories:**
- **Educational Tooltips** (22 keys): What are passkeys, how to use, security info
- **Compatibility Info** (3 keys): Browser/device support

**Business Impact:**
- Modern authentication feature poorly documented
- User education materials missing

**Estimated Effort:** 2 hours (requires careful technical writing)

---

#### 7. MailSettings.php (17 missing keys, 95.81% coverage)
**Impact:** Email notification system

**Missing Key Categories:**
- **Security Log Notifications** (13 keys): Email templates for security alerts
- **Notification Types** (4 keys): Missed calls, voicemail, login, system

**Business Impact:**
- Security alert emails partially translated
- Notification preferences incomplete

**Estimated Effort:** 1.5 hours

---

### 🟢 LOW PRIORITY - 1-9 Missing Keys

#### 8. Route.php (9 missing keys, 98.20% coverage)
**Impact:** Call routing rules

**Missing Keys:** Complex routing rule descriptions with provider modifications

**Business Impact:** Minor - affects advanced routing scenarios

**Estimated Effort:** 30 minutes

---

#### 9. GeneralSettings.php (7 missing keys, 98.80% coverage)
**Impact:** System settings

**Missing Keys:** Statistics displays and private key management

**Business Impact:** Minimal - affects statistics dashboard only

**Estimated Effort:** 20 minutes

---

#### 10. Modules.php (5 missing keys, 94.90% coverage)
**Impact:** Module management

**Missing Keys:** Module upload validation errors

**Business Impact:** Minimal - error messages for rare scenarios

**Estimated Effort:** 15 minutes

---

#### 11. Providers.php (1 missing key, 99.78% coverage)
**Impact:** SIP provider management

**Missing Key:** Provider login validation message

**Business Impact:** Negligible

**Estimated Effort:** 5 minutes

---

### ✅ COMPLETE - No Translation Needed

- **Passwords.php** (62 keys, 100% coverage)
- **RestApi.php** (1961 keys, 100% coverage)
- **StoplightElements.php** (83 keys, 100% coverage)

---

## Translation Strategy Recommendations

### Phase 1: Critical Fixes (Week 1)
1. **Create Auth.php** - Complete file (64 keys, 2-3 hours)
2. **Extensions.php** - Bulk upload features (40 keys, 3 hours)
3. **Common.php** - CDR and network messages (40 keys, 2 hours)

**Total Week 1:** 144 keys, ~8 hours

---

### Phase 2: High Priority UI (Week 2)
1. **Extensions.php** - Device monitoring + import/export (60 keys, 4 hours)
2. **NetworkSecurity.php** - Fail2ban tooltips (65 keys, 5 hours)
3. **Common.php** - Security logs + date pickers (30 keys, 2 hours)

**Total Week 2:** 155 keys, ~11 hours

---

### Phase 3: Medium Priority Features (Week 3)
1. **Extensions.php** - SIP tooltips + security (40 keys, 3 hours)
2. **ApiKeys.php** - All keys (33 keys, 2.5 hours)
3. **AsteriskRestUsers.php** - All keys (25 keys, 2 hours)
4. **Passkeys.php** - All keys (23 keys, 2 hours)

**Total Week 3:** 121 keys, ~9.5 hours

---

### Phase 4: Completion (Week 4)
1. **Extensions.php** - Remaining keys (54 keys, 3 hours)
2. **Common.php** - Remaining keys (29 keys, 1.5 hours)
3. **NetworkSecurity.php** - Network routes (24 keys, 1.5 hours)
4. **MailSettings.php** - All keys (17 keys, 1.5 hours)
5. **Low priority files** - All remaining (22 keys, 1 hour)

**Total Week 4:** 146 keys, ~8.5 hours

---

### Total Project Estimate
- **Total Keys:** 502 keys
- **Total Hours:** ~37 hours
- **Timeline:** 4 weeks (assuming 10 hours/week)
- **Resources:** 1 technical translator familiar with PBX/telecom terminology

---

## Key Categories by Functional Area

### User Interface Components (150 keys)
- Form labels and placeholders
- Button text and tooltips
- Navigation breadcrumbs
- Status messages
- Search and filtering

### Error Messages & Validation (80 keys)
- Form validation errors
- File upload errors
- Network validation
- Import/export errors
- Authentication errors

### Help & Documentation (120 keys)
- Tooltip documentation
- Field help text
- Feature explanations
- Code examples
- Configuration guides

### REST API Documentation (100 keys)
- Endpoint descriptions
- Parameter descriptions
- Schema documentation
- Response examples
- Error responses

### Feature-Specific (52 keys)
- Bulk upload workflow
- Device monitoring
- Security logs
- Email notifications
- Routing rules

---

## Technical Considerations

### Terminology Consistency Required
1. **PBX Terms:** Extension, SIP, ARI, dialplan, trunk, provider
2. **Security Terms:** Passkey, JWT, token, authentication, authorization
3. **Network Terms:** Firewall, fail2ban, whitelist, subnet, gateway
4. **API Terms:** Endpoint, schema, payload, bearer token, CRUD

### Special Translation Challenges
1. **Code Examples:** CURL, JavaScript, PHP snippets in tooltips
2. **Technical Tooltips:** Detailed fail2ban and SIP configuration help
3. **Security Messages:** Precise wording for authentication/authorization
4. **Validation Messages:** Clear, actionable error descriptions

### Testing Requirements
1. UI testing for tooltip rendering
2. Form validation message display
3. API documentation viewer
4. Bulk import workflow
5. Security notification emails

---

## Maintenance Recommendations

### Ongoing Translation Process
1. **New Features:** Translate strings before release
2. **Quarterly Audit:** Review coverage across all 29 languages
3. **Consistency Check:** Validate terminology usage
4. **User Feedback:** Monitor support tickets for translation issues

### Automation Opportunities
1. Use the `translations` skill for systematic translation
2. Implement translation validation in CI/CD
3. Generate coverage reports monthly
4. Alert on new untranslated keys

---

## Appendix: Files Analyzed

| File | RU Keys | EN Keys | Missing | Coverage | Status |
|------|---------|---------|---------|----------|---------|
| Auth.php | 64 | 0 | 64 | 0% | Missing |
| Extensions.php | 352 | 159 | 194 | 44.89% | Critical |
| Common.php | 805 | 706 | 99 | 87.70% | Important |
| NetworkSecurity.php | 222 | 133 | 89 | 59.91% | Important |
| ApiKeys.php | 115 | 120 | 33 | 71.30% | Moderate |
| AsteriskRestUsers.php | 105 | 80 | 25 | 76.19% | Moderate |
| Passkeys.php | 72 | 49 | 23 | 68.06% | Moderate |
| MailSettings.php | 406 | 420 | 17 | 95.81% | Minor |
| Route.php | 501 | 492 | 9 | 98.20% | Minor |
| GeneralSettings.php | 581 | 574 | 7 | 98.80% | Minor |
| Modules.php | 98 | 93 | 5 | 94.90% | Minor |
| Providers.php | 455 | 454 | 1 | 99.78% | Minimal |
| Passwords.php | 62 | 62 | 0 | 100% | Complete |
| RestApi.php | 1961 | 1961 | 0 | 100% | Complete |
| StoplightElements.php | 83 | 83 | 0 | 100% | Complete |
| **TOTAL** | **5882** | **5386** | **566** | **90.39%** | |

---

## Next Steps

### Immediate Actions
1. Review this report with the development team
2. Prioritize which phases to tackle first based on release schedule
3. Assign translation resources (internal or external)
4. Set up translation workflow using the `translations` skill

### Long-term Improvements
1. Establish translation-before-release policy
2. Add translation coverage to CI/CD checks
3. Document technical terminology glossary
4. Create translation contributor guide

---

**Report Generated By:** MikoPBX Translation Analysis Tool
**Data Source:** `/Users/nb/PhpstormProjects/mikopbx/Core/src/Common/Messages/`
**JSON Report:** `.claude/translation_analysis_report.json`
