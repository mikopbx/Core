---
name: m-module-users-ui-user-profile
branch: feature/module-users-ui-profile
status: in-progress
created: 2025-12-04
---

# Task: User Profile Page for ModuleUsersUI

**Priority:** Medium
**Status:** Planned
**Module:** ModuleUsersUI (external)

## Goal

Allow module users to manage their own password and passkeys via self-service UI.

## Requirements

1. **Password change** - user can change own password (if not LDAP mode)
2. **Passkeys management** - user can add/delete own passkeys
3. **Admin unchanged** - admin manages users via existing module interface

## Implementation Plan

### 1. UserProfileController
- Location: `ModuleUsersUI/App/Controllers/UserProfileController.php`
- Actions: `indexAction()`, `changePasswordAction()`
- ACL: always allowed for authenticated users (add to `getAlwaysAllowed()`)

### 2. View
- Location: `ModuleUsersUI/App/Views/UserProfile/index.volt`
- Sections:
  - Password change form (hidden if `useLdapAuth === '1'`)
  - Passkeys section (reuse HTML from Core's `passwords.volt`)

### 3. JavaScript
- Location: `ModuleUsersUI/public/assets/js/module-users-ui-profile.js`
- Minimal: initialize `GeneralSettingsPasskeys` module (from Core)
- Include Core's `general-settings-passkeys.js` via assets

### 4. Menu Item
- Add "My Profile" in `onBeforeHeaderMenuShow()`
- Icon: `user circle`
- Always visible for logged-in users

### 5. ACL Updates
- Add `UserProfileController` to `getAlwaysAllowed()` in CoreACL

## Reusable Components from Core

- `GeneralSettingsPasskeys` JS module - works with `#passkeys-container`
- `PasskeysAPI` - all CRUD operations
- Passkeys Volt HTML structure from `passwords.volt`

## Completed Prerequisites

- [x] `getPasskeySessionData()` hook in UsersUIConf
- [x] `getSessionParamsForLogin()` in UsersUIAuthenticator
- [x] `API_V3_PASSKEYS` moved to `getAlwaysAllowed()`

## Files to Create

```
ModuleUsersUI/
├── App/Controllers/UserProfileController.php
├── App/Views/UserProfile/index.volt
├── public/assets/js/src/module-users-ui-profile.js
└── Lib/ACL/CoreACL.php (update getAlwaysAllowed)
```

---

## Context Manifest

### How ModuleUsersUI Currently Works: Authentication and User Management System

ModuleUsersUI is an **external module** located in `/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleUsersUI/` that extends MikoPBX's authentication and authorization system. The module provides role-based access control (RBAC) for regular users while administrators continue using Core's default authentication.

**Authentication Flow - How Users Log In:**

When a user attempts to log in to MikoPBX, the SessionController in Core calls module hooks to check if any modules want to handle authentication. ModuleUsersUI implements two key hooks:

1. **`UsersUIConf::authenticateUser(login, password)`** (lines 98-102) - Called during password-based login
2. **`UsersUIConf::getPasskeySessionData(login)`** (lines 114-118) - Called during passkey-based login

Both hooks delegate to `UsersUIAuthenticator` which:
- Queries the `UsersCredentials` table to find the user by `user_login`
- Joins with `AccessGroups` table to get the user's role and home page
- Checks if the user is enabled (`enabled = '1'`)
- Returns session data with role format: `ModuleUsersUI_{accessGroupId}` (e.g., "ModuleUsersUI_123")

**Password Authentication Path** (`UsersUIAuthenticator::authenticate()` lines 40-99):
```php
// 1. Find user credentials by login
$userData = query->getSingleResult();

// 2. Check if user is enabled
if ($userData->enabled === '0') return [];

// 3. Prepare success data
$successAuthData = [
    'role' => 'ModuleUsersUI_' . $userData->accessGroupId,
    'homePage' => $userData->homePage ?? '/session/end',
    'userName' => $this->login,
];

// 4. Verify password (LDAP or hash)
if ($userData->useLdapAuth == '1') {
    // LDAP verification via UsersUILdapAuth
} else {
    // Password hash verification via Security::checkHash()
}
```

**Passkey Authentication Path** (`UsersUIAuthenticator::getSessionParamsForLogin()` lines 107-146):
- Does NOT verify password (WebAuthn already verified the credential)
- Only checks if user exists and is enabled
- Returns same session data structure

**LDAP Authentication Logic:**
- LDAP is controlled globally via `LdapConfig::useLdapAuthMethod` ('0' or '1')
- Individual users can override via `UsersCredentials::use_ldap_auth` field
- When LDAP is enabled for a user, password is verified against LDAP server instead of hash
- Password hash is still stored but not checked when LDAP is active

**User Credentials Storage** (`UsersCredentials` model):
- `user_id` - Foreign key to Core's Users table (employee ID)
- `user_login` - Login name for authentication (can differ from employee username)
- `user_password` - Hashed password using `MikoPBXVersion::getSecurityClass()` (Phalcon Security)
- `user_access_group_id` - Foreign key to AccessGroups
- `use_ldap_auth` - '0' for local password, '1' for LDAP
- `enabled` - '0' disabled, '1' enabled

**Password Hashing Pattern** (seen in `UsersCredentialsController::changeUserCredentialsAction()` lines 278-281):
```php
$securityClass = MikoPBXVersion::getSecurityClass();
$security = new $securityClass();
$groupMember->user_password = $security->hash($userPassword);
```

**Access Control List (ACL) Architecture:**

ModuleUsersUI overrides Core's ACL system via `UsersUIConf::onAfterACLPrepared()` (lines 86-89), which calls `UsersUIACL::modify($aclList)` to:
1. Create dynamic roles for each AccessGroup (format: `ModuleUsersUI_{id}`)
2. Grant permissions based on `AccessGroupsRights` table entries
3. Override Core's always-allowed/always-denied rules via `CoreACL.php`

**CoreACL Structure** (`/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleUsersUI/Lib/ACL/CoreACL.php`):

Three key methods define permission boundaries:

1. **`getLinkedControllerActions()`** (lines 81-374) - Auto-grants related actions
   - Example: If user can access `CallDetailRecordsController::index`, they automatically get CDR API access
   - Structure: `[MainController => ['mainAction' => [TargetController/Endpoint => ['actions']]]]`

2. **`getAlwaysAllowed()`** (lines 386-447) - Public endpoints (no permission check needed)
   - Currently includes: ErrorsController, LocalizationController, SessionController
   - REST API: Extensions::getForSelect, System::ping, Auth endpoints, **Passkeys (all actions)**
   - Critical: `API_V3_PASSKEYS => '*'` (line 446) means ALL passkey operations are allowed for authenticated users

3. **`getAlwaysDenied()`** (lines 458-527) - Admin-only endpoints
   - Regular users CANNOT access: GeneralSettingsController, NetworkController, Firewall, etc.
   - Ensures sensitive system configuration remains admin-only

**Why Passkeys Work Without Extra Permissions:**

The passkeys API is in `getAlwaysAllowed()` with wildcard `'*'` (line 446), meaning:
- Any authenticated user (including ModuleUsersUI users) can manage their own passkeys
- The REST API controller (`PasskeysController`) filters by `user_name` from JWT token
- Database stores passkeys in Core's `UserPasskeys` table with `user_name` column
- No admin intervention needed - self-service by design

---

### How User Profile Page Should Work: Self-Service Password and Passkeys Management

**Requirements Analysis:**

1. **Password Change** - User can update their own password (if not LDAP mode)
2. **Passkeys Management** - User can add/delete their own passkeys using existing Core infrastructure
3. **Admin Unchanged** - Admin continues managing users via existing AccessGroups/UsersCredentials UI

**Architectural Decision - Why UserProfileController Should Be Always Allowed:**

Looking at the existing ACL architecture in `CoreACL.php`, there's a clear pattern:
- Controllers/actions that are self-service and don't require admin permission checks go in `getAlwaysAllowed()`
- Example: `SessionController => '*'` (line 395) - users manage their own session
- Example: `API_V3_PASSKEYS => '*'` (line 446) - users manage their own passkeys

**The UserProfileController should follow the same pattern:**
- It operates on the current user's data only (identified by JWT token's `user_name`)
- No privilege escalation risk - users can only change their own password
- Consistent with passkeys API design (self-service, no admin check)

