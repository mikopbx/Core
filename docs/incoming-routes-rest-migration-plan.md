# Incoming Routes REST API Migration Plan

## Overview

This document outlines the migration plan for transitioning the Incoming Routes functionality from the current MVC architecture to the new REST API pattern, following the DialplanApplications implementation as a reference.

## Current Architecture Analysis

### Backend (MVC)
- **Controller**: `IncomingRoutesController.php`
  - `indexAction()` - Loads all routes, includes provider and extension data
  - `modifyAction()` - Handles create/edit with form generation
  - `saveAction()` - Processes form submissions with database transactions
  - `deleteAction()` - Deletes routes (imposible to delete default rule)
  - `changePriorityAction()` - Updates route priorities via AJAX

### Frontend
- **Index Page**: `incoming-route-index.js`
  - Table drag-and-drop for priority management
  - Default route handling with action dropdown
  - Direct AJAX calls for priority changes
- **Modify Page**: `incoming-route-modify.js`
  - Simple form with provider and extension dropdowns
  - Form validation
  - Direct form submission to controller

### Forms
- `DefaultIncomingRouteForm.php` - Default route configuration
- `IncomingRouteEditForm.php` - Individual route editing

## Target Architecture (REST API)

Following the DialplanApplications pattern, the new architecture will consist of:

### 1. REST API Controllers
```
src/PBXCoreREST/Controllers/IncomingRoutes/
├── GetController.php     # GET operations
├── PostController.php    # POST operations
├── PutController.php     # PUT operations
└── DeleteController.php  # DELETE operations
```

### 2. Processor & Actions
```
src/PBXCoreREST/Lib/
├── IncomingRoutesManagementProcessor.php
└── IncomingRoutes/
    ├── GetRecordAction.php
    ├── GetListAction.php
    ├── SaveRecordAction.php
    ├── DeleteRecordAction.php
    └── ChangePriorityAction.php
```

### 3. API Module
```
sites/admin-cabinet/assets/js/src/PbxAPI/incomingRoutesAPI.js
```

### 4. Updated Frontend
- Simplified controller (data loading via JS)
- Enhanced JavaScript modules with REST API integration
- Unified base class usage (PbxDataTableIndex)
- Add new js classes to src/AdminCabinet/Providers/AssetProvider.php

## Migration Steps

### Phase 1: Backend API Implementation

#### 1.1 Create REST Controllers
- [ ] Create `GetController.php`
  - Implement `getList` action
  - Implement `getRecord/{id}` action
  - Add CSRF protection
- [ ] Create `PostController.php`
  - Implement `saveRecord` action
  - Implement `deleteRecord` action
  - Implement `changePriority` action
  - Add CSRF protection
- [ ] Create `PutController.php`
  - Implement `saveRecord/{id}` action
  - Add CSRF protection 
- [ ] Create `DeleteController.php`
  - Implement `deleteRecord/{id}` action
  - Add CSRF protection 

#### 1.2 Create Processor & Actions
- [ ] Create `IncomingRoutesManagementProcessor.php`
  - Route requests to appropriate action classes
- [ ] Create action classes:
  - `GetListAction.php` - Include provider & extension data
  - `GetRecordAction.php` - Return single record or default structure
  - `SaveRecordAction.php` - Handle create/update with validation
  - `DeleteRecordAction.php` - Delete with constraint checking
  - `ChangePriorityAction.php` - Bulk priority updates

#### 1.3 Register Routes
- [ ] Add routes to `RouterProvider.php`:
```php
[IncomingRoutesGetController::class, 'callAction', '/pbxcore/api/v2/incoming-routes/{actionName}', 'get', '/'],
[IncomingRoutesPostController::class, 'callAction', '/pbxcore/api/v2/incoming-routes/{actionName}', 'post', '/'],
// etc.
```

### Phase 2: Frontend API Integration

#### 2.1 Create API Module
- [ ] Create `incomingRoutesAPI.js`:
  - Define endpoints
  - Implement `getRecord()`, `getList()`, `saveRecord()`, `deleteRecord()`
  - Add `changePriority()` for bulk updates
  - Include data sanitization

#### 2.2 Update JavaScript Modules

##### 2.2.1 Index Page (`incoming-route-index.js`)
- [ ] Convert to use PbxDataTableIndex base class
- [ ] Replace direct AJAX with API module calls
- [ ] Implement DataTable configuration:
```javascript
const incomingRoutesTable = {
    dataTableInstance: null,
    
    initialize() {
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'incoming-routes-table',
            apiModule: IncomingRoutesAPI,
            routePrefix: 'incoming-routes',
            actionButtons: ['edit', 'copy', 'delete'],
            columns: [
                // Column definitions
            ],
            onDrawCallback: this.cbOnTableDraw.bind(this)
        });
        
        // Initialize drag-and-drop after table draw
        this.dataTableInstance.onDrawCallback = () => {
            $('#routingTable').tableDnD({
                onDrop: this.cbOnDrop.bind(this),
                onDragClass: 'hoveringRow',
                dragHandle: '.dragHandle'
            });
        };
    }
};
```

##### 2.2.2 Default Route Handling
- [ ] Keep default route form separate (ID=1 special handling)
- [ ] Convert to REST API calls for get and save operation, may be load it from common getList call
- [ ] All dropdowns should load dynamicly like in the CallQueues module

##### 2.2.3 Modify Page (`incoming-route-modify.js`)
- [ ] Add REST API data loading:
```javascript
initializeForm() {
    const recordId = this.getRecordId();
    
    IncomingRoutesAPI.getRecord(recordId, (response) => {
        if (response.result) {
            this.populateForm(response.data);
            // Initialize dropdowns after data load
        }
    });
}
```
- [ ] Configure Form.js for REST:
```javascript
Form.apiSettings.enabled = true;
Form.apiSettings.apiObject = IncomingRoutesAPI;
Form.apiSettings.saveMethod = 'saveRecord';
```
- [ ] All dropdowns should load dynamicly like in the CallQueues module


### Phase 3: Controller Simplification

#### 3.1 Update IncomingRoutesController
- [ ] Remove all data loading logic from `indexAction()`
- [ ] Simplify `modifyAction()` to only create empty form
- [ ] Remove `saveAction()` (handled by REST)
- [ ] Remove `deleteAction()` (handled by REST)
- [ ] Remove `changePriorityAction()` (handled by REST)

Example simplified controller:
```php
class IncomingRoutesController extends BaseController
{
    public function indexAction(): void
    {
        // Default rule handling remains (but if possible put it in JS code as well)
        $defaultRule = IncomingRoutingTable::findFirstById(1);
        if ($defaultRule === null) {
            $defaultRule = IncomingRoutingTable::resetDefaultRoute();
        }
        
        // Create form for default rule only
        $form = new DefaultIncomingRouteForm($defaultRule, [
            'extensions' => [],  // Will be loaded by JS
            'soundfiles' => [],  // Will be loaded by JS
        ]);
        
        $this->view->form = $form;
    }
    
    public function modifyAction(string $ruleId = ''): void
    {
        if ((int)$ruleId === 1) {
            $this->forward('incoming-routes/index');
            return;
        }
        
        // Create empty form - JS will populate
        $emptyRoute = new IncomingRoutingTable();
        $this->view->form = new IncomingRouteEditForm($emptyRoute);
        $this->view->uniqid = $ruleId;
    }
}
```

### Phase 4: Special Considerations

#### 4.1 Provider Integration
- [ ] Ensure GetListAction includes provider details
- [ ] Handle provider type resolution (SIP, IAX, etc.)
- [ ] Include provider status in response

#### 4.2 Time-Based Routing
- [ ] Migrate OutWorkTimesRouts handling to SaveRecordAction
- [ ] Ensure time conditions are preserved during updates

#### 4.3 Priority Management
- [ ] Implement efficient bulk update in ChangePriorityAction
- [ ] Maintain drag-and-drop functionality
- [ ] Preserve priority 9999 for special routes

#### 4.4 Default Route
- [ ] Keep special handling for route ID=1
- [ ] Prevent deletion of default route
- [ ] Maintain separate form on index page

### Phase 5: Testing & Validation

#### 5.1 Unit Tests
- [ ] Test all REST endpoints
- [ ] Validate data sanitization
- [ ] Test constraint validation

#### 5.2 Integration Tests
- [ ] Test priority changes with drag-and-drop
- [ ] Verify provider associations
- [ ] Test time-based routing preservation
- [ ] Validate default route behavior

#### 5.3 UI/UX Testing
- [ ] Verify all CRUD operations
- [ ] Test form validation
- [ ] Ensure loading states
- [ ] Check error message display

### Phase 6: Migration & Cleanup

#### 6.1 Deployment
- [ ] Deploy REST API components
- [ ] Update frontend files
- [ ] Test in staging environment

#### 6.2 Cleanup
- [ ] Remove obsolete controller actions
- [ ] Clean up unused routes
- [ ] Update documentation

## Implementation Notes

### Data Structure
Incoming routes have complex relationships:
- Provider association (polymorphic: SIP/IAX/etc.)
- Extension forwarding
- Time-based routing rules
- Audio message playback

### Security Considerations
- CSRF protection on all modifying operations
- Input validation for priority values
- Provider existence validation
- Extension permission checking
- All JS code will have basic XSS protetion

### Performance Optimizations
- Eager load providers and extensions in GetListAction
- Batch priority updates in single transaction

### Backward Compatibility
- Maintain URL structure for bookmarks
- Keep form field names consistent
- Preserve module hook points
- No need to preserve old rest endpoints

## Success Criteria

1. All CRUD operations work through REST API
2. Drag-and-drop priority management preserved
3. Default route handling unchanged
4. Time-based routing maintained
5. No regression in functionality
6. Improved code maintainability
7. Consistent with DialplanApplications pattern