# MikoPBX REST API Development Guide

REST API v3 development guide for MikoPBX using modern PHP 8.3 patterns.

## Architecture Overview

```
HTTP Request → Middleware → Controller → Redis Queue → Worker → Processor → Action → DataStructure → Response
```

## Core Components

### 1. Controllers (PHP 8 Attributes)

```php
#[ApiResource(path: '/pbxcore/api/v3/call-queues', tags: ['Call Queues'])]
#[ResourceSecurity('call_queues', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: ['GET' => ['getList', 'getRecord'], 'POST' => ['create']],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'copy'],
    // ✨ NEW: idPattern supports arrays for multiple prefixes
    idPattern: ['CONFERENCE-', 'CONFERENCE-ROOM-', 'CONFERENCE']  // CONFERENCE-xxx, CONFERENCE-ROOM-xxx, CONFERENCExxx
)]
class RestController extends BaseRestController
{
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    // All constraints (enum, pattern, maxLength, min/max, defaults) inherited from definitions
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('strategy')]
    public function create(): void {}
}
```

### 2. DataStructure - Single Source of Truth

✨ **CRITICAL:** ALL field definitions (validation, sanitization, defaults, constraints) must be centralized in `getParameterDefinitions()`.

```php
class DataStructure extends AbstractDataStructure
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'name' => [
                    'type' => 'string',
                    'description' => 'Queue name',
                    'minLength' => 1,
                    'maxLength' => 64,
                    'sanitize' => 'text',
                    'required' => true,
                    'example' => 'Support Queue'
                ],
                'strategy' => [
                    'type' => 'string',
                    'enum' => ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory'],
                    'sanitize' => 'string',
                    'default' => 'ringall'
                ],
                'timeout' => [
                    'type' => 'integer',
                    'minimum' => 0,
                    'maximum' => 300,
                    'sanitize' => 'int',
                    'default' => 30
                ]
            ],
            'response' => [
                'represent' => [
                    'type' => 'string',
                    'description' => 'HTML representation for dropdowns'
                ]
            ]
        ];
    }

    // Auto-generate sanitization rules from definitions
    public static function getSanitizationRules(): array
    {
        $definitions = static::getParameterDefinitions();
        $rules = [];

        foreach ($definitions['request'] as $field => $def) {
            $rule = [$def['type'] ?? 'string'];

            if (isset($def['sanitize'])) {
                $rule[] = 'sanitize:' . $def['sanitize'];
            }
            if (isset($def['maxLength'])) {
                $rule[] = 'max:' . $def['maxLength'];
            }
            if (!isset($def['required'])) {
                $rule[] = 'empty_to_null';
            }

            $rules[$field] = implode('|', $rule);
        }

        return $rules;
    }
}
```

### 3. SaveRecordAction - 7-Phase Pattern

✨ **CRITICAL:** Follow this exact 7-phase pattern with WHY comments for every SaveRecordAction.

```php
public static function main(array $data): PBXApiResult
{
    $res = self::createApiResult(__METHOD__);

    // ============ PHASE 1: SANITIZATION ============
    // WHY: Security - never trust user input
    $sanitizationRules = DataStructure::getSanitizationRules();
    $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, ['name', 'description']);

    // ============ PHASE 2: REQUIRED VALIDATION ============
    // WHY: Fail fast - don't waste resources
    $validationErrors = self::validateRequiredFields($sanitizedData, [
        'name' => [['type' => 'required', 'message' => 'Name is required']]
    ]);
    if (!empty($validationErrors)) {
        $res->messages['error'] = $validationErrors;
        return $res;
    }

    // ============ PHASE 3: DETERMINE OPERATION ============
    // WHY: Different logic for new vs existing records
    $isNewRecord = empty($sanitizedData['id']);
    $model = $isNewRecord ? new Model() : Model::findByUniqid($sanitizedData['id']);

    // ============ PHASE 4: APPLY DEFAULTS (CREATE ONLY!) ============
    // WHY CREATE: New records need complete data
    // WHY NOT UPDATE/PATCH: Would overwrite existing values!
    if ($isNewRecord) {
        $sanitizedData = DataStructure::applyDefaults($sanitizedData);
    }

    // ============ PHASE 5: SCHEMA VALIDATION ============
    // WHY: Validate AFTER defaults to check complete dataset
    $schemaErrors = DataStructure::validateInputData($sanitizedData);
    if (!empty($schemaErrors)) {
        $res->messages['error'] = $schemaErrors;
        $res->httpCode = 422;
        return $res;
    }

    // ============ PHASE 6: SAVE ============
    // WHY: All-or-nothing transaction
    $savedModel = self::executeInTransaction(function() use ($model, $sanitizedData) {
        // Apply fields with isset() for PATCH support
        if (isset($sanitizedData['name'])) $model->name = $sanitizedData['name'];
        if (isset($sanitizedData['strategy'])) $model->strategy = $sanitizedData['strategy'];

        if (!$model->save()) {
            throw new \Exception(implode(', ', $model->getMessages()));
        }
        return $model;
    });

    // ============ PHASE 7: RESPONSE ============
    // WHY: Consistent API format
    $res->data = DataStructure::createFromModel($savedModel);
    $res->success = true;
    $res->httpCode = $isNewRecord ? 201 : 200;

    return $res;
}
```

## Authentication Architecture

### JWT Bearer Tokens (15 min lifetime)
```bash
# Login with cookies (required for Bearer token to work)
COOKIE_JAR="/tmp/mikopbx_cookies.txt"

TOKEN=$(curl -s -c "$COOKIE_JAR" -X POST 'https://localhost:8445/pbxcore/api/v3/auth:login' \
  -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
  --data-raw 'login=admin&password=123456789MikoPBX%231&rememberMe=false' \
  --insecure | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

# Use token with cookies
curl -H "Authorization: Bearer $TOKEN" \
  -b "$COOKIE_JAR" \
  https://localhost:8445/pbxcore/api/v3/extensions
```

**Dual-token system:**
- **Access Token:** JWT, 15 min, stateless, Bearer header
- **Refresh Token:** 30 days, Redis storage, httpOnly cookie, auto-rotation

### API Keys (no expiration)
```bash
curl -H "Authorization: Bearer miko_ak_1234567890abcdef..." \
  http://127.0.0.1:8081/pbxcore/api/v3/extensions
```

## Creating New Endpoints

1. **Controller:** `src/PBXCoreREST/Controllers/YourResource/RestController.php`
2. **Processor:** `src/PBXCoreREST/Lib/YourResourceManagementProcessor.php` (enum + match)
3. **Actions:** `src/PBXCoreREST/Lib/YourResource/*Action.php`
4. **DataStructure:** `src/PBXCoreREST/Lib/YourResource/DataStructure.php`

Auto-generated routes:
- `GET /pbxcore/api/v3/your-resource` → getList
- `GET /pbxcore/api/v3/your-resource/{id}` → getRecord
- `POST /pbxcore/api/v3/your-resource` → create
- `PUT /pbxcore/api/v3/your-resource/{id}` → update
- `PATCH /pbxcore/api/v3/your-resource/{id}` → patch
- `DELETE /pbxcore/api/v3/your-resource/{id}` → delete

Custom methods (Google API Design):
- Collection: `GET /resource:method`
- Resource: `GET /resource/{id}:method`

**Important:** When using array-based `idPattern` (e.g., `['SIP-', 'IAX-', 'SIP-TRUNK-']`), the router automatically generates patterns that exclude colons and slashes (`[^/:]+`) to ensure proper parsing of `/{id}:method` routes.

## HTTP Status Codes

```
200 OK                      # GET, PUT, PATCH, DELETE success
201 Created                 # POST success
400 Bad Request             # Invalid format
401 Unauthorized            # No/invalid auth
403 Forbidden               # No permission
404 Not Found               # Resource missing
409 Conflict                # Duplicate/constraint
422 Unprocessable Entity    # Validation error
500 Internal Server Error   # Unexpected error
```

## Testing

```bash
# Login and extract token
TOKEN=$(curl -s -X POST http://127.0.0.1:8081/pbxcore/api/v3/auth:login \
  -d "login=admin&password=123456789MikoPBX%231" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

# Test validation (should return 422)
curl -s -X POST "http://127.0.0.1:8081/pbxcore/api/v3/call-queues" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","timeout":500}' | python3 -m json.tool

# PHPStan check
docker exec <container> vendor/bin/phpstan analyse \
  "src/PBXCoreREST/Lib/YourResource/*.php"
```

## Key Patterns & Rules

### ✅ Single Source of Truth Pattern
- ALL field definitions in `DataStructure::getParameterDefinitions()`
- Auto-generate sanitization rules from definitions
- Controllers use `#[ApiParameterRef]` to reference definitions
- NO duplicate field definitions anywhere

### ✅ 7-Phase SaveRecordAction
1. **SANITIZATION** - Security first
2. **REQUIRED VALIDATION** - Fail fast
3. **DETERMINE OPERATION** - New vs existing
4. **APPLY DEFAULTS** - CREATE only, never UPDATE/PATCH
5. **SCHEMA VALIDATION** - After defaults
6. **SAVE** - Transaction wrapper
7. **RESPONSE** - Consistent format

### ✅ PATCH Support
- Use `isset()` checks for all field assignments
- Never apply defaults on UPDATE/PATCH
- Preserve existing values for missing fields

### ❌ NEVER
- Use ParameterSanitizationExtractor (legacy)
- Define sanitization rules inline in actions
- Apply defaults on UPDATE/PATCH operations
- Skip WHY comments in SaveRecordAction phases

## Reference Implementations

Study these as perfect examples:
- **CallQueues** - Complete 7-phase pattern, nested members
- **IvrMenu** - Complex nested actions array
- **Providers** - Polymorphic schema (SIP/IAX), password masking
- **Firewall** - Security validation, nested rules, inheritance
- **Employees** - Multi-entity save (Users + Extensions + Sip)

## External Resources

- [Google API Design Guide](https://cloud.google.com/apis/design)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [HTTP Status Codes](https://httpstatuses.com/)