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