Therefore, add to `CoreACL::getAlwaysAllowed()`:
```php
// Module controllers
UserProfileController::class => '*',  // Users manage their own profile
```

This means:
- No need to add `UserProfileController` to individual AccessGroup permissions
- Works for ALL authenticated users regardless of their role
- Simplifies implementation - no ACL checking needed in controller

---

### How Password Change Works: Understanding the Existing Pattern

**Current Admin Workflow** (when admin edits user via Extensions page):

1. Admin modifies employee via `ExtensionsController::modify()` and `ExtensionsController::save()`
2. Core saves employee data, then fires `onAfterExecuteRestAPIRoute` hook
3. `UsersUIConf::onAfterExecuteRestAPIRoute()` (lines 199-231) intercepts the save:
   ```php
   // Check if this is employee-related request
   if (strpos($pattern, '/pbxcore/api/v3/employees') === 0) {
       // On POST/PUT (create/update)
       $postData = $request->getData();
       if ($this->hasModuleData($postData)) {  // Check for module_users_ui_* fields
           $userController->saveUserCredential($postData, $response);
       }
   }
   ```

4. `UsersCredentialsController::saveUserCredential()` (lines 131-183) processes:
   - `module_users_ui_access_group` → `user_access_group_id`
   - `module_users_ui_login` → `user_login`
   - `module_users_ui_password` → hashed via `Security::hash()` and stored in `user_password`
   - `module_users_ui_use_ldap_auth` → `use_ldap_auth`

**Key Insight - Password Update Logic** (`UsersCredentialsController` lines 156-161):
```php
// Update the user password hash if it is not empty
if (!empty($userPassword) and ($userPassword !== Constants::HIDDEN_PASSWORD)) {
    $securityClass = MikoPBXVersion::getSecurityClass();
    $security = new $securityClass();
    $groupMember->user_password = $security->hash($userPassword);
}
```

The `HIDDEN_PASSWORD` constant is a sentinel value used when displaying forms - if the user doesn't change the password field, it remains as `HIDDEN_PASSWORD` and is not updated.

**For User Profile Self-Service:**

The new `UserProfileController::changePasswordAction()` should follow the same pattern:
1. Accept POST with `current_password`, `new_password`, `new_password_repeat`
2. Verify `current_password` matches stored hash (or LDAP if `use_ldap_auth = '1'`)
3. Validate `new_password === new_password_repeat`
4. Hash new password: `$security->hash($new_password)`
5. Update `UsersCredentials` record for current user (identified by `user_name` from session)

**Important Security Constraint:**
- User CANNOT change password if `use_ldap_auth = '1'` → password managed in LDAP
- Hide password form fields if LDAP is active
- Show informational message: "Password managed by LDAP administrator"

---

### How to Hook Into Header Menu: Adding "My Profile" Link

**Module Hook System for Menu Items:**

Modules can modify the system menu via `ConfigClass::onBeforeHeaderMenuShow(array &$menuItems)` hook (documented in `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/src/Modules/Config/ConfigClass.php` line 358).

**Reference Implementation** (`ModuleTemplate/Lib/TemplateConf.php` lines 104-119):
```php
public function onBeforeHeaderMenuShow(array &$menuItems): void
{
    $menuItems['module_template_AdditionalMenuItem'] = [
        'caption' => 'module_template_AdditionalMenuItem',
        'iconclass' => '',
        'submenu' => [
            '/module-template/additional-page' => [
                'caption' => 'module_template_AdditionalSubMenuItem',
                'iconclass' => 'gear',
                'action' => 'index',
                'param' => '',
                'style' => '',
            ],
        ]
    ];
}
```

**Menu Item Structure:**
- `caption` - Translation key (will be translated via `globalTranslate`)
- `iconclass` - Fomantic UI icon class (e.g., 'user circle', 'key', 'settings')
- `submenu` - Nested array if multiple items, or direct item if single
- `action` - Controller action name (usually 'index')
- `param` - URL fragment (e.g., '#reset-cache')
- `style` - Additional CSS classes

**For User Profile:**

Add to `UsersUIConf.php`:
```php
public function onBeforeHeaderMenuShow(array &$menuItems): void
{
    // Only show for ModuleUsersUI users (not admin)
    $session = $this->di->get('session');
    $role = $session->get(SessionController::ROLE);

    if (strpos($role, Constants::MODULE_ROLE_PREFIX) === 0) {
        $menuItems['module_users_ui_profile'] = [
            '/module-users-u-i/user-profile/index' => [
                'caption' => 'module_usersui_MyProfile',
                'iconclass' => 'user circle',
                'action' => 'index',
                'param' => '',
                'style' => '',
            ]
        ];
    }
}
```

**Translation Keys to Add:**
- `module_usersui_MyProfile` → "My Profile"
- `module_usersui_ChangePassword` → "Change Password"
- `module_usersui_CurrentPassword` → "Current Password"
- `module_usersui_NewPassword` → "New Password"
- `module_usersui_NewPasswordRepeat` → "Repeat New Password"
- `module_usersui_PasswordManagedByLDAP` → "Your password is managed by LDAP administrator"

---

### How Passkeys Currently Work: Reusable Components from Core

**Core Passkeys Implementation** (already working for admin):

**1. Backend - REST API** (`/pbxcore/api/v3/passkeys`):
- GET `/pbxcore/api/v3/passkeys` → `PasskeysController::getList()` - Returns user's passkeys filtered by `user_name`
- POST `/pbxcore/api/v3/passkeys:registrationStart` → Generates WebAuthn challenge
- POST `/pbxcore/api/v3/passkeys:registrationFinish` → Verifies attestation and stores passkey
- DELETE `/pbxcore/api/v3/passkeys/{id}` → Deletes passkey (only if belongs to current user)

**2. Frontend - JavaScript Module** (`general-settings-passkeys.js`):

The `GeneralSettingsPasskeys` object is a **self-contained, reusable module** that:
- Expects a container element with ID `#passkeys-container`
- Loads passkeys via `PasskeysAPI.getList()`
- Renders a table with passkey names and "Last used" timestamps
- Handles WebAuthn registration flow (browser → server → authenticator → server)
- Handles deletion with two-step confirmation pattern
- Auto-generates passkey names based on browser/device/date

**Key Methods:**
```javascript
GeneralSettingsPasskeys.initialize() - Entry point, call this on page load
GeneralSettingsPasskeys.loadPasskeys() - Fetch from API
GeneralSettingsPasskeys.renderTable() - Draw UI
GeneralSettingsPasskeys.registerNewPasskey() - WebAuthn registration flow
GeneralSettingsPasskeys.deletePasskey(id) - Delete with confirmation
```

**3. HTML Structure** (`passwords.volt` lines 28-71):
```html
<div id="passkeys-container">
    <table class="ui very basic table" id="passkeys-table">
        <tbody>
            <!-- Empty state placeholder -->
            <tr id="passkeys-empty-row" style="display: none;">
                <td colspan="2">
                    <div class="ui placeholder segment">
                        <i class="key icon"></i>
                        {{ t._('pk_NoPasskeys') }}
                        <button id="add-passkey-button">Add Passkey</button>
                    </div>
                </td>
            </tr>
            <!-- Passkeys rows inserted here by JS -->
        </tbody>
    </table>
</div>
```

**Passkey Data Flow - Registration:**
1. User clicks "Add Passkey"
2. JS calls `PasskeysAPI.registrationStart(name)` → Server returns challenge
3. JS calls `navigator.credentials.create()` with challenge → Browser shows authenticator UI
4. User approves on device (fingerprint/Face ID/security key)
5. Browser returns attestation data
6. JS calls `PasskeysAPI.registrationFinish(attestation)` → Server verifies and stores
7. Page reloads passkeys list

**Passkey Data Flow - Authentication** (separate from profile page, but useful context):
1. User visits login page
2. JS calls `PasskeysAPI.authenticationStart()` → Server returns challenge
3. JS calls `navigator.credentials.get()` → Browser prompts for passkey
4. User approves → Browser returns assertion
5. JS calls `PasskeysAPI.authenticationFinish()` → Server verifies signature
6. Server returns session data with `user_name`, calls `getPasskeySessionData()`
7. ModuleUsersUI returns role and homePage

---

### For User Profile Implementation: What Needs to Connect

**1. UserProfileController Structure:**

Follow the existing controller pattern seen in `AccessGroupsController.php`:

```php
namespace Modules\ModuleUsersUI\App\Controllers;

use MikoPBX\AdminCabinet\Providers\AssetProvider;
use MikoPBX\AdminCabinet\Controllers\SessionController;
use Modules\ModuleUsersUI\Lib\Constants;
use Modules\ModuleUsersUI\Models\UsersCredentials;
use Modules\ModuleUsersUI\Models\LdapConfig;

class UserProfileController extends ModuleUsersUIBaseController
{
    public function indexAction(): void
    {
        // Add CSS/JS assets
        $headerCssCollection = $this->assets->collection(AssetProvider::HEADER_CSS);
        // Add any CSS if needed

        $footerCollection = $this->assets->collection(AssetProvider::FOOTER_JS);
        $footerCollection
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/GeneralSettings/general-settings-passkeys.js', true)  // Core's passkeys
            ->addJs('js/cache/' . $this->moduleUniqueID . '/module-users-ui-profile.js', true);

        // Get current user from session
        $userName = $this->session->get(SessionController::USER_NAME);

        // Find user credentials
        $userCredentials = UsersCredentials::findFirst([
            'conditions' => 'user_login = :login:',
            'bind' => ['login' => $userName]
        ]);

        // Check LDAP mode (global setting)
        $ldapConfig = LdapConfig::findFirst();
        $useLdapAuth = $userCredentials->use_ldap_auth ?? '0';

        // Pass to view
        $this->view->useLdapAuth = $useLdapAuth;
        $this->view->userName = $userName;
    }

    public function changePasswordAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }

        $data = $this->request->getPost();
        $userName = $this->session->get(SessionController::USER_NAME);

        // Validate current password
        // Hash new password
        // Update UsersCredentials

        // Return JSON response
        $this->view->success = true;
        $this->view->message = 'Password changed successfully';
    }
}
```

**2. View Structure** (`App/Views/UserProfile/index.volt`):

```volt
{% extends "layouts/main.volt" %}

{% block content %}
<form class="ui large form" id="user-profile-form">
    <h2 class="ui header">
        <i class="user circle icon"></i>
        <div class="content">
            {{ t._('module_usersui_MyProfile') }}
            <div class="sub header">{{ userName }}</div>
        </div>
    </h2>

    {# Password Section - Hidden if LDAP #}
    {% if useLdapAuth !== '1' %}
    <div class="ui segment">
        <h3 class="ui header">{{ t._('module_usersui_ChangePassword') }}</h3>
        <div class="field">
            <label>{{ t._('module_usersui_CurrentPassword') }}</label>
            <input type="password" name="current_password" autocomplete="current-password">
        </div>
        <div class="two fields">
            <div class="field">
                <label>{{ t._('module_usersui_NewPassword') }}</label>
                <input type="password" name="new_password" autocomplete="new-password">
            </div>
            <div class="field">
                <label>{{ t._('module_usersui_NewPasswordRepeat') }}</label>
                <input type="password" name="new_password_repeat">
            </div>
        </div>
        <button class="ui primary button" id="change-password-button">
            {{ t._('module_usersui_ChangePassword') }}
        </button>
    </div>
    {% else %}
    <div class="ui info message">
        <i class="info circle icon"></i>
        {{ t._('module_usersui_PasswordManagedByLDAP') }}
    </div>
    {% endif %}

    {# Passkeys Section - Reuse Core HTML #}
    <div class="ui segment">
        <h3 class="ui header">{{ t._('pk_PasskeysTitle') }}</h3>
        <div id="passkeys-container">
            <table class="ui very basic table" id="passkeys-table">
                <tbody>
                    <tr id="passkeys-empty-row" style="display: none;">
                        <td colspan="2">
                            <div class="ui placeholder segment">
                                <div class="ui icon header">
                                    <i class="key icon"></i>
                                    {{ t._('pk_NoPasskeys') }}
                                </div>
                                <button type="button" class="ui blue button" id="add-passkey-button">
                                    <i class="add circle icon"></i>
                                    {{ t._('pk_AddPasskey') }}
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</form>
{% endblock %}
```

**3. JavaScript Module** (`public/assets/js/src/module-users-ui-profile.js`):

```javascript
/* global globalRootUrl, globalTranslate, GeneralSettingsPasskeys, UserMessage, Form */

/**
 * ModuleUsersUI User Profile page
 * Handles password change and passkeys management
 */
const UserProfile = {
    $formObj: $('#user-profile-form'),

    initialize() {
        // Initialize passkeys module from Core
        GeneralSettingsPasskeys.initialize();

        // Password change handler
        $('#change-password-button').on('click', (e) => {
            e.preventDefault();
            UserProfile.changePassword();
        });
    },

    changePassword() {
        const currentPassword = $('input[name="current_password"]').val();
        const newPassword = $('input[name="new_password"]').val();
        const newPasswordRepeat = $('input[name="new_password_repeat"]').val();

        // Validation
        if (!currentPassword || !newPassword || !newPasswordRepeat) {
            UserMessage.showError(globalTranslate.module_usersui_PasswordFieldsRequired);
            return;
        }

        if (newPassword !== newPasswordRepeat) {
            UserMessage.showError(globalTranslate.module_usersui_PasswordsDontMatch);
            return;
        }

        // Send to server
        $.api({
            url: `${globalRootUrl}module-users-u-i/user-profile/change-password`,
            method: 'POST',
            data: {
                current_password: currentPassword,
                new_password: newPassword,
            },
            on: 'now',
            successTest(response) {
                return response.result === true;
            },
            onSuccess(response) {
                UserMessage.showInformation(response.message);
                // Clear fields
                $('input[name="current_password"]').val('');
                $('input[name="new_password"]').val('');
                $('input[name="new_password_repeat"]').val('');
            },
            onFailure(response) {
                UserMessage.showMultiString(response.messages);
            }
        });
    }
};

$(document).ready(() => {
    UserProfile.initialize();
});
```

---

### Technical Reference Details

#### File Locations

**ModuleUsersUI Base Path:**
```
/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleUsersUI/
```

**Existing Key Files:**
- `Lib/UsersUIConf.php` - Module configuration class (hook implementations)
- `Lib/UsersUIAuthenticator.php` - Authentication logic (password + passkey)
- `Lib/ACL/CoreACL.php` - ACL rules (always-allowed, always-denied, linked actions)
- `App/Controllers/ModuleUsersUIBaseController.php` - Base controller for module controllers
- `App/Controllers/UsersCredentialsController.php` - User credential management (password hashing)
- `Models/UsersCredentials.php` - User credential model (login, password hash, LDAP flag)
- `Models/LdapConfig.php` - LDAP configuration (global setting)

**Core Files to Reference:**
- `/project-modules-api-refactoring/src/AdminCabinet/Views/GeneralSettings/passwords.volt` - Passkeys HTML template
- `/project-modules-api-refactoring/sites/admin-cabinet/assets/js/src/GeneralSettings/general-settings-passkeys.js` - Passkeys JavaScript module
- `/project-modules-api-refactoring/sites/admin-cabinet/assets/js/src/PbxAPI/passkeys-api.js` - PasskeysAPI client
- `/project-modules-api-refactoring/src/Modules/Config/ConfigClass.php` - Base module class with hooks

**New Files to Create:**
```
/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleUsersUI/
├── App/Controllers/UserProfileController.php      # Profile controller (index, changePassword)
├── App/Views/UserProfile/index.volt               # Profile page view (password form + passkeys)
└── public/assets/js/src/module-users-ui-profile.js  # Profile page JavaScript
```

**Files to Update:**
```
/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleUsersUI/
├── Lib/ACL/CoreACL.php           # Add UserProfileController to getAlwaysAllowed()
└── Lib/UsersUIConf.php           # Add onBeforeHeaderMenuShow() for menu item
```

#### Class Names and Namespaces

**Controllers:**
```php
namespace Modules\ModuleUsersUI\App\Controllers;

class UserProfileController extends ModuleUsersUIBaseController
{
    // Actions: indexAction(), changePasswordAction()
}
```

**Models:**
```php
use Modules\ModuleUsersUI\Models\UsersCredentials;
use Modules\ModuleUsersUI\Models\LdapConfig;
```

**Session Constants:**
```php
use MikoPBX\AdminCabinet\Controllers\SessionController;

SessionController::USER_NAME  // Current user's login
SessionController::ROLE       // User's role (e.g., "ModuleUsersUI_123")
SessionController::HOME_PAGE  // User's home page URL
```

**Security Class:**
```php
use Modules\ModuleUsersUI\Lib\MikoPBXVersion;

$securityClass = MikoPBXVersion::getSecurityClass();
$security = new $securityClass();
$hash = $security->hash($password);
$valid = $security->checkHash($password, $hash);
```

#### Database Schema

**UsersCredentials Table Fields:**
- `id` - Primary key
- `user_id` - Foreign key to Core's Users table
- `user_login` - Login name (unique)
- `user_password` - Hashed password (even if LDAP, for fallback)
- `user_access_group_id` - Foreign key to AccessGroups
- `use_ldap_auth` - '0' local, '1' LDAP
- `enabled` - '0' disabled, '1' enabled

**UserPasskeys Table** (in Core, not ModuleUsersUI):
- `id` - UUID primary key
- `user_name` - Username (matches UsersCredentials.user_login)
- `name` - Friendly name (e.g., "Chrome on macOS (12/4/2025)")
- `credential_id` - WebAuthn credential ID (base64)
- `public_key` - Public key (base64)
- `created_at` - Creation timestamp
- `last_used_at` - Last authentication timestamp

#### REST API Endpoints

**Passkeys API** (already implemented in Core):
```
GET    /pbxcore/api/v3/passkeys                    → PasskeysController::getList()
POST   /pbxcore/api/v3/passkeys:registrationStart  → PasskeysController::registrationStart()
POST   /pbxcore/api/v3/passkeys:registrationFinish → PasskeysController::registrationFinish()
PATCH  /pbxcore/api/v3/passkeys/{id}               → PasskeysController::patch()
DELETE /pbxcore/api/v3/passkeys/{id}               → PasskeysController::delete()
```

**UserProfile Actions** (new, but NOT REST API - regular controller actions):
```
GET    /module-users-u-i/user-profile/index          → UserProfileController::indexAction()
POST   /module-users-u-i/user-profile/change-password → UserProfileController::changePasswordAction()
```

#### Configuration Requirements

**ACL Update** (`CoreACL::getAlwaysAllowed()`):
```php
return [
    // ... existing entries ...

    // Module controllers - self-service actions
    UserProfileController::class => '*',  // Add this line

    // ... rest of array ...
];
```

**Menu Hook** (`UsersUIConf::onBeforeHeaderMenuShow()`):
```php
public function onBeforeHeaderMenuShow(array &$menuItems): void
{
    $session = $this->di->get('session');
    $role = $session->get(SessionController::ROLE);

    // Only show for ModuleUsersUI users
    if (strpos($role, Constants::MODULE_ROLE_PREFIX) === 0) {
        $menuItems['module_users_ui_profile'] = [
            '/module-users-u-i/user-profile/index' => [
                'caption' => 'module_usersui_MyProfile',
                'iconclass' => 'user circle',
                'action' => 'index',
                'param' => '',
                'style' => '',
            ]
        ];
    }
}
```

#### Translation Keys Required

Add to `Messages/en.php` (and other languages):
```php
'module_usersui_MyProfile' => 'My Profile',
'module_usersui_ChangePassword' => 'Change Password',
'module_usersui_CurrentPassword' => 'Current Password',
'module_usersui_NewPassword' => 'New Password',
'module_usersui_NewPasswordRepeat' => 'Repeat New Password',
'module_usersui_PasswordManagedByLDAP' => 'Your password is managed by LDAP administrator',
'module_usersui_PasswordFieldsRequired' => 'All password fields are required',
'module_usersui_PasswordsDontMatch' => 'New passwords do not match',
'module_usersui_PasswordChangedSuccessfully' => 'Password changed successfully',
'module_usersui_CurrentPasswordIncorrect' => 'Current password is incorrect',
```

#### Asset Provider Pattern

When adding assets in controller:
```php
use MikoPBX\AdminCabinet\Providers\AssetProvider;

$footerCollection = $this->assets->collection(AssetProvider::FOOTER_JS);
$footerCollection
    ->addJs('js/pbx/main/form.js', true)  // Core form helper
    ->addJs('js/pbx/GeneralSettings/general-settings-passkeys.js', true)  // Core passkeys
    ->addJs('js/cache/' . $this->moduleUniqueID . '/module-users-ui-profile.js', true);  // Module JS
```

**JavaScript Transpilation:**
- Source: `public/assets/js/src/module-users-ui-profile.js`
- Output: `public/assets/js/module-users-ui-profile.js` (transpiled by Babel)
- Cache: `/js/cache/ModuleUsersUI/module-users-ui-profile.js` (served to browser)

#### Security Constraints

1. **Password Hashing:**
   - Use `MikoPBXVersion::getSecurityClass()` to get security class
   - Use `$security->hash($password)` to hash
   - Use `$security->checkHash($password, $hash)` to verify

2. **LDAP Bypass:**
   - Check `UsersCredentials::use_ldap_auth` before allowing password change
   - If '1', password change should be blocked (managed by LDAP)

3. **Current Password Verification:**
   - MUST verify current password before allowing change
   - Prevents unauthorized password changes if session is hijacked

4. **User Isolation:**
   - ONLY allow user to change their own password
   - Get `user_name` from session, NOT from POST data
   - Prevents privilege escalation attacks

5. **Passkeys API Security:**
   - Already filtered by `user_name` in Core's PasskeysController
   - No additional security needed in module
   - WebAuthn itself provides cryptographic security

---

### Implementation Checklist

- [ ] Create `UserProfileController.php` with `indexAction()` and `changePasswordAction()`
- [ ] Create `App/Views/UserProfile/index.volt` with password form and passkeys container
- [ ] Create `public/assets/js/src/module-users-ui-profile.js` with password change logic
- [ ] Update `CoreACL::getAlwaysAllowed()` to include `UserProfileController::class => '*'`
- [ ] Add `onBeforeHeaderMenuShow()` to `UsersUIConf.php` for menu item
- [ ] Add translation keys for password change UI
- [ ] Test password change (local auth mode)
- [ ] Test LDAP mode (password form hidden)
- [ ] Test passkeys management (reusing Core module)
- [ ] Verify menu item appears only for ModuleUsersUI users (not admin)

---

**Context Gathering Complete** - All architectural patterns documented, existing implementations analyzed, security constraints identified, and integration points mapped.
