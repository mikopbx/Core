# DataStructure Specification

Complete reference for implementing DataStructure.php in MikoPBX REST API endpoints.

## Overview

`DataStructure.php` is the **single source of truth** for API parameter definitions. It serves two purposes:
1. **OpenAPI Documentation** - Auto-generates OpenAPI 3.1.0 specification
2. **Runtime Validation** - Provides schema for request/response validation

## Required Structure

Every DataStructure.php must implement:

### 1. getParameterDefinitions() Method

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\YourResource;

class DataStructure
{
    /**
     * Get parameter definitions for OpenAPI documentation and validation
     *
     * @return array{request: array, response: array}
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                // All parameters the endpoint accepts
            ],
            'response' => [
                // All fields the endpoint returns
            ],
        ];
    }
}
```

### 2. Request Section

Defines all input parameters accepted by POST/PUT/PATCH endpoints:

```php
'request' => [
    'id' => [
        'type' => 'string',
        'description' => 'Unique identifier of the resource',
        'required' => false,  // Usually false for POST, required for PUT
        'example' => 'resource-uuid-123',
    ],
    'name' => [
        'type' => 'string',
        'description' => 'Human-readable name of the resource',
        'required' => true,
        'maxLength' => 255,
        'example' => 'Example Resource Name',
    ],
    'number' => [
        'type' => 'integer',
        'description' => 'Numeric identifier or extension number',
        'required' => true,
        'minimum' => 100,
        'maximum' => 99999,
        'example' => 201,
    ],
    'status' => [
        'type' => 'string',
        'description' => 'Current status of the resource',
        'required' => false,
        'enum' => ['active', 'inactive', 'pending'],
        'default' => 'active',
        'example' => 'active',
    ],
    'email' => [
        'type' => 'string',
        'description' => 'Contact email address',
        'required' => false,
        'format' => 'email',
        'maxLength' => 255,
        'example' => 'user@example.com',
    ],
    'phone' => [
        'type' => 'string',
        'description' => 'Contact phone number',
        'required' => false,
        'pattern' => '^\+?[1-9]\d{1,14}$',  // E.164 format
        'example' => '+12025551234',
    ],
],
```

### 3. Response Section

Defines all fields returned by GET/POST/PUT/PATCH endpoints:

```php
'response' => [
    'id' => [
        'type' => 'string',
        'description' => 'Unique identifier of the resource',
        'example' => 'resource-uuid-123',
    ],
    'name' => [
        'type' => 'string',
        'description' => 'Human-readable name of the resource',
        'example' => 'Example Resource Name',
    ],
    'number' => [
        'type' => 'integer',
        'description' => 'Numeric identifier or extension number',
        'example' => 201,
    ],
    'status' => [
        'type' => 'string',
        'description' => 'Current status of the resource',
        'example' => 'active',
    ],
    'email' => [
        'type' => 'string',
        'description' => 'Contact email address',
        'example' => 'user@example.com',
    ],
    'phone' => [
        'type' => 'string',
        'description' => 'Contact phone number',
        'example' => '+12025551234',
    ],
    'created_at' => [
        'type' => 'string',
        'format' => 'date-time',
        'description' => 'Timestamp when resource was created',
        'example' => '2024-01-15T10:30:00Z',
    ],
    'updated_at' => [
        'type' => 'string',
        'format' => 'date-time',
        'description' => 'Timestamp when resource was last updated',
        'example' => '2024-01-15T14:20:00Z',
    ],
],
```

## Parameter Attributes

### Required Attributes

Every parameter MUST have:

#### type
- **Purpose**: Defines the data type
- **Values**: `string`, `integer`, `number`, `boolean`, `array`, `object`
- **Example**: `'type' => 'string'`

#### description
- **Purpose**: Human-readable explanation
- **Guidelines**:
  - Be specific and clear
  - Mention format requirements
  - Include validation rules
- **Example**: `'description' => 'Extension number (2-8 digits)'`

#### example
- **Purpose**: Sample value for documentation and testing
- **Guidelines**:
  - Use realistic data
  - Follow format/pattern requirements
  - Don't use placeholder values like "xxx" or "123"
- **Example**: `'example' => 201`

### Request-Only Attributes

These attributes only apply to 'request' section:

#### required
- **Purpose**: Indicates if parameter is mandatory
- **Values**: `true`, `false`
- **Rules**:
  - Set `true` for essential fields
  - Set `false` for optional fields
  - 'id' is usually `false` for POST (auto-generated)
- **Example**: `'required' => true`

#### default
- **Purpose**: Default value when parameter not provided
- **Rules**:
  - Only used on POST (creating new records)
  - NEVER applied on PATCH (partial updates)
  - Should match the 'type'
- **Example**: `'default' => 'active'`

### Validation Constraint Attributes

#### minimum / maximum
- **Purpose**: Numeric range validation
- **Applies to**: `integer`, `number` types
- **Example**:
  ```php
  'age' => [
      'type' => 'integer',
      'minimum' => 18,
      'maximum' => 120,
  ]
  ```

#### minLength / maxLength
- **Purpose**: String length validation
- **Applies to**: `string` type
- **Example**:
  ```php
  'username' => [
      'type' => 'string',
      'minLength' => 3,
      'maxLength' => 32,
  ]
  ```

#### pattern
- **Purpose**: Regular expression validation
- **Applies to**: `string` type
- **Format**: PHP regex pattern (without delimiters)
- **Example**:
  ```php
  'extension' => [
      'type' => 'string',
      'pattern' => '^\d{2,8}$',  // 2-8 digits
      'example' => '201',
  ]
  ```

#### enum
- **Purpose**: Restrict to specific values
- **Applies to**: `string`, `integer` types
- **Example**:
  ```php
  'type' => [
      'type' => 'string',
      'enum' => ['SIP', 'IAX', 'QUEUE', 'IVR'],
      'example' => 'SIP',
  ]
  ```

#### format
- **Purpose**: Semantic validation for special types
- **Values**: `email`, `date`, `date-time`, `uri`, `uuid`
- **Example**:
  ```php
  'created_at' => [
      'type' => 'string',
      'format' => 'date-time',
      'example' => '2024-01-15T10:30:00Z',
  ]
  ```

## getRelatedSchemas() Method

Optional method to document relationships:

```php
/**
 * Get list of related schemas for this resource
 *
 * @return array<string> List of related resource names
 */
public static function getRelatedSchemas(): array
{
    return [
        'Employee',     // Employee model
        'Sip',          // SIP configuration
        'CallQueue',    // Call queue
    ];
}
```

**Purpose**: Documents foreign key relationships for OpenAPI spec

## Complete Example

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Extensions;

/**
 * DataStructure for Extensions resource
 */
class DataStructure
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'Unique identifier of the extension',
                    'required' => false,
                    'example' => 'ext-uuid-123',
                ],
                'number' => [
                    'type' => 'string',
                    'description' => 'Extension number (2-8 digits)',
                    'required' => true,
                    'pattern' => '^\d{2,8}$',
                    'example' => '201',
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'Type of extension',
                    'required' => true,
                    'enum' => ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'],
                    'example' => 'SIP',
                ],
                'callerid' => [
                    'type' => 'string',
                    'description' => 'Caller ID display name',
                    'required' => false,
                    'maxLength' => 50,
                    'default' => '',
                    'example' => 'John Doe',
                ],
                'email' => [
                    'type' => 'string',
                    'description' => 'Email address for voicemail notifications',
                    'required' => false,
                    'format' => 'email',
                    'maxLength' => 255,
                    'example' => 'john.doe@example.com',
                ],
                'mobile_number' => [
                    'type' => 'string',
                    'description' => 'Mobile phone number for forwarding',
                    'required' => false,
                    'pattern' => '^\+?[1-9]\d{1,14}$',
                    'example' => '+12025551234',
                ],
                'show_in_phonebook' => [
                    'type' => 'string',
                    'description' => 'Display in company phonebook',
                    'required' => false,
                    'enum' => ['0', '1'],
                    'default' => '1',
                    'example' => '1',
                ],
            ],

            'response' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'Unique identifier of the extension',
                    'example' => 'ext-uuid-123',
                ],
                'number' => [
                    'type' => 'string',
                    'description' => 'Extension number',
                    'example' => '201',
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'Type of extension',
                    'example' => 'SIP',
                ],
                'callerid' => [
                    'type' => 'string',
                    'description' => 'Caller ID display name',
                    'example' => 'John Doe',
                ],
                'email' => [
                    'type' => 'string',
                    'description' => 'Email address',
                    'example' => 'john.doe@example.com',
                ],
                'mobile_number' => [
                    'type' => 'string',
                    'description' => 'Mobile phone number',
                    'example' => '+12025551234',
                ],
                'show_in_phonebook' => [
                    'type' => 'string',
                    'description' => 'Phonebook visibility',
                    'example' => '1',
                ],
                'created_at' => [
                    'type' => 'string',
                    'format' => 'date-time',
                    'description' => 'Creation timestamp',
                    'example' => '2024-01-15T10:30:00Z',
                ],
                'updated_at' => [
                    'type' => 'string',
                    'format' => 'date-time',
                    'description' => 'Last update timestamp',
                    'example' => '2024-01-15T14:20:00Z',
                ],
            ],
        ];
    }

    public static function getRelatedSchemas(): array
    {
        return ['Employee', 'Sip'];
    }
}
```

## Validation Rules

### Must Have

- ✅ `getParameterDefinitions()` method
- ✅ `request` section with all input parameters
- ✅ `response` section with all output fields
- ✅ Every parameter has `type`
- ✅ Every parameter has `description`
- ✅ Every parameter has `example`
- ✅ Request parameters have `required` flag
- ✅ Validation constraints where applicable

### Must NOT Have

- ❌ `getParametersConfig()` method (legacy)
- ❌ Empty descriptions
- ❌ Generic examples like "example" or "test"
- ❌ Missing required fields

## Best Practices

1. **Be Specific**: Descriptions should explain purpose, not just repeat name
   - ❌ Bad: `'name' => 'Name'`
   - ✅ Good: `'Extension display name shown in phonebook'`

2. **Use Realistic Examples**: Examples used in auto-generated tests
   - ❌ Bad: `'example' => 'xxx'`
   - ✅ Good: `'example' => '201'`

3. **Add Validation Constraints**: Prevent invalid data at API level
   - ✅ Add `minimum`/`maximum` for numbers
   - ✅ Add `maxLength` for strings
   - ✅ Add `pattern` for format validation
   - ✅ Add `enum` for fixed value lists

4. **Keep Request/Response Aligned**: Fields in request usually in response too
   - Exception: Read-only fields like `created_at`, `updated_at`
   - Exception: Write-only fields like `password`

5. **Document Relationships**: Use `getRelatedSchemas()` for clarity

## Common Patterns

### ID Field (Usually Optional for POST)
```php
'id' => [
    'type' => 'string',
    'description' => 'Unique identifier (auto-generated if not provided)',
    'required' => false,  // False for POST, system generates if missing
    'example' => 'resource-uuid-123',
],
```

### Status/Flag Fields
```php
'enabled' => [
    'type' => 'string',
    'description' => 'Enable/disable resource',
    'required' => false,
    'enum' => ['0', '1'],
    'default' => '1',
    'example' => '1',
],
```

### Foreign Key References
```php
'employee_id' => [
    'type' => 'string',
    'description' => 'Reference to Employee resource ID',
    'required' => true,
    'example' => 'emp-uuid-456',
],
```

### Timestamp Fields (Response Only)
```php
'created_at' => [
    'type' => 'string',
    'format' => 'date-time',
    'description' => 'Resource creation timestamp (ISO 8601)',
    'example' => '2024-01-15T10:30:00Z',
],
```

## Integration with OpenAPI

DataStructure automatically generates OpenAPI 3.1.0 specification:

- `request` → `requestBody.content.application/json.schema`
- `response` → `responses.200.content.application/json.schema`
- `type` → OpenAPI type
- `required: true` → `required: [...]` array
- `enum` → OpenAPI enum
- `pattern` → OpenAPI pattern
- `format` → OpenAPI format

## Troubleshooting

### OpenAPI spec not updating
- Clear cache: `rm -f /tmp/mikopbx_openapi.json`
- Restart container to regenerate spec

### Validation not working
- Check `SCHEMA_VALIDATION_STRICT=1` environment variable
- Verify DataStructure is loaded correctly

### Missing parameters in OpenAPI
- Ensure parameter is in `request` section
- Check parameter has all required attributes
- Verify no PHP syntax errors in DataStructure

## See Also

- [SaveRecordAction Pattern](saveaction-pattern.md) - Implementation guide
- [Validation Checklist](validation-checklist.md) - Complete checklist
- [Anti-Patterns](../examples/anti-patterns.md) - What to avoid
