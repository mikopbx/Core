# Password Management API Controllers

This directory contains controllers for password management REST API endpoints in MikoPBX.

## Overview

The Password Management API provides comprehensive functionality for password validation, generation, and security checks. It supports both single and batch operations for efficient processing.

## Available Endpoints

### GET Endpoints

#### `GET /pbxcore/api/v2/passwords/generate`

Generate a cryptographically secure password.

**Query Parameters:**
- `length` (int): Password length, 8-128 characters (default: 16)
- `includeNumbers` (bool): Include numeric characters (default: true)
- `includeSpecial` (bool): Include special characters (default: true)
- `includeLowercase` (bool): Include lowercase letters (default: true)
- `includeUppercase` (bool): Include uppercase letters (default: true)

**Example:**
```bash
curl http://127.0.0.1/pbxcore/api/v2/passwords/generate?length=24
```

### POST Endpoints

#### `POST /pbxcore/api/v2/passwords/validate`

Validate a single password against security requirements.

**Request Body:**
```json
{
  "password": "string",
  "field": "string",      // Optional: WebAdminPassword, SSHPassword, secret, etc.
  "skipDictionary": false // Optional: Skip dictionary check for performance
}
```

**Response:**
```json
{
  "result": true,
  "data": {
    "isValid": true,
    "score": 85,
    "strength": "strong",
    "isDefault": false,
    "isSimple": false,
    "isTooShort": false,
    "isTooLong": false,
    "messages": [],
    "suggestions": []
  }
}
```

#### `POST /pbxcore/api/v2/passwords/checkDictionary`

Check if a password exists in the common passwords dictionary.

**Request Body:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "result": true,
  "data": {
    "isInDictionary": false,
    "message": "Password is acceptable"
  }
}
```

#### `POST /pbxcore/api/v2/passwords/batchValidate`

Validate multiple passwords with different contexts in a single request.

**Request Body:**
```json
{
  "passwords": [
    {
      "password": "Admin123!",
      "field": "WebAdminPassword"
    },
    {
      "password": "Ssh@2024",
      "field": "SSHPassword"
    }
  ],
  "skipDictionary": false
}
```

**Response:**
```json
{
  "result": true,
  "data": {
    "WebAdminPassword": {
      "isValid": true,
      "score": 75,
      "strength": "good",
      // ... full validation details
    },
    "SSHPassword": {
      "isValid": true,
      "score": 80,
      "strength": "strong",
      // ... full validation details
    }
  }
}
```

#### `POST /pbxcore/api/v2/passwords/batchCheckDictionary`

Check multiple passwords against the dictionary in a single request.

**Request Body:**
```json
{
  "passwords": ["password1", "admin123", "MyStr0ngP@ss", "qwerty"],
  "returnDetails": true  // Optional: Include detailed messages
}
```

**Response:**
```json
{
  "result": true,
  "data": {
    "results": {
      "0": true,   // In dictionary
      "1": true,   // In dictionary
      "2": false,  // Not in dictionary
      "3": true    // In dictionary
    },
    "weakCount": 3,
    "weakIndexes": [0, 1, 3],
    "details": {
      "0": {
        "isInDictionary": true,
        "message": "Password found in common passwords dictionary"
      },
      // ... details for each password
    }
  }
}
```

## Field Context Mapping

The API automatically maps field names to validation contexts:

| Field Name | Context | Description |
|------------|---------|-------------|
| `WebAdminPassword` | WEB_ADMIN | Web admin interface password |
| `SSHPassword` | SSH | SSH access password |
| `secret`, `sip_secret` | SIP | SIP endpoint secret |
| `ami_secret` | AMI | Asterisk Manager Interface secret |
| `provider_secret` | PROVIDER | Provider/trunk password |

## Password Strength Levels

| Strength | Score Range | Description |
|----------|-------------|-------------|
| `very_weak` | 0-20 | Extremely vulnerable |
| `weak` | 21-40 | Easily compromised |
| `fair` | 41-60 | Minimum acceptable |
| `good` | 61-80 | Reasonably secure |
| `strong` | 81-100 | Highly secure |

## Security Requirements by Context

Different password contexts have different minimum requirements:

- **Web Admin & SSH**: Minimum score of 40 (fair strength)
- **SIP & AMI**: Minimum score of 30
- **Provider**: No minimum score requirement

## Performance Considerations

### Single vs Batch Operations

Use batch operations when validating or checking multiple passwords:

- **Single check**: ~50ms per password
- **Batch check (10 passwords)**: ~60ms total (10x faster)

### Dictionary Checks

- Dictionary checks add ~10-20ms per password
- Use `skipDictionary: true` for real-time validation
- Always check dictionary before saving passwords

## Error Handling

All endpoints return consistent error responses:

```json
{
  "result": false,
  "messages": {
    "error": ["Error description"]
  },
  "function": "actionName",
  "processor": "PasswordsManagementProcessor"
}
```

## Usage Examples

### JavaScript (Frontend)

```javascript
// Validate password
$.api({
    url: '/pbxcore/api/v2/passwords/validate',
    method: 'POST',
    data: {
        password: $('#password').val(),
        field: 'WebAdminPassword'
    },
    onSuccess(response) {
        if (response.data.isValid) {
            console.log('Password is valid');
        } else {
            console.log('Suggestions:', response.data.suggestions);
        }
    }
});

// Generate password
$.api({
    url: '/pbxcore/api/v2/passwords/generate',
    method: 'GET',
    data: { length: 20 },
    onSuccess(response) {
        $('#password').val(response.data.password);
    }
});
```

### PHP (Backend)

```php
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

// Batch check passwords
$client = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
    '/pbxcore/api/v2/passwords/batchCheckDictionary',
    PBXCoreRESTClientProvider::HTTP_METHOD_POST
]);

$result = $client->sendRequest([
    'passwords' => ['pass1', 'pass2', 'pass3']
]);

if ($result && isset($result->data->weakIndexes)) {
    foreach ($result->data->weakIndexes as $index) {
        // Handle weak password at index
    }
}
```

## Testing

### Unit Tests
```bash
# Test password validation
curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/validate \
  -H "Content-Type: application/json" \
  -d '{"password":"TestP@ss123","field":"WebAdminPassword"}'

# Test batch operations
curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/batchCheckDictionary \
  -H "Content-Type: application/json" \
  -d '{"passwords":["password","123456","admin","MySecureP@ss2024"]}'
```

### Performance Testing
```bash
# Test batch performance (100 passwords)
time curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/batchValidate \
  -H "Content-Type: application/json" \
  -d @passwords.json
```

## Related Files

- **Controllers**: `GetController.php`, `PostController.php`
- **Processor**: `src/PBXCoreREST/Lib/PasswordsManagementProcessor.php`
- **Actions**: `src/PBXCoreREST/Lib/Passwords/*.php`
- **Service**: `src/PBXCoreREST/Services/PasswordService.php`
- **Frontend Widget**: `sites/admin-cabinet/assets/js/src/FormElements/password-widget.js`