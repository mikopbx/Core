# CLAUDE.md - MikoPBX REST API Development

This file provides guidance to Claude Code (claude.ai/code) for REST API development in MikoPBX.

## REST API Architecture Overview

MikoPBX REST API uses a queue-based architecture with the following components:

1. **Frontend (Nginx)** → Routes requests to PHP-FPM
2. **Controllers** → Handle HTTP requests, validate input, send to workers
3. **Redis Queue** → Stores API requests for processing
4. **Worker Processes** → Pull requests from queue, execute business logic
5. **Processors** → Contain actual business logic for API actions
6. **Response** → Sent back through Redis with support for large payloads

### Request Flow

```
HTTP Request → Controller → Redis Queue → Worker → Processor → Redis Response → HTTP Response
```

## Core Components

### 1. Controllers

Controllers handle incoming HTTP requests and are organized by resource type:

```php
// Example: src/PBXCoreREST/Controllers/Extensions/PostController.php
class PostController extends BaseController
{
    public function callAction(string $actionName): void
    {
        // Sanitize input data
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        // Send to backend worker
        $this->sendRequestToBackendWorker(
            ExtensionsManagementProcessor::class, 
            $actionName, 
            $postData
        );
    }
}
```

### 2. Processors

Processors contain the business logic and handle specific actions:

```php
// Example: src/PBXCoreREST/Lib/ExtensionsManagementProcessor.php
class ExtensionsManagementProcessor extends Injectable
{
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $action = $request['action'];
        $data = $request['data'];
        
        switch ($action) {
            case 'getRecord':
                $res = GetRecordAction::main($data['id'] ?? '');
                break;
            case 'saveRecord':
                $res = SaveRecordAction::main($data);
                break;
            // ... other actions
        }
        
        return $res;
    }
}
```

### 3. Workers

The main worker that processes API requests:

```php
// src/PBXCoreREST/Workers/WorkerApiCommands.php
class WorkerApiCommands extends WorkerRedisBase
{
    // Redis queue for API requests
    public const string REDIS_API_QUEUE = 'api:requests';
    
    // Processes requests from the queue
    public function start(array $argv): void
    {
        while (!$this->isShuttingDown) {
            // Get job from queue
            $result = $this->redis->blpop([self::REDIS_API_QUEUE], 5);
            
            // Process the job
            $this->processJobDirect($jobId, $requestData);
        }
    }
}
```

### 4. API Result Structure

All API responses follow a standard structure:

```php
class PBXApiResult
{
    public bool $success = false;
    public array $data = [];
    public array $messages = [];
    public string $processor = '';
    public string $function = '';
    
    public function getResult(): array
    {
        return [
            'result' => $this->success,
            'data' => $this->data,
            'messages' => $this->messages,
            'function' => $this->function,
            'processor' => $this->processor,
            'pid' => getmypid(),
        ];
    }
}
```

## Creating New API Endpoints

### 1. Define Routes

Add routes in `src/PBXCoreREST/Providers/RouterProvider.php`:

```php
private function getRoutes(): array
{
    return [
        // [Controller, Method, Route, HTTP Method, Regex]
        [MyResourceGetController::class, 'callAction', '/pbxcore/api/my-resource/{actionName}', 'get', '/'],
        [MyResourcePostController::class, 'callAction', '/pbxcore/api/my-resource/{actionName}', 'post', '/'],
    ];
}
```

### 2. Create Controllers

Create GET and POST controllers in `src/PBXCoreREST/Controllers/MyResource/`:

```php
// GetController.php
namespace MikoPBX\PBXCoreREST\Controllers\MyResource;

class GetController extends BaseController
{
    public function callAction(string $actionName): void
    {
        $getData = $this->request->getQuery();
        $this->sendRequestToBackendWorker(
            MyResourceProcessor::class,
            $actionName,
            $getData
        );
    }
}

// PostController.php  
class PostController extends BaseController
{
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        $this->sendRequestToBackendWorker(
            MyResourceProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

### 3. Create Processor

Create processor in `src/PBXCoreREST/Lib/MyResourceProcessor.php`:

```php
class MyResourceProcessor extends Injectable
{
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $action = $request['action'];
        $data = $request['data'];
        
        switch ($action) {
            case 'list':
                $res = self::getList($data);
                break;
            case 'create':
                $res = self::create($data);
                break;
            case 'update':
                $res = self::update($data);
                break;
            case 'delete':
                $res = self::delete($data);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action";
        }
        
        $res->function = $action;
        return $res;
    }
    
    private static function getList(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        
        // Business logic here
        $records = MyModel::find();
        
        $res->data = $records->toArray();
        $res->success = true;
        
        return $res;
    }
}
```

### 4. Create Action Classes (Optional)

For complex operations, create dedicated action classes:

```php
// src/PBXCoreREST/Lib/MyResource/CreateAction.php
class CreateAction
{
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        
        // Validation
        if (empty($data['name'])) {
            $res->messages['error'][] = 'Name is required';
            return $res;
        }
        
        // Create record
        $record = new MyModel();
        $record->name = $data['name'];
        
        if ($record->save()) {
            $res->success = true;
            $res->data = ['id' => $record->id];
        } else {
            $res->messages['error'] = $record->getMessages();
        }
        
        return $res;
    }
}
```

## JavaScript Client Usage

### 1. Define API Endpoints

Add endpoints to `sites/admin-cabinet/assets/js/src/PbxAPI/pbxapi.js`:

```javascript
const PbxApi = {
    // Your API endpoints
    myResourceList: `${Config.pbxUrl}/pbxcore/api/my-resource/list`,
    myResourceCreate: `${Config.pbxUrl}/pbxcore/api/my-resource/create`,
    myResourceUpdate: `${Config.pbxUrl}/pbxcore/api/my-resource/update`,
    myResourceDelete: `${Config.pbxUrl}/pbxcore/api/my-resource/delete`,
    
    // ... existing endpoints
};
```

### 2. Create API Methods

```javascript
// GET request example
MyResourceGetList(callback) {
    $.api({
        url: PbxApi.myResourceList,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess(response) {
            callback(response.data);
        },
        onFailure() {
            callback(false);
        }
    });
},

// POST request example
MyResourceCreate(data, callback) {
    $.api({
        url: PbxApi.myResourceCreate,
        on: 'now',
        method: 'POST',
        data: data,
        successTest: PbxApi.successTest,
        onSuccess(response) {
            callback(response.data);
        },
        onFailure(response) {
            callback(response.messages);
        }
    });
},

// Async request with channel
MyResourceProcess(params, callback) {
    $.api({
        url: PbxApi.myResourceProcess,
        on: 'now',
        method: 'POST',
        data: params,
        beforeXHR(xhr) {
            xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
            return xhr;
        },
        successTest: PbxApi.successTest,
        onSuccess(response) {
            callback(response);
        }
    });
}
```

## Module API Extension

Modules can extend the REST API without modifying core code.

### 1. Module Routes

Modules use the standard route pattern:
```
/pbxcore/api/modules/{moduleName}/{actionName}
```

### 2. Module API Implementation

In your module's main class:

```php
class ModuleNameConf extends ConfigClass implements CoreAPIInterface
{
    /**
     * Process module API requests
     * 
     * @param array $request
     */
    public function moduleRestAPICallback(array $request): void
    {
        $action = $request['action'];
        $data = $request['data'];
        
        switch ($action) {
            case 'status':
                $this->getModuleStatus();
                break;
            case 'customAction':
                $this->processCustomAction($data);
                break;
            default:
                ProcessorClass::responseError('Unknown action');
        }
    }
    
    private function getModuleStatus(): void
    {
        $response = [
            'status' => 'active',
            'version' => '1.0.0'
        ];
        
        ProcessorClass::responseSuccess($response);
    }
}
```

### 3. No-Auth Endpoints

For endpoints that don't require authentication (webhooks, provisioning):

```php
public function needAuthentication(string $action): bool
{
    // List actions that don't need authentication
    $noAuthActions = ['webhook', 'provision', 'callback'];
    
    return !in_array($action, $noAuthActions);
}
```

## Common Patterns

### 1. CRUD Operations

Standard pattern for CRUD operations:

```php
// List all records
case 'list':
    $records = Model::find();
    $res->data = $records->toArray();
    $res->success = true;
    break;

// Get single record
case 'get':
    $record = Model::findFirst($data['id']);
    if ($record) {
        $res->data = $record->toArray();
        $res->success = true;
    } else {
        $res->messages['error'][] = 'Record not found';
    }
    break;

// Create record
case 'create':
    $record = new Model();
    $record->assign($data);
    if ($record->save()) {
        $res->data = ['id' => $record->id];
        $res->success = true;
    } else {
        $res->messages['error'] = $record->getMessages();
    }
    break;

// Update record
case 'update':
    $record = Model::findFirst($data['id']);
    if ($record) {
        $record->assign($data);
        if ($record->save()) {
            $res->success = true;
        } else {
            $res->messages['error'] = $record->getMessages();
        }
    }
    break;

// Delete record
case 'delete':
    $record = Model::findFirst($data['id']);
    if ($record && $record->delete()) {
        $res->success = true;
    } else {
        $res->messages['error'][] = 'Failed to delete record';
    }
    break;
```

### 2. File Handling

For file uploads and downloads:

```php
// File upload (uses Resumable.js)
case 'uploadFile':
    $uploadDir = $this->di->getShared('config')->path('www.uploadDir');
    $res = FilesManagementProcessor::uploadFile($uploadDir);
    break;

// File download
case 'downloadFile':
    $filePath = $data['path'];
    if (file_exists($filePath)) {
        $res->data = [
            'fpassthru' => [
                'filename' => $filePath,
                'need_delete' => false
            ]
        ];
        $res->success = true;
    }
    break;
```

### 3. Async Operations

For long-running operations:

```php
// In your processor
if ($request['async'] === true) {
    // Return immediate response
    $res->success = true;
    $res->messages['info'][] = 'Processing started';
    
    // Continue processing in background
    // Results will be sent to asyncChannelId
}
```

### 4. Error Handling

Consistent error handling:

```php
try {
    // Your code here
    $res->success = true;
} catch (\Exception $e) {
    $res->messages['error'][] = $e->getMessage();
    CriticalErrorsHandler::handleExceptionWithSyslog($e);
}
```

## Authentication

The API uses session-based authentication with these checks:

1. **Local requests** - Always allowed (127.0.0.1)
2. **Debug mode** - Allowed if debug header present
3. **Session auth** - Valid admin session cookie
4. **Module no-auth** - Specific module endpoints

Authentication is handled by `AuthenticationMiddleware`:

```php
// Check order in middleware
if (
    true !== $request->isLocalHostRequest()
    && true !== $request->isDebugModeEnabled()
    && true !== $request->isAuthorizedSessionRequest()
    && true !== $isNoAuthApi
) {
    // Return 401 Unauthorized
}
```

## Performance Considerations

1. **Worker Pool** - Multiple workers process requests in parallel (default: 3)
2. **Redis Queue** - Efficient job distribution
3. **Large Responses** - Automatic compression for responses > 1MB
4. **Timeouts** - Default 30s, configurable per request
5. **Async Requests** - Use for long operations

## Testing API Endpoints

```bash
# Test with curl
curl -X GET http://127.0.0.1/pbxcore/api/extensions/getForSelect?type=all

# Test with authentication
curl -X POST -H "Cookie: PHPSESSID=your-session-id" \
     -d '{"number":"101"}' \
     http://127.0.0.1/pbxcore/api/extensions/available

# Test async request
curl -X POST -H "X-Async-Response-Channel-Id: test-channel" \
     -d '{"action":"process"}' \
     http://127.0.0.1/pbxcore/api/system/upgrade
```

## Best Practices

1. **Always validate input** in processors
2. **Use action classes** for complex operations
3. **Return consistent responses** using PBXApiResult
4. **Handle errors gracefully** with try-catch
5. **Log important operations** for debugging
6. **Use transactions** for database operations
7. **Implement proper authentication** for sensitive endpoints
8. **Document API changes** in comments
9. **Use type hints** for better code clarity
10. **Follow existing patterns** in the codebase
11. RESTART THE CONTAINER if you change any backend code 
    
## ABSOLUTE RULES:

- NO PARTIAL IMPLEMENTATION
- NO SIMPLIFICATION : no "//This is simplified stuff for now, complete implementation would blablabla"
- NO CODE DUPLICATION : check existing codebase to reuse functions and constants Read files before writing new functions. Use common sense function name to find them easily.
- NO DEAD CODE : either use or delete from codebase completely
- IMPLEMENT TEST FOR EVERY FUNCTIONS
- NO CHEATER TESTS : test must be accurate, reflect real usage and be designed to reveal flaws. No useless tests! Design tests to be verbose so we can use them for debuging.
- NO INCONSISTENT NAMING - read existing codebase naming patterns.
- NO OVER-ENGINEERING - Don't add unnecessary abstractions, factory patterns, or middleware when simple functions would work. Don't think "enterprise" when you need "working"
- NO MIXED CONCERNS - Don't put validation logic inside API handlers, database queries inside UI components, etc. instead of proper separation
- NO RESOURCE LEAKS - Don't forget to close database connections, clear timeouts, remove event listeners, or clean up file handles
