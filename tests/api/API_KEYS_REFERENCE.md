# API Keys Reference for General Settings Tests

This document maps PHP constant names to actual API keys returned by the General Settings endpoint.

## Important: Key Naming Convention

The API returns keys **exactly as they are stored in the database**, which are defined by the **constant VALUES** in `PbxSettingsConstantsTrait.php`, NOT the constant names.

## Common Keys Mapping

| PHP Constant | API Key | Description |
|--------------|---------|-------------|
| `PBX_NAME` | `Name` | PBX system name (NOT `PBXName`) |
| `PBX_DESCRIPTION` | `Description` | PBX description (NOT `PBXDescription`) |
| `PBX_VERSION` | `PBXVersion` | PBX version |
| `PBX_LANGUAGE` | `PBXLanguage` | PBX language |
| `WEB_ADMIN_LANGUAGE` | `WebAdminLanguage` | ⚠️ NOT in ALLOWED_SETTINGS |
| `SSH_LANGUAGE` | `SSHLanguage` | ⚠️ NOT in ALLOWED_SETTINGS |
| `PBX_TIMEZONE` | `PBXTimezone` | System timezone |

## Network & Ports

| PHP Constant | API Key | Description |
|--------------|---------|-------------|
| `WEB_PORT` | `WEBPort` | HTTP port |
| `WEB_HTTPS_PORT` | `WEBHTTPSPort` | HTTPS port |
| `SSH_PORT` | `SSHPort` | SSH port |
| `SIP_PORT` | `SIPPort` | SIP port |
| `TLS_PORT` | `TLS_PORT` | TLS port (NOT `TLSPort`) |
| `IAX_PORT` | `IAXPort` | IAX port |
| `AMI_PORT` | `AMIPort` | AMI port |
| `AJAM_PORT` | `AJAMPort` | AJAM port |
| `AJAM_PORT_TLS` | `AJAMPortTLS` | AJAM TLS port |
| `RTP_PORT_FROM` | `RTPPortFrom` | RTP port range start |
| `RTP_PORT_TO` | `RTPPortTo` | RTP port range end |

## Extensions & Features

| PHP Constant | API Key | Description |
|--------------|---------|-------------|
| `PBX_INTERNAL_EXTENSION_LENGTH` | `PBXInternalExtensionLength` | Extension length |
| `PBX_FEATURE_ATTENDED_TRANSFER` | `PBXFeatureAttendedTransfer` | Attended transfer code |
| `PBX_FEATURE_BLIND_TRANSFER` | `PBXFeatureBlindTransfer` | Blind transfer code |
| `PBX_FEATURE_PICKUP_EXTEN` | `PBXFeaturePickupExten` | Call pickup code |

## Security

| PHP Constant | API Key | Description |
|--------------|---------|-------------|
| `WEB_ADMIN_LOGIN` | `WebAdminLogin` | Web admin login |
| `WEB_ADMIN_PASSWORD` | `WebAdminPassword` | Web admin password (hashed) |
| `SSH_LOGIN` | `SSHLogin` | SSH login |
| `SSH_PASSWORD` | `SSHPassword` | SSH password (hashed) |
| `SSH_AUTHORIZED_KEYS` | `SSHAuthorizedKeys` | SSH authorized keys |
| `SSH_ID_RSA_PUB` | `SSH_ID_RSA_PUB` | SSH public key |

## Recording

| PHP Constant | API Key | Description |
|--------------|---------|-------------|
| `PBX_RECORD_CALLS` | `PBXRecordCalls` | Record external calls |
| `PBX_RECORD_CALLS_INNER` | `PBXRecordCallsInner` | Record internal calls |
| `PBX_SPLIT_AUDIO_THREAD` | `PBXSplitAudioThread` | Split audio threads |

## Usage in Tests

```python
# ✓ CORRECT - using actual API keys
patch_data = {
    'Name': 'My PBX',              # NOT 'PBXName'
    'Description': 'Test PBX',     # NOT 'PBXDescription'
    'TLS_PORT': 5061,              # NOT 'TLSPort'
}

# ✗ WRONG - using PHP constant names
patch_data = {
    'PBXName': 'My PBX',           # Will fail - key doesn't exist
    'PBXDescription': 'Test PBX',  # Will fail - key doesn't exist
    'TLSPort': 5061,               # Will fail - key doesn't exist
}
```

## How to Find the Correct Key

1. Check `src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php`
2. Look at the constant **VALUE** (right side of `=`), not the constant name
3. Example:
   ```php
   public const string PBX_NAME = 'Name';  // Use 'Name' in API tests
   //                   ^^^^^^^^   ^^^^^^
   //                   Constant   API Key (use this!)
   ```

## Reference File

Source: `/Users/nb/PhpstormProjects/mikopbx/Core/src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php`
