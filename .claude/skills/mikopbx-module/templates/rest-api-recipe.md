# Template: REST API v3 Recipe Files

## Before generating, READ these canonical examples:

- Controller: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Controller.php`
- Processor: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Processor.php`
- DataStructure: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/DataStructure.php`
- GetListAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/GetListAction.php`
- GetRecordAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/GetRecordAction.php`
- SaveRecordAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/SaveRecordAction.php`
- DeleteRecordAction: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/DeleteRecordAction.php`

## RESTful Design Gate

Before creating files, write a resource table with: resource noun, collection
path, identifier, allowed HTTP methods, schema, permissions, and exceptional
state transitions. Create one `Lib/RestAPI/{Resource}/` boundary per cohesive
business resource.

- Use plural noun paths: `/voices`, `/phrases`, `/tasks`.
- Use `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` for CRUD semantics.
- Use `:action` only for a resource state transition such as
  `/voices/{id}:install`; keep it on the owning resource.
- Split resources when they have independent lifecycle, schema, permissions, or
  persistence. Do not create one module controller containing unrelated settings,
  jobs, files, status, and business records.

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
    path: '/pbxcore/api/v3/module-{feature-kebab}/{resources}',
    tags: ['Module {Feature} - {Resources}'],
    description: 'module_{feature}_ApiResource{Resources}',
    processor: Processor::class
)]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord'],
        'POST' => ['create'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete'],
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: [],
    idPattern: '[^/:]+'
)]
#[ResourceSecurity('module-{feature-kebab}-{resources}', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
class Controller extends BaseRestController
{
    protected string $processorClass = Processor::class;

    #[ApiOperation(
        summary: 'module_{feature}_ApiOperationGet{Resources}',
        description: 'module_{feature}_ApiOperationGet{Resources}Description',
        operationId: 'get{Feature}{Resources}'
    )]
    public function getList(): void {}

    #[ApiOperation(
        summary: 'module_{feature}_ApiOperationGet{Resource}',
        description: 'module_{feature}_ApiOperationGet{Resource}Description',
        operationId: 'get{Feature}{Resource}'
    )]
    public function getRecord(): void {}

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
                    'description' => 'module_{feature}_ApiParameterFieldName',
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

## OpenAPI Localization Contract

Keep `ApiResource::tags` as a canonical English label. Core removes punctuation
and spaces and prepends `rest_tag_`; therefore `Module Example - Tasks` requires
`rest_tag_ModuleExampleTasks`.

Use translation keys for every `ApiResource` description, `ApiOperation` summary
and description, parameter description, schema field description, and
module-specific response. Define all keys plus generated tag keys in both
`Messages/en.php` and `Messages/ru.php`.

Run from the Core repository root:

```bash
php .claude/skills/mikopbx-module/scripts/validate-rest-api-translations.php {module_dir}
```

The recipe is incomplete if the validator reports a missing key or the RestAPI
constructor displays a raw `rest_*` identifier.

## Config Class

For REST API v3, the Conf.php does NOT need `getPBXCoreRESTAdditionalRoutes()`.
Auto-discovery handles route registration.
