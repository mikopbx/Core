---
id: s-migrate-public-endpoints-to-attributes
title: Migrate PUBLIC_ENDPOINTS to Attributes
status: in-progress
priority: low
created: 2025-12-05
branch: feature/migrate-public-endpoints-attributes
---

# Migrate PUBLIC_ENDPOINTS to Attributes

## Goal

Убрать hardcoded константу `PUBLIC_ENDPOINTS` из `AuthenticationMiddleware` и перенести все публичные эндпоинты в method-level атрибуты `#[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]`.

## Background

После реализации поддержки method-level PUBLIC атрибутов (wiki-links:getLink), появилась возможность иметь единый источник истины для публичных эндпоинтов — атрибуты контроллеров.

Сейчас существует 3-priority система:
1. **Priority 1:** Attribute-based (через `PublicEndpointsRegistry`)
2. **Priority 2:** Legacy hardcoded `PUBLIC_ENDPOINTS` константа
3. **Priority 3:** Module Pattern 2 с `noAuth: true`

Цель — убрать Priority 2, оставив только атрибуты.

## Current PUBLIC_ENDPOINTS

Из `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`:

```php
private const PUBLIC_ENDPOINTS = [
    '/pbxcore/api/v3/mail-settings/oauth2-callback' => ['GET'],
    '/pbxcore/api/v3/passkeys:checkAvailability' => ['GET'],
    '/pbxcore/api/v3/passkeys:authenticationStart' => ['GET'],
    '/pbxcore/api/v3/passkeys:authenticationFinish' => ['POST'],
    '/pbxcore/api/v3/auth:login' => ['POST'],
    '/pbxcore/api/v3/auth:refresh' => ['POST'],
    '/pbxcore/api/v3/user-page-tracker:pageView' => ['POST'],
    '/pbxcore/api/v3/user-page-tracker:pageLeave' => ['POST'],
    '/pbxcore/api/v3/system:changeLanguage' => ['POST', 'PATCH'],
    '/pbxcore/api/v3/system:getAvailableLanguages' => ['GET'],
    '/pbxcore/api/v3/system:ping' => ['GET'],
    '/pbxcore/api/v3/cdr:playback' => ['GET', 'HEAD'],
    '/pbxcore/api/v3/cdr:download' => ['GET'],
];
```

## Tasks

1. [ ] Добавить `#[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]` к методам:
   - [ ] `MailSettings/RestController::oauth2Callback`
   - [ ] `Passkeys/RestController::checkAvailability`
   - [ ] `Passkeys/RestController::authenticationStart`
   - [ ] `Passkeys/RestController::authenticationFinish`
   - [ ] `UserPageTracker/RestController::pageView`
   - [ ] `UserPageTracker/RestController::pageLeave`

2. [ ] Проверить существующие атрибуты (уже есть):
   - [x] `Auth/RestController::login`
   - [x] `Auth/RestController::refresh`
   - [x] `System/RestController::ping`
   - [x] `System/RestController::changeLanguage`
   - [x] `System/RestController::getAvailableLanguages`
   - [x] `Cdr/RestController::playback`
   - [x] `Cdr/RestController::download`

3. [ ] Удалить константу `PUBLIC_ENDPOINTS` из `AuthenticationMiddleware`

4. [ ] Удалить проверку legacy endpoints из `isPublicEndpoint()`

5. [ ] Обновить тесты `test_63_public_endpoints.py`

6. [ ] Обновить документацию в `src/PBXCoreREST/CLAUDE.md`

## Files to Modify

- `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`
- `src/PBXCoreREST/Controllers/MailSettings/RestController.php`
- `src/PBXCoreREST/Controllers/Passkeys/RestController.php`
- `src/PBXCoreREST/Controllers/UserPageTracker/RestController.php`
- `tests/api/test_63_public_endpoints.py`
- `src/PBXCoreREST/CLAUDE.md`

## Testing

```bash
python3 -m pytest tests/api/test_63_public_endpoints.py -v -s
```

## Notes

- Priority 3 (Module Pattern 2) остаётся для обратной совместимости с legacy модулями
- После миграции останется 2-priority система: Attributes + Module noAuth
