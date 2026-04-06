# PbxDataTableIndex - Unified DataTable Base Class

## Overview

`PbxDataTableIndex` is a base class that provides unified functionality for DataTable-based index pages in MikoPBX. It handles common operations like data loading, permission checking, action buttons rendering, and empty state management.

## Features

- **Server-side ACL permission checking** - Automatically loads and checks permissions from the server
- **Dynamic action buttons** - Shows/hides buttons based on user permissions
- **Unified description truncation** - Multi-line text truncation with popup support
- **Two-step delete confirmation** - Integrated with DeleteSomething.js
- **Copy functionality** - Built-in support for copy action
- **Custom action buttons** - Add your own buttons with permission checks
- **Double-click editing** - Navigate to edit form on row double-click
- **Empty state management** - Automatic placeholder display when no data
- **Loading states** - Built-in loader during data fetching

## Usage

### Basic Example

```javascript
const myModuleIndex = {
    dataTableInstance: null,

    initialize() {
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'my-module-table',
            apiModule: MyModuleAPI,
            routePrefix: 'my-module',
            columns: [
                {
                    data: 'name',
                    render: function(data) {
                        return window.SecurityUtils.escapeHtml(data);
                    }
                },
                {
                    data: 'status',
                    className: 'center aligned'
                }
            ]
        });
        
        this.dataTableInstance.initialize();
    }
};
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tableId` | string | **required** | HTML table element ID |
| `apiModule` | object | **required** | API module with endpoints |
| `routePrefix` | string | **required** | URL route prefix (e.g., 'call-queues') |
| `columns` | array | **required** | DataTable column definitions |
| `translations` | object | `{}` | Translation keys for messages |
| `showSuccessMessages` | boolean | `false` | Show success message after delete |
| `showInfo` | boolean | `false` | Show DataTable info section |
| `actionButtons` | array | `['edit', 'delete']` | Standard action buttons to show |
| `customActionButtons` | array | `[]` | Custom action button definitions |
| `descriptionSettings` | object | See below | Description truncation settings |
| `onDataLoaded` | function | `null` | Callback after data loaded |
| `onDrawCallback` | function | `null` | Callback after table draw |
| `onPermissionsLoaded` | function | `null` | Callback after permissions loaded |
| `customDeleteHandler` | function | `null` | Custom delete handler |

### Description Settings

```javascript
descriptionSettings: {
    maxLines: 3,           // Maximum lines to show
    dynamicHeight: false,  // Enable dynamic height calculation
    calculateLines: null   // Function to calculate lines per row
}
```

### Custom Action Buttons

```javascript
customActionButtons: [
    {
        name: 'download',           // Permission name
        class: 'download-button',   // CSS class
        icon: 'download icon',      // Icon class
        tooltip: 'Download file',   // Tooltip text
        href: '#',                  // Link href (optional)
        includeId: true,           // Include data-value attribute
        onClick: function(recordId) {  // Click handler (optional)
            // Custom action
        }
    }
]
```

### Real Examples

#### IVR Menu
```javascript
const ivrMenuIndex = {
    dataTableInstance: null,

    initialize() {
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'ivr-menu-table',
            apiModule: IvrMenuAPI,
            routePrefix: 'ivr-menu',
            showSuccessMessages: true,
            actionButtons: ['edit', 'delete'], // No copy button
            translations: {
                deleteSuccess: globalTranslate.iv_IvrMenuDeleted,
                deleteError: globalTranslate.iv_ImpossibleToDeleteIvrMenu
            },
            descriptionSettings: {
                maxLines: 3,
                dynamicHeight: false
            },
            columns: [
                {
                    data: 'extension',
                    className: 'centered collapsing',
                    render: function(data) {
                        return window.SecurityUtils.escapeHtml(data) || '—';
                    }
                },
                {
                    data: 'name',
                    className: 'collapsing',
                    render: function(data) {
                        return window.SecurityUtils.escapeHtml(data) || '—';
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    orderable: false,
                    render: this.dataTableInstance.createDescriptionRenderer()
                }
            ]
        });
        
        this.dataTableInstance.initialize();
    }
};
```

#### Call Queues with Dynamic Description
```javascript
const callQueuesIndex = {
    dataTableInstance: null,

    initialize() {
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'call-queues-table',
            apiModule: CallQueuesAPI,
            routePrefix: 'call-queues',
            showSuccessMessages: false,
            actionButtons: ['edit', 'copy', 'delete'],
            translations: {
                deleteError: globalTranslate.cq_ImpossibleToDeleteCallQueue
            },
            descriptionSettings: {
                maxLines: 2,
                dynamicHeight: true,
                calculateLines: function(row) {
                    // More lines for queues with many agents
                    return row.members && row.members.length > 3 ? 4 : 2;
                }
            },
            columns: [
                {
                    data: null,
                    className: 'collapsing',
                    render: function(data, type, row) {
                        const icon = '<i class="users icon"></i>';
                        const name = window.SecurityUtils.escapeHtml(row.name);
                        const extension = window.SecurityUtils.escapeHtml(row.extension);
                        return `${icon} <strong>${name} &lt;${extension}&gt;</strong>`;
                    }
                },
                {
                    data: 'members',
                    className: 'collapsing',
                    render: function(data) {
                        if (!data || data.length === 0) {
                            return '<small>—</small>';
                        }
                        const membersHtml = data.map(member => {
                            return window.SecurityUtils.sanitizeExtensionsApiContent(member.represent);
                        }).join('<br>');
                        return `<small>${membersHtml}</small>`;
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    orderable: false,
                    render: this.dataTableInstance.createDescriptionRenderer()
                }
            ]
        });
        
        this.dataTableInstance.initialize();
    }
};
```

## HTML Template Requirements

Your Volt/HTML template should have this structure:

```html
<!-- Add button (initially hidden) -->
{% if isAllowed('save') %}
    <div id="add-new-button" style="display:none">
        {{ link_to("my-module/modify", 
                  '<i class="add circle icon"></i> Add New Item', 
                  "class": "ui blue button") }}
    </div>
{% endif %}

<!-- Table container -->
<div id="my-module-table-container" style="display:none">
    <table class="ui selectable compact unstackable table" id="my-module-table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Status</th>
                <th></th> <!-- Action column -->
            </tr>
        </thead>
        <tbody>
            <!-- DataTable will populate this -->
        </tbody>
    </table>
</div>

<!-- Empty placeholder -->
<div id="empty-table-placeholder" style="display:none">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'folder open',
        'title': 'No items found',
        'description': 'Create your first item to get started'
    ]) }}
</div>
```

## Security Considerations

Always escape user data to prevent XSS attacks:

```javascript
render: function(data) {
    // For plain text
    return window.SecurityUtils.escapeHtml(data);
    
    // For extension representations with icons
    return window.SecurityUtils.sanitizeExtensionsApiContent(data);
}
```

## API Module Requirements

Your API module should have:

```javascript
const MyModuleAPI = {
    endpoints: {
        getList: `${globalRootUrl}my-module/list`
    },
    
    deleteRecord(id, callback) {
        $.api({
            url: `${globalRootUrl}my-module/delete/${id}`,
            method: 'DELETE',
            on: 'now',
            onSuccess(response) {
                callback(response);
            }
        });
    }
};
```

## Permission System

The class automatically loads permissions from `/acl/checkPermissions` endpoint. The server should return:

```json
{
    "success": true,
    "data": {
        "save": true,
        "modify": true,
        "edit": true,
        "delete": false,
        "copy": true,
        "custom": {
            "download": true
        }
    }
}
```

## Troubleshooting

1. **Table not showing**: Check that container ID follows the pattern `{tableId}-container`
2. **Buttons not appearing**: Verify permissions are loaded correctly
3. **Description not truncating**: Ensure you're using `createDescriptionRenderer()`
4. **Delete not working**: Check that DeleteSomething.js is loaded

## Migration Guide

To migrate existing DataTable code:

1. Remove manual DataTable initialization
2. Remove custom delete handlers
3. Remove empty state management code
4. Create PbxDataTableIndex instance with configuration
5. Call `initialize()` method

Before:
```javascript
// 200+ lines of DataTable code
```

After:
```javascript
// 30-50 lines using PbxDataTableIndex
```