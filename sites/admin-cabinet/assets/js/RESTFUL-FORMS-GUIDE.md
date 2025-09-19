# RESTful Forms Guide for MikoPBX

## Overview

This guide explains how to use the enhanced Form.js with automatic RESTful method detection for forms that work with the new REST API v3.

## Basic Usage

### 1. Simple Configuration with Auto-Detection

For forms that follow RESTful conventions (POST for create, PUT for update), simply enable auto-detection:

```javascript
class MyEntityModify {
    initializeForm() {
        Form.$formObj = this.$formObj;
        Form.validateRules = this.getValidateRules();
        Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
        Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
        
        // Enable RESTful API with auto-detection
        Form.apiSettings = {
            enabled: true,
            apiObject: MyEntityAPI,  // Your API client
            autoDetectMethod: true    // Auto-detect create/update based on id
        };
        
        Form.initialize();
    }
}
```

### 2. How Auto-Detection Works

When `autoDetectMethod: true` is set, Form.js will:

1. Check the value of the `id` field in the form
2. If `id` is empty or missing → use `create` method with `POST`
3. If `id` has a value → use `update` method with `PUT`

### 3. Custom ID Field

If your entity uses a different field name for the ID:

```javascript
Form.apiSettings = {
    enabled: true,
    apiObject: MyEntityAPI,
    autoDetectMethod: true,
    idField: 'uniqid'  // Use 'uniqid' instead of 'id'
};
```

### 4. Manual Method Specification

If you need custom methods or don't want auto-detection:

```javascript
Form.apiSettings = {
    enabled: true,
    apiObject: MyEntityAPI,
    saveMethod: 'customSave',  // Your custom method name
    httpMethod: 'PATCH'         // Your preferred HTTP method
};
```

### 5. Dynamic Method Override

You can still override methods in `cbBeforeSendForm` if needed:

```javascript
cbBeforeSendForm(settings) {
    const result = settings;
    
    // Override for specific conditions
    if (someSpecialCondition) {
        Form.apiSettings.saveMethod = 'specialSave';
        Form.apiSettings.httpMethod = 'POST';
    }
    
    return result;
}
```

## API Client Requirements

Your API client must have the standard RESTful methods:

```javascript
const MyEntityAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/my-entity',
    customMethods: {
        getDefault: ':getDefault'
    }
});

// These methods should be available:
// - MyEntityAPI.create(data, callback)  // for new records
// - MyEntityAPI.update(data, callback)  // for existing records
// - MyEntityAPI.get(id, callback)       // for loading record
// - MyEntityAPI.delete(id, callback)    // for deletion
```

## Migration Guide

### Before (Manual Detection)

```javascript
initializeForm() {
    // Manual detection in initialization
    const isNew = !$('#id').val();
    Form.apiSettings = {
        enabled: true,
        apiObject: ProviderAPI,
        saveMethod: isNew ? 'create' : 'update',
        httpMethod: isNew ? 'POST' : 'PUT'
    };
}

cbBeforeSendForm(settings) {
    // Or manual detection in callback
    const currentId = $('#id').val();
    const isNew = !currentId || currentId === '';
    Form.apiSettings.saveMethod = isNew ? 'create' : 'update';
    Form.apiSettings.httpMethod = isNew ? 'POST' : 'PUT';
}
```

### After (Auto-Detection)

```javascript
initializeForm() {
    // Just enable auto-detection
    Form.apiSettings = {
        enabled: true,
        apiObject: ProviderAPI,
        autoDetectMethod: true
    };
}

cbBeforeSendForm(settings) {
    // No need for manual detection
    // Just add your entity-specific data if needed
    settings.data.type = 'SIP';
}
```

## Benefits

1. **Less Code** - No need to manually check if record is new
2. **Consistency** - All forms use the same pattern
3. **RESTful** - Follows REST conventions automatically
4. **Flexible** - Can be overridden when needed
5. **Clean** - Separation of concerns (Form.js handles HTTP methods)

## Examples in MikoPBX

Forms already using auto-detection:
- `provider-sip-modify.js` - SIP providers
- `provider-iax-modify.js` - IAX providers

These forms demonstrate the simplified approach with automatic RESTful method detection.