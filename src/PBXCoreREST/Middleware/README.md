# MikoPBX REST API Middleware Architecture

This document describes the middleware chain architecture for MikoPBX REST API and how to properly integrate security and validation middleware.

## Middleware Chain Order

The middleware should be executed in the following order:

```
1. AuthenticationMiddleware  → Who are you?
2. UnifiedSecurityMiddleware → What can you access?
3. ApiValidationMiddleware   → Are your parameters valid?
4. Controller               → Execute the action
```

## Middleware Responsibilities

### 1. AuthenticationMiddleware
**Purpose:** Basic authentication and user identification
**Responsibilities:**
- Validate Bearer tokens and set token context
- Check localhost access (127.0.0.1, ::1)
- Validate session authentication
- Check public endpoints
- Check module no-auth requests
- Set authentication context in request object

**What it sets in request:**
- `tokenInfo` - Bearer token information and scopes
- Session validation status
- Authentication type used

### 2. UnifiedSecurityMiddleware
**Purpose:** Resource-based access control using PHP 8 attributes
**Responsibilities:**
- Read `ResourceSecurity` attributes from controllers
- Check resource:action permissions (e.g., `call_queues:read`, `call_queues:write`)
- Use authentication context set by AuthenticationMiddleware
- Enforce fine-grained access control
- Log access attempts for auditing

**What it checks:**
- ResourceSecurity attributes on controllers/methods
- Token scopes for API key access
- User permissions for session access
- Security type priority (PUBLIC → LOCALHOST → API_KEY → SESSION)

### 3. ApiValidationMiddleware
**Purpose:** Request parameter validation using PHP 8 attributes
**Responsibilities:**
- Validate request parameters against ApiParameter attributes
- Type checking and conversion
- Required field validation
- Format validation (regex, enum values)
- Sanitize and normalize input data

**What it validates:**
- Parameter types (string, integer, boolean)
- Required parameters
- String length, number ranges
- Enum values and regex patterns
- Custom validation rules

## Integration Example

### Controller with Full Middleware Chain

```php
<?php
namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Attributes\{
    ResourceSecurity,
    SecurityType,
    ActionType,
    ApiParameter,
    ParameterLocation
};

/**
 * Call Queues REST Controller
 */
#[ResourceSecurity('call_queues', requirements: [SecurityType::LOCALHOST, SecurityType::SESSION, SecurityType::API_KEY])]
class RestController extends BaseRestController
{
    /**
     * Get specific call queue
     */
    #[ResourceSecurity('call_queues', ActionType::READ)]
    #[ApiParameter('id', 'string', 'Call queue ID', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$')]
    public function getRecord(string $id): void
    {
        // Implementation
    }

    /**
     * Create new call queue
     */
    #[ResourceSecurity('call_queues', ActionType::WRITE)]
    #[ApiParameter('name', 'string', 'Queue name', ParameterLocation::BODY, required: true, maxLength: 100)]
    #[ApiParameter('extension', 'string', 'Extension number', ParameterLocation::BODY, required: true, pattern: '^[0-9]{2,8}$')]
    public function create(): void
    {
        // Implementation
    }
}
```

## Middleware Flow Example

### Successful Request Flow:
```
1. AuthenticationMiddleware
   ✓ Bearer token valid → sets tokenInfo in request

2. UnifiedSecurityMiddleware
   ✓ Reads ResourceSecurity('call_queues', ActionType::READ)
   ✓ Checks tokenInfo has 'call_queues:read' scope
   ✓ Access granted

3. ApiValidationMiddleware
   ✓ Validates 'id' parameter matches QUEUE-[A-Z0-9]+ pattern
   ✓ Parameters valid

4. Controller
   ✓ Execute getRecord() action
```

### Failed Request Flow:
```
1. AuthenticationMiddleware
   ✗ Invalid Bearer token → 401 Unauthorized (chain stops)

OR

1. AuthenticationMiddleware
   ✓ Valid Bearer token

2. UnifiedSecurityMiddleware
   ✗ Token lacks required scope → 403 Forbidden (chain stops)

OR

1. AuthenticationMiddleware
   ✓ Valid Bearer token

2. UnifiedSecurityMiddleware
   ✓ Access granted

3. ApiValidationMiddleware
   ✗ Invalid parameter format → 400 Bad Request (chain stops)
```

## Security Types Priority

UnifiedSecurityMiddleware checks security types in priority order:

1. **PUBLIC** (priority 1) - No authentication required
2. **LOCALHOST** (priority 2) - Only 127.0.0.1 access
3. **API_KEY** (priority 3) - Bearer token with scopes
4. **SESSION** (priority 4) - Web session with ACL

Higher priority types are checked first. If any type grants access, the check succeeds.

## Common Patterns

### API Key Management (Security Isolation)
```php
#[ResourceSecurity('api_keys', requirements: [SecurityType::LOCALHOST, SecurityType::SESSION])]
// No API_KEY access - prevents API keys from managing themselves
```

### Public Endpoints
```php
#[ResourceSecurity('webhooks', requirements: [SecurityType::PUBLIC])]
// No authentication required
```

### Admin-Only Operations
```php
#[ResourceSecurity('system', ActionType::ADMIN, [SecurityType::LOCALHOST, SecurityType::SESSION])]
// Only localhost and admin sessions
```

### Read-Write Separation
```php
// Read access
#[ResourceSecurity('call_queues', ActionType::READ)]
public function getList(): void { }

// Write access (higher privilege required)
#[ResourceSecurity('call_queues', ActionType::WRITE)]
public function create(): void { }
```

## Best Practices

1. **Separation of Concerns**: Each middleware has a single responsibility
2. **Use Authentication Context**: Don't duplicate authentication logic
3. **Explicit Security**: Always define ResourceSecurity attributes
4. **Least Privilege**: Grant minimum required permissions
5. **Validation First**: Validate inputs before processing
6. **Consistent Patterns**: Use standard resource:action format
7. **Error Handling**: Provide clear error messages
8. **Logging**: Log security events for auditing

## Testing

When testing the middleware chain:

1. **Unit Tests**: Test each middleware independently
2. **Integration Tests**: Test the full chain with different scenarios
3. **Security Tests**: Test unauthorized access attempts
4. **Validation Tests**: Test parameter validation edge cases

## Migration Guide

### From Old Authentication System

1. Replace granular permission checks with ResourceSecurity attributes
2. Remove custom authentication logic from controllers
3. Use resource:action pattern instead of specific permission names
4. Update ACL configuration to match new patterns

### Adding New Controllers

1. Add ResourceSecurity attribute to class
2. Override security for specific methods if needed
3. Add ApiParameter attributes for validation
4. No need to modify RouterProvider or middleware configuration

This architecture provides a clean, maintainable, and secure foundation for the MikoPBX REST API.