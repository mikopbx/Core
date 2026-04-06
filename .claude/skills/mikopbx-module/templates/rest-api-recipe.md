# Template: REST API v3 Recipe Files

## Before generating, READ these canonical examples:

- Controller: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Controller.php`
- Processor: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Processor.php`
- DataStructure: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/DataStructure.php`
- GetListAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/GetListAction.php`
- GetRecordAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/GetRecordAction.php`
- SaveRecordAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/SaveRecordAction.php`
- DeleteRecordAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/DeleteRecordAction.php`

## File Inventory

Per resource (e.g., "Numbers" for a blacklist module):

1. `Lib/RestAPI/{Resource}/Controller.php`
2. `Lib/RestAPI/{Resource}/Processor.php`
3. `Lib/RestAPI/{Resource}/DataStructure.php`
4. `Lib/RestAPI/{Resource}/Actions/GetListAction.php`
5. `Lib/RestAPI/{Resource}/Actions/GetRecordAction.php`
6. `Lib/RestAPI/{Resource}/Actions/SaveRecordAction.php`
7. `Lib/RestAPI/{Resource}/Actions/DeleteRecordAction.php`

Optional:
8. `Lib/RestAPI/{Resource}/Actions/GetDefaultAction.php`
9. `Lib/RestAPI/{Resource}/Actions/DownloadFileAction.php`
10. `Lib/RestAPI/{Resource}/Actions/UploadFileAction.php`

## Key Architecture

### Auto-Discovery (v3)

No manual route registration needed. The system auto-discovers controllers via:
- `ControllerDiscovery::discoverModuleControllers()`
- Controllers use PHP 8 attributes for route declaration

### Controller (PHP 8 Attributes)

```php
#[ApiResource(
    module: 'Module{Feature}',
    resource: '{resource}',
    description: 'Resource description'
)]
class Controller extends BaseController
{
    #[HttpMapping(method: 'GET', path: '')]
    #[ApiOperation(summary: 'Get list of records')]
    public function getList(): void { /* ... */ }

    #[HttpMapping(method: 'GET', path: '/{id}')]
    #[ApiOperation(summary: 'Get record by ID')]
    public function getRecord(string $id): void { /* ... */ }

    #[HttpMapping(method: 'POST', path: '')]
    #[ApiOperation(summary: 'Create record')]
    public function create(): void { /* ... */ }

    // ... PUT, PATCH, DELETE
}
```

### 7-Phase Action Pattern

Every Action class follows the 7-phase processing pattern:

1. **Sanitization** — Clean user input
2. **Required Validation** — Check mandatory fields (POST/PUT only, NOT PATCH)
3. **Determine Operation** — Find existing record
4. **Apply Defaults** — POST only, NEVER PATCH
5. **Schema Validation** — Validate against DataStructure
6. **Execute Business Logic** — Database operations
7. **Format Response** — Transform to API format

### DataStructure

Defines parameter schema for OpenAPI and validation:

```php
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'field_name' => [
                    'type' => 'string',
                    'description' => 'Field description',
                    'example' => 'example_value',
                    'required' => true,
                    'maxLength' => 255,
                ],
            ],
            'response' => [
                // Response-only fields
            ],
        ];
    }
}
```

## Config Class

For REST API v3, the Conf.php does NOT need `getPBXCoreRESTAdditionalRoutes()`.
Auto-discovery handles route registration.
