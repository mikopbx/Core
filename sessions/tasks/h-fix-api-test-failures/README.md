---
name: h-fix-api-test-failures
branch: fix/h-fix-api-test-failures
status: pending
created: 2025-12-06
---

# Fix REST API Test Failures and Skipped Tests

## Problem/Goal
892 REST API tests were executed with 22 failures and several skipped tests. Need to analyze and fix all failed/skipped tests to achieve 100% pass rate. This involves fixing issues in MikoPBX code, test implementations, or test environment configuration.

## Success Criteria
- [ ] Все 22 проваленных теста исправлены и проходят успешно
- [ ] Все пропущенные (SKIPPED) тесты проанализированы и либо исправлены, либо задокументирована причина пропуска
- [ ] Полный прогон всех 892 тестов показывает 100% PASSED
- [ ] Исправления сделаны в правильных местах (MikoPBX код, тесты или окружение) с обоснованием каждого решения
- [ ] Скрипты получили корректные права доступа (chmod +x для seed_cdr_database.sh и других)
- [ ] Все изменения покрыты документацией в Work Log с описанием причины провала и способа исправления

## Context Manifest

### Overview: How REST API Testing Works in MikoPBX

When a pytest test runs in this architecture, the following complete flow executes:

**1. Test Execution Environment:**
- Tests run on **host machine** (your MacBook) using pytest
- Tests use `config.py` which reads `.env` file to determine execution mode
- Current configuration: `MIKOPBX_EXECUTION_MODE=docker`, container: `mikopbx_tests-refactoring`
- API URL: `http://192.168.107.2/pbxcore/api/v3` (container's IP address)

**2. Authentication Flow:**
- `conftest.py` creates `MikoPBXClient` with auto-authentication
- Client sends POST to `/pbxcore/api/v3/auth:login` with credentials from `.env`
- MikoPBX returns JWT access token (15 min lifetime) + refreshToken cookie (30 days)
- All subsequent requests include `Authorization: Bearer <token>` header

**3. API Request Flow (REST API v3 Architecture):**
When test calls `api_client.post('employees', data)`:
```
Test → MikoPBXClient → HTTP POST http://192.168.107.2/pbxcore/api/v3/employees
  ↓
Nginx (container) → PHP-FPM → RestController (employees endpoint)
  ↓
RestController validates request → Queues to Redis → Returns job ID
  ↓
WorkerApiCommands (pool of 3 workers) → Pop job from Redis queue
  ↓
EmployeesManagementProcessor::callBack() → Enum match → CreateRecordAction::main()
  ↓
SaveRecordAction::main() [7-PHASE PATTERN]:
  Phase 1: SANITIZATION (XSS/SQL injection prevention)
  Phase 2: REQUIRED VALIDATION (fail fast on missing fields)
  Phase 3: DETERMINE OPERATION (CREATE vs UPDATE)
  Phase 4: APPLY DEFAULTS (CREATE only!)
  Phase 5: SCHEMA VALIDATION (after defaults)
  Phase 6: SAVE (transaction with multi-entity save)
  Phase 7: BUILD RESPONSE (format via DataStructure)
  ↓
Multi-Entity Save (for Employees):
  - Users model (main user record)
  - Extensions model (SIP extension with number field)
  - Sip model (SIP password, transport, recording settings)
  - ExtensionForwardingRights model (call forwarding)
  - ExternalPhones model (mobile phone if provided)
  ↓
Model afterSave() hooks → processSettingsChanges() → Beanstalkd queue
  ↓
WorkerModelsEvents listens → Plans actions: ApplyCustomFilesAction, ReloadPJSIPAction, etc.
  ↓
Actions execute: regenerate pjsip.conf, apply custom files, reload Asterisk
  ↓
Response returns to client with created employee ID
```

**4. Database Direct Access for Scripts:**
- Script path in container: `/offload/rootfs/usr/www/tests/api/scripts/seed_cdr_database.sh`
- Script accesses SQLite directly: `/cf/conf/mikopbx.db` (main), `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db` (CDR)
- No API involved - pure shell script with sqlite3 CLI
- **CRITICAL**: Script must have execute permissions (`chmod +x`)

---

### Failed Test #1: CDR Seeding (test_00a_cdr_seed.py)

**ERROR SYMPTOM:**
```
Permission denied: '/offload/rootfs/usr/www/tests/api/scripts/seed_cdr_database.sh'
```

**ROOT CAUSE:**
The script file `seed_cdr_database.sh` has permissions `rw-r--r--` (644) instead of `rwxr-xr-x` (755). When `CDRSeederRemote` tries to execute it via `docker exec`, bash cannot execute a non-executable file.

**HOW CDR SEEDING CURRENTLY WORKS:**

1. **Test File**: `tests/api/test_00a_cdr_seed.py`
   - Runs FIRST in test suite (prefix `00a` ensures execution after `test_00` but before `test_01`)
   - Checks if test data already exists (IDs 1-30) to avoid re-seeding
   - If no data exists, calls `CDRSeederRemote().seed()`

2. **Helper**: `tests/api/helpers/cdr_seeder_remote.py` - `CDRSeederRemote` class
   - **Detection Logic**:
     - Execution mode: `docker` (from `.env` config)
     - Container: `mikopbx_tests-refactoring`
     - Script path: `/offload/rootfs/usr/www/tests/api/scripts/seed_cdr_database.sh` (inside container)

   - **Execution Method** (docker mode):
     ```python
     cmd = ['docker', 'exec', 'mikopbx_tests-refactoring', 'bash', '-c',
            '/offload/rootfs/usr/www/tests/api/scripts/seed_cdr_database.sh seed']
     subprocess.run(cmd, ...)
     ```

   - **WHY THIS FAILS**: Script has no execute permission, so bash returns "Permission denied"

3. **Script**: `tests/api/scripts/seed_cdr_database.sh`
   - **Purpose**: Seeds CDR database with 30 test records + 15 MP3 files
   - **Database**: Direct SQLite access to `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db`
   - **Fixture**: Reads from `tests/api/fixtures/cdr_seed_data.sql`
   - **Operations**:
     - Creates 30 CDR records (IDs 1-30)
     - Generates 15 minimal MP3 files (for records with recordings)
     - No API calls - pure shell script execution

   - **Current Permissions**: `rw-r--r--` (644) - NOT EXECUTABLE
   - **Required Permissions**: `rwxr-xr-x` (755) - EXECUTABLE

**WHY CDR SEEDING IS NEEDED:**

CDR (Call Detail Records) are created ONLY by actual phone calls through Asterisk. To test CDR API endpoints (`/pbxcore/api/v3/cdr`) without making real calls, we pre-populate the database with realistic test data.

**COMPLETE FIX:**

1. Add execute permission to script:
   ```bash
   chmod +x tests/api/scripts/seed_cdr_database.sh
   ```

2. Verify permissions:
   ```bash
   ls -la tests/api/scripts/seed_cdr_database.sh
   # Should show: rwxr-xr-x (755)
   ```

3. Optional: Add `.gitattributes` to preserve permissions:
   ```gitattributes
   tests/api/scripts/*.sh text eol=lf
   ```

**VERIFICATION STEPS:**

1. Run test: `pytest tests/api/test_00a_cdr_seed.py -v -s`
2. Expected output: "✓ CDR seeding completed successfully"
3. Verify CDR records exist: `pytest tests/api/test_43_cdr_getList.py -v`

---

### Failed Tests #2-3: Employee/Extension Creation (test_14_extensions_create_single.py, test_15_extensions_batch.py)

**ERROR SYMPTOMS:**
Tests fail during employee creation with API errors or missing fields.

**HOW EMPLOYEE/EXTENSION CREATION CURRENTLY WORKS:**

**Architecture Flow:**

1. **Test Code** (`test_14_extensions_create_single.py`):
   ```python
   fixture_data = employee_fixtures['smith.james']  # From fixtures/employee.json
   api_data = convert_employee_fixture_to_api_format(fixture_data)
   # Converts: username → user_username, secret → sip_secret, etc.

   response = api_client.post('employees', api_data)
   ```

2. **Fixture Conversion** (`conftest.py::convert_employee_fixture_to_api_format()`):
   - **Input Format** (fixture):
     ```json
     {
       "username": "John Doe",
       "number": 201,
       "secret": "pass123",
       "email": "john@example.com",
       "mobile": "79161234567"
     }
     ```

   - **Output Format** (API):
     ```json
     {
       "user_username": "John Doe",
       "number": "201",
       "sip_secret": "pass123",
       "user_email": "john@example.com",
       "mobile_number": "+79161234567",
       "sip_enableRecording": false,
       "sip_dtmfmode": "auto",
       "sip_transport": "udp",
       "sip_networkfilterid": "none",
       "sip_manualattributes": ""
     }
     ```

   - **CRITICAL FIELDS** (required for creation):
     - `user_username` - Employee name (validated: non-empty)
     - `number` - Extension number (validated: numeric, unique)
     - `sip_secret` - SIP password (validated: min 10 chars, strong password)

3. **REST API Processing** (`src/PBXCoreREST/Lib/Employees/SaveRecordAction.php`):

   **PHASE 1: SANITIZATION**
   ```php
   $sanitizationRules = DataStructure::getSanitizationRules();
   $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, ['user_username']);
   // WHY: Security - removes XSS, SQL injection attempts
   ```

   **PHASE 2: REQUIRED VALIDATION**
   ```php
   $validationRules = [
       'user_username' => [['type' => 'required', 'message' => 'ex_ValidateUsernameEmpty']],
       'number' => [
           ['type' => 'required', 'message' => 'ex_ValidateNumberIsEmpty'],
           ['type' => 'regex', 'pattern' => '/^[0-9]+$/', 'message' => 'ex_ValidateExtensionNumber']
       ],
       'sip_secret' => [['type' => 'required', 'message' => 'ex_ValidateSecretEmpty']] // CREATE only
   ];

   $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
   if (!empty($validationErrors)) {
       return PBXApiResult with errors; // Fail fast
   }
   ```

   **PHASE 3: DETERMINE OPERATION**
   ```php
   $recordId = $sanitizedData['id'] ?? null;
   $userEntity = null;
   if (!empty($recordId)) {
       $userEntity = Users::findFirstById($recordId);
       $isCreateOperation = ($userEntity === null);
   } else {
       $isCreateOperation = true;
   }
   ```

   **PHASE 4: APPLY DEFAULTS** (CREATE ONLY!)
   ```php
   if ($isCreateOperation) {
       $sanitizedData = DataStructure::applyDefaults($sanitizedData);
       // Adds missing values:
       // - sip_enableRecording: false
       // - sip_dtmfmode: 'auto'
       // - sip_transport: 'udp'
       // - sip_networkfilterid: 'none'
       // - fwd_ringlength: 45
   }
   // WHY NOT UPDATE: Would overwrite existing values!
   ```

   **PHASE 5: SCHEMA VALIDATION**
   ```php
   $schemaErrors = DataStructure::validateInputData($sanitizedData);
   $businessErrors = self::validateEmployeeData($sanitizedData, $isCreateOperation);

   // Business rules:
   // 1. Password strength: min 10 chars, letters + digits
   // 2. Email format validation
   // 3. Number uniqueness (no duplicate extensions)
   // 4. Mobile number format (+7XXXXXXXXXX)
   ```

   **PHASE 6: MULTI-ENTITY SAVE** (Transaction)
   ```php
   $savedUser = self::executeInTransaction(function() use ($sanitizedData) {
       // 1. Save Users entity (id, username, email, avatar)
       $userEntity = self::saveUser($sanitizedData);
       $sanitizedData['id'] = $userEntity->id;

       // 2. Save Extensions entity (number=201, userid=<user_id>, type=SIP)
       $extension = self::saveExtension($sanitizedData, false);

       // 3. Save Sip entity (number=201, secret=<hashed>, transport=udp)
       $sipEntity = self::saveSip($sanitizedData);

       // 4. Save ExtensionForwardingRights (forwarding settings)
       $fwdEntity = self::saveForwardingRights($sanitizedData);

       // 5. Save ExternalPhones (if mobile_number provided)
       if (!empty($sanitizedData['mobile_number'])) {
           $mobileExtension = self::saveExtension($sanitizedData, true);
           $externalPhone = self::saveExternalPhones($sanitizedData);
       }

       return $userEntity;
   });
   // WHY TRANSACTION: If ANY save fails, ALL changes rollback
   ```

   **PHASE 7: BUILD RESPONSE**
   ```php
   $res->data = DataStructure::createFromModel($savedUser);
   $res->success = true;
   $res->httpCode = 201; // Created
   return $res;
   ```

4. **Model Hooks → Worker System** (Automatic Background Processing):

   After successful save, model's `afterSave()` hook triggers:
   ```php
   // In Users/Extensions/Sip models:
   public function afterSave(): void
   {
       parent::afterSave(); // Calls ModelsBase::afterSave()
   }

   // ModelsBase::afterSave() does:
   $this->processSettingsChanges(); // Pushes to Beanstalkd queue
   ```

   WorkerModelsEvents receives notification:
   ```php
   // Listens to Beanstalkd queue
   $data = ['source' => 'models_changed', 'model' => 'Extensions', 'recordId' => 201];

   // Plans reload actions:
   $this->planReloadAction('ReloadPJSIPAction', ['recordId' => 201]);
   // Later executes: Regenerates pjsip.conf, reloads Asterisk
   ```

**POSSIBLE FAILURE SCENARIOS:**

1. **Missing Required Fields:**
   - `user_username` empty → "ex_ValidateUsernameEmpty"
   - `number` empty → "ex_ValidateNumberIsEmpty"
   - `sip_secret` empty (CREATE only) → "ex_ValidateSecretEmpty"

2. **Invalid Field Format:**
   - `number` contains letters → "ex_ValidateExtensionNumber" (must be numeric)
   - `sip_secret` too weak → Password validation error (min 10 chars)
   - `user_email` invalid → Email validation error

3. **Business Rule Violations:**
   - Duplicate `number` → "Extension number already exists"
   - Number already assigned to another user → Unique constraint violation

4. **Fixture Conversion Issues:**
   - Fixture has `secret` but conversion expects `sip_secret` → Field missing
   - Fixture has old field names → Conversion doesn't recognize
   - Missing default values → Phase 4 doesn't fill all required fields

5. **Multi-Entity Save Failures:**
   - Users saves successfully but Extensions fails → Transaction rollback
   - Sip model validation fails → Entire operation fails
   - Foreign key constraints violated → Database error

**DIAGNOSTIC STEPS:**

1. **Check Fixture Format:**
   ```bash
   cat tests/api/fixtures/employee.json | jq '.["smith.james"]'
   # Verify fields: username, number, secret, email, mobile
   ```

2. **Test Conversion Function:**
   ```python
   from conftest import convert_employee_fixture_to_api_format
   fixture = {"username": "Test", "number": 999, "secret": "Pass12345678"}
   api_data = convert_employee_fixture_to_api_format(fixture)
   print(api_data)
   # Should include: user_username, number, sip_secret
   ```

3. **Check API Response:**
   ```python
   response = api_client.post('employees', api_data)
   print(f"Result: {response.get('result')}")
   print(f"Messages: {response.get('messages')}")
   print(f"Data: {response.get('data')}")
   # If result=False, messages will contain specific validation errors
   ```

4. **Check Database State:**
   ```bash
   docker exec mikopbx_tests-refactoring sqlite3 /cf/conf/mikopbx.db \
     "SELECT id, username, email FROM m_Users ORDER BY id DESC LIMIT 1"

   docker exec mikopbx_tests-refactoring sqlite3 /cf/conf/mikopbx.db \
     "SELECT number, userid, type FROM m_Extensions WHERE number='201'"
   ```

5. **Check Worker Logs:**
   ```bash
   docker exec mikopbx_tests-refactoring tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -E "(WorkerModelsEvents|SaveRecordAction)"
   ```

**COMPLETE FIX CHECKLIST:**

1. Verify fixture file has all required fields
2. Ensure conversion function maps all fields correctly
3. Check that `sip_secret` is provided and strong enough (min 10 chars)
4. Verify extension `number` is unique and numeric
5. Check test creates employee with valid data
6. Verify API returns success with employee ID
7. Confirm database has all 5 entities saved (Users, Extensions, Sip, ForwardingRights, ExternalPhones if mobile)

---

### Failed Test #4: Custom Files Append Mode (test_09_custom_files.py)

**ERROR SYMPTOM:**
Worker verification fails - `changed` flag not reset from '1' to '0' after file application.

**HOW CUSTOM FILES MODE_APPEND CURRENTLY WORKS:**

**Complete Flow from API → File System:**

1. **Test Code** (`test_09_custom_files.py::TestCustomFilesAppendMode::test_01_create_or_update_pjsip_append_file()`):
   ```python
   custom_content = """; Custom PJSIP Configuration
   [transport-test]
   type=transport
   protocol=udp
   bind=0.0.0.0:15060
   """
   encoded_content = base64.b64encode(custom_content.encode()).decode()

   custom_file_data = {
       'filepath': '/etc/asterisk/pjsip.conf',
       'content': encoded_content,
       'mode': 'append',  # KEY: MODE_APPEND
       'description': 'Test append mode for pjsip.conf'
   }

   response = api_client.post('custom-files', custom_file_data)
   # OR (if file exists):
   response = api_client.patch(f'custom-files/{existing_id}', custom_file_data)
   ```

2. **API Processing** (`src/PBXCoreREST/Lib/CustomFiles/SaveRecordAction.php`):
   ```php
   // PHASE 6: SAVE
   $model = new CustomFiles();
   $model->filepath = '/etc/asterisk/pjsip.conf';
   $model->content = base64_decode($sanitizedData['content']); // Decodes to original text
   $model->mode = CustomFiles::MODE_APPEND; // '1' (append mode)
   $model->description = $sanitizedData['description'];
   $model->changed = '1'; // FLAG: Triggers worker processing

   if (!$model->save()) {
       // Validation errors
   }
   ```

3. **Model Hook** (`src/Common/Models/CustomFiles.php::afterSave()`):
   ```php
   public function afterSave(): void
   {
       if ($this->changed === '1') {
           parent::afterSave(); // Calls ModelsBase::afterSave()

           // ModelsBase::afterSave() does:
           $this->processSettingsChanges(); // Pushes to Beanstalkd queue
       }
   }

   // Pushed to Beanstalkd:
   $data = [
       'source' => 'models_changed',
       'model' => 'CustomFiles',
       'recordId' => $model->id,
       'action' => 'save'
   ];
   ```

4. **Worker Receives Event** (`src/Core/Workers/WorkerModelsEvents.php`):
   ```php
   public function processModelChanges(BeanstalkClient $message): void
   {
       $data = json_decode($message->getBody(), true);

       if ($data['model'] === 'CustomFiles') {
           $this->planReloadAction('ApplyCustomFilesAction', [
               'recordId' => $data['recordId']
           ]);
       }
   }

   // Later (after debounce delay):
   public function startReload(): void
   {
       foreach ($this->plannedReloadActions as $actionName => $parameters) {
           $action = new ApplyCustomFilesAction();
           $action->execute($parameters);
       }
   }
   ```

5. **ApplyCustomFilesAction** (`src/Core/Workers/Libs/WorkerModelsEvents/Actions/ApplyCustomFilesAction.php`):
   ```php
   public function execute(array $parameters = []): void
   {
       foreach ($parameters as $record) {
           $file = CustomFiles::findFirstById($record['recordId']);

           if (!$file || $file->mode === CustomFiles::MODE_NONE) {
               continue; // Skip disabled files
           }

           // Apply file based on mode
           $success = CustomFilesApplier::applyCustomFile($file);

           // Reset changed flag ONLY after successful application
           if ($success) {
               $db = \Phalcon\Di\Di::getDefault()->get('db');
               $db->execute("UPDATE m_CustomFiles SET changed='0' WHERE id=:id", ['id' => $file->id]);
               // WHY DIRECT SQL: Avoids triggering afterSave() again (infinite loop prevention)
           }
       }
   }
   ```

6. **CustomFilesApplier** (`src/Core/System/CustomFilesApplier.php`):
   ```php
   public static function applyCustomFile(CustomFiles $file): bool
   {
       switch ($file->mode) {
           case CustomFiles::MODE_APPEND:
               return self::applyAppendMode($file);
           case CustomFiles::MODE_OVERRIDE:
               return self::applyOverrideMode($file);
           case CustomFiles::MODE_SCRIPT:
               return self::applyScriptMode($file);
       }
   }

   private static function applyAppendMode(CustomFiles $file): bool
   {
       $filepath = $file->filepath; // /etc/asterisk/pjsip.conf

       // 1. Create backup of original file
       $backupPath = $filepath . '.orgn';
       if (!file_exists($backupPath)) {
           copy($filepath, $backupPath);
       }

       // 2. Read original file
       $originalContent = file_get_contents($backupPath);

       // 3. Append custom content
       $customContent = $file->content; // Decoded base64 content
       $newContent = $originalContent . "\n\n" . $customContent;

       // 4. Write combined content
       file_put_contents($filepath, $newContent);

       // 5. Trigger Asterisk reload
       $this->planReloadAction('ReloadPJSIPAction', []);

       return true;
   }
   ```

7. **Test Verification** (`test_09_custom_files.py::test_02_verify_file_applied()`):
   ```python
   # Wait for worker to process (15 seconds debounce)
   time.sleep(15)

   # Check 'changed' flag was reset
   result = subprocess.run(
       ['docker', 'exec', 'mikopbx-php83', 'sqlite3', '/cf/conf/mikopbx.db',
        f"SELECT changed FROM m_CustomFiles WHERE id={test_file_id}"],
       capture_output=True, text=True
   )
   changed_flag = result.stdout.strip()
   assert changed_flag == '0', "Worker should reset changed flag"

   # Read actual file from container
   result = subprocess.run(
       ['docker', 'exec', 'mikopbx-php83', 'cat', '/etc/asterisk/pjsip.conf'],
       capture_output=True, text=True
   )
   actual_content = result.stdout

   # Verify custom content is present
   assert 'transport-test' in actual_content, "Custom content not found in pjsip.conf"

   # Verify backup file exists
   subprocess.run(
       ['docker', 'exec', 'mikopbx-php83', 'test', '-f', '/etc/asterisk/pjsip.conf.orgn']
   )
   ```

**TIMING AND DEBOUNCE:**

The worker system uses debounce to prevent excessive reloads:
```php
// In WorkerModelsEvents
private int $last_change = 0; // Timestamp of last model change
private const int DEBOUNCE_DELAY = 10; // 10 seconds

private function startReload(): void
{
    $timeSinceChange = time() - $this->last_change;

    if ($timeSinceChange < self::DEBOUNCE_DELAY) {
        return; // Too soon, skip reload
    }

    // Execute planned actions
    foreach ($this->plannedReloadActions as $actionName => $parameters) {
        // ... execute
    }
}
```

**WHY 'changed' FLAG EXISTS:**

The `changed` flag prevents infinite loops:
```
Without flag:
API Update → afterSave() → Beanstalk → Worker → applyCustomFile() → save() → afterSave() → LOOP!

With flag:
API Update → afterSave() [changed=1] → Beanstalk → Worker → applyCustomFile() → direct SQL UPDATE changed=0 → NO afterSave()!
```

**POSSIBLE FAILURE SCENARIOS:**

1. **Worker Not Running:**
   - WorkerModelsEvents crashed or stopped
   - Supervisor not monitoring workers
   - Container restarted without worker restart

2. **Beanstalkd Queue Issues:**
   - Beanstalkd service not running
   - Queue full or corrupted
   - Message not delivered to worker

3. **applyCustomFile() Failure:**
   - File path not writable
   - Filesystem full
   - Permission denied on target file
   - Exception thrown during file write

4. **Direct SQL UPDATE Failure:**
   - Database locked by another process
   - SQLite write timeout
   - SQL syntax error (unlikely)

5. **Timing Issues:**
   - Test checks too quickly (before debounce delay)
   - Worker busy processing other changes
   - Multiple workers competing for same file

**DIAGNOSTIC STEPS:**

1. **Check Worker Status:**
   ```bash
   docker exec mikopbx_tests-refactoring ps aux | grep WorkerModelsEvents
   # Should show running process
   ```

2. **Check Beanstalkd Status:**
   ```bash
   docker exec mikopbx_tests-refactoring beanstalk-console
   # Check queue 'WorkerModelsEvents' for pending jobs
   ```

3. **Check Database State:**
   ```bash
   docker exec mikopbx_tests-refactoring sqlite3 /cf/conf/mikopbx.db \
     "SELECT id, filepath, mode, changed FROM m_CustomFiles WHERE filepath='/etc/asterisk/pjsip.conf'"
   # changed should be '0' after worker processes
   ```

4. **Check File System:**
   ```bash
   docker exec mikopbx_tests-refactoring cat /etc/asterisk/pjsip.conf
   # Should contain custom content

   docker exec mikopbx_tests-refactoring test -f /etc/asterisk/pjsip.conf.orgn && echo "Backup exists"
   ```

5. **Check Worker Logs:**
   ```bash
   docker exec mikopbx_tests-refactoring tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -E "(WorkerModelsEvents|ApplyCustomFiles)"
   # Should show "Successfully applied and reset changed flag"
   ```

**COMPLETE FIX CHECKLIST:**

1. Ensure WorkerModelsEvents is running
2. Verify Beanstalkd service is active
3. Check filesystem permissions on `/etc/asterisk/pjsip.conf`
4. Increase test wait time if needed (current: 15s, debounce: 10s)
5. Verify direct SQL UPDATE executes successfully
6. Check for worker exceptions in logs
7. Ensure multiple workers don't interfere (file locking)

---

### Failed Test #5: SIP Providers Manual Attributes in pjsip.conf (test_18b_sip_providers_manualattributes_pjsip_conf.py)

**ERROR SYMPTOM:**
Manual attributes not appearing in generated pjsip.conf after API create/update.

**HOW PJSIP.CONF GENERATION WITH MANUALATTRIBUTES WORKS:**

**Complete Flow:**

1. **Test Code** (`test_18b_sip_providers_manualattributes_pjsip_conf.py`):
   ```python
   # Create SIP provider with manualattributes
   manual_attrs = """[endpoint]
   device_state_busy_at=2
   direct_media=no
   force_rport=yes
   [aor]
   qualify_frequency=30
   [auth]
   auth_type=userpass"""

   test_data = {
       "type": "SIP",
       "description": "Test Provider ManualAttrs",
       "host": "sip-test.example.com",
       "username": "testuser",
       "secret": "TestSecret123",
       "manualattributes": manual_attrs  # Multi-section attributes
   }

   response = api_client.post("sip-providers", test_data)
   provider_id = response['data']['id']

   # Create extension with manualattributes
   ext_manual_attrs = """[endpoint]
   rtp_symmetric=yes
   direct_media=no
   [aor]
   max_contacts=5"""

   ext_data = {
       "number": "9991",
       "user_username": "Test User",
       "sip_secret": "ExtSecret123",
       "sip_manualattributes": ext_manual_attrs
   }

   response = api_client.post("employees", ext_data)
   ```

2. **Model Save** (`src/Common/Models/Providers.php`, `src/Common/Models/Sip.php`):
   ```php
   // Providers model (for SIP providers)
   public function save(): bool
   {
       $this->manualattributes = $data['manualattributes']; // Stored as TEXT

       if (!parent::save()) {
           return false;
       }

       // afterSave() hook triggers:
       $this->processSettingsChanges(); // Pushes to Beanstalkd

       return true;
   }

   // Sip model (for extensions)
   public function save(): bool
   {
       $this->manualattributes = $data['sip_manualattributes'];
       // ... similar flow
   }
   ```

3. **Worker Receives Change** (`WorkerModelsEvents`):
   ```php
   $data = ['model' => 'Providers', 'recordId' => $provider_id];

   // Plans action:
   $this->planReloadAction('ReloadPJSIPAction', [
       'recordId' => $provider_id,
       'action' => 'providers_changed'
   ]);
   ```

4. **ReloadPJSIPAction** (`src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadPJSIPAction.php`):
   ```php
   public function execute(array $parameters = []): void
   {
       // Regenerate pjsip.conf
       $generator = new PJSIPConf();
       $generator->generateConfig();

       // Reload Asterisk PJSIP module
       $ami = new AsteriskManager();
       $ami->sendRequestTimeout('module reload res_pjsip.so');
   }
   ```

5. **pjsip.conf Generator** (`src/Core/Asterisk/Configs/PJSIPConf.php`):
   ```php
   protected function generateConfig(): void
   {
       // Generate provider sections
       $providers = Providers::find(['type = "SIP"']);
       foreach ($providers as $provider) {
           $this->generateProviderSection($provider);
       }

       // Generate extension sections
       $extensions = Sip::find();
       foreach ($extensions as $extension) {
           $this->generateExtensionSection($extension);
       }
   }

   private function generateProviderSection(Providers $provider): void
   {
       $uniqid = $provider->uniqid; // e.g., "SIP-PROVIDER-1234567890"

       // [SIP-PROVIDER-1234567890](provider-endpoint)
       $this->addTemplatedSection($uniqid, 'provider-endpoint');
       $this->addParameter('aors', $uniqid);
       $this->addParameter('outbound_auth', $uniqid . '-AUTH');

       // Apply manualattributes for [endpoint]
       $this->applyManualAttributesForSection($provider->manualattributes, 'endpoint');

       // [SIP-PROVIDER-1234567890](provider-aor)
       $this->addTemplatedSection($uniqid, 'provider-aor');
       $this->addParameter('contact', "sip:{$provider->username}@{$provider->host}:{$provider->port}");

       // Apply manualattributes for [aor]
       $this->applyManualAttributesForSection($provider->manualattributes, 'aor');

       // [SIP-PROVIDER-1234567890-AUTH](provider-auth)
       $this->addTemplatedSection($uniqid . '-AUTH', 'provider-auth');
       $this->addParameter('username', $provider->username);
       $this->addParameter('password', $provider->secret);

       // Apply manualattributes for [auth]
       $this->applyManualAttributesForSection($provider->manualattributes, 'auth');
   }

   private function applyManualAttributesForSection(string $manualattributes, string $sectionType): void
   {
       if (empty($manualattributes)) {
           return;
       }

       // Parse multi-section manualattributes
       $sections = $this->parseManualAttributes($manualattributes);

       if (isset($sections[$sectionType])) {
           foreach ($sections[$sectionType] as $param => $value) {
               $this->addParameter($param, $value);
           }
       }
   }

   private function parseManualAttributes(string $manualattributes): array
   {
       $sections = [];
       $currentSection = null;

       $lines = explode("\n", $manualattributes);
       foreach ($lines as $line) {
           $line = trim($line);

           // Skip empty lines and comments
           if (empty($line) || $line[0] === ';') {
               continue;
           }

           // Section header: [endpoint], [aor], [auth]
           if (preg_match('/^\[(\w+)\]$/', $line, $matches)) {
               $currentSection = $matches[1];
               $sections[$currentSection] = [];
               continue;
           }

           // Parameter: key=value
           if ($currentSection && strpos($line, '=') !== false) {
               list($key, $value) = explode('=', $line, 2);
               $sections[$currentSection][trim($key)] = trim($value);
           }
       }

       return $sections;
   }
   ```

6. **Generated pjsip.conf Structure:**
   ```ini
   ; Provider endpoint section
   [SIP-PROVIDER-1234567890](provider-endpoint)
   aors=SIP-PROVIDER-1234567890
   outbound_auth=SIP-PROVIDER-1234567890-AUTH
   ; Manual attributes from [endpoint] section:
   device_state_busy_at=2
   direct_media=no
   force_rport=yes

   ; Provider AOR section
   [SIP-PROVIDER-1234567890](provider-aor)
   contact=sip:testuser@sip-test.example.com:5060
   ; Manual attributes from [aor] section:
   qualify_frequency=30

   ; Provider AUTH section
   [SIP-PROVIDER-1234567890-AUTH](provider-auth)
   username=testuser
   password=TestSecret123
   ; Manual attributes from [auth] section:
   auth_type=userpass

   ; Extension endpoint section
   [9991](extension-endpoint)
   aors=9991
   auth=9991-AUTH
   ; Manual attributes from [endpoint] section:
   rtp_symmetric=yes
   direct_media=no

   ; Extension AOR section
   [9991](extension-aor)
   ; Manual attributes from [aor] section:
   max_contacts=5

   ; Extension AUTH section
   [9991-AUTH](extension-auth)
   password=<hashed>
   ```

7. **Test Verification** (`test_18b_sip_providers_manualattributes_pjsip_conf.py::test_04_verify_provider_manualattributes_in_pjsip_conf()`):
   ```python
   # Wait for config regeneration (10 seconds)
   time.sleep(10)

   # Read pjsip.conf via REST API
   config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')

   # Parse provider sections
   lines = config.split('\n')
   provider_sections = {'endpoint': [], 'aor': [], 'auth': []}
   current_section = None

   for line in lines:
       if f'[{provider_id}]' in line:
           # Detect section type by template inheritance
           if 'endpoint' in line.lower():
               current_section = 'endpoint'
           elif 'aor' in line.lower():
               current_section = 'aor'
       elif f'[{provider_id}-AUTH]' in line:
           current_section = 'auth'
       elif current_section and not line.startswith('['):
           provider_sections[current_section].append(line.strip())

   # Verify [endpoint] parameters
   endpoint_section = '\n'.join(provider_sections['endpoint']).lower()
   assert 'device_state_busy_at=2' in endpoint_section
   assert 'direct_media=no' in endpoint_section
   assert 'force_rport=yes' in endpoint_section

   # Verify [aor] parameters
   aor_section = '\n'.join(provider_sections['aor']).lower()
   assert 'qualify_frequency=30' in aor_section
   ```

**POSSIBLE FAILURE SCENARIOS:**

1. **Worker Processing Delay:**
   - Test checks file before WorkerModelsEvents processes change
   - Debounce delay causes slower processing
   - Multiple config changes batched together

2. **Manual Attributes Parsing Failure:**
   - Invalid section headers (e.g., `[endpoint-wrong]` instead of `[endpoint]`)
   - Missing `=` in parameter lines
   - Section-less parameters (parameters before first section header)
   - Comments not properly skipped

3. **Config Generation Issues:**
   - Template inheritance prevents manual attributes from being written
   - Parameter filtering removes custom attributes
   - Section merging overwrites manual attributes with defaults

4. **Asterisk Reload Failure:**
   - PJSIP module reload fails
   - Configuration syntax errors prevent reload
   - Asterisk not running or responding

5. **Test Parsing Issues:**
   - Section detection logic doesn't match actual config structure
   - Template inheritance pattern not recognized
   - Parameter extraction misses parameters due to formatting

**DIAGNOSTIC STEPS:**

1. **Check Model Data:**
   ```bash
   docker exec mikopbx_tests-refactoring sqlite3 /cf/conf/mikopbx.db \
     "SELECT uniqid, manualattributes FROM m_Providers WHERE uniqid='SIP-PROVIDER-1234567890'"

   docker exec mikopbx_tests-refactoring sqlite3 /cf/conf/mikopbx.db \
     "SELECT number, manualattributes FROM m_Sip WHERE number='9991'"
   ```

2. **Check Generated Config:**
   ```bash
   docker exec mikopbx_tests-refactoring cat /etc/asterisk/pjsip.conf | grep -A 20 "SIP-PROVIDER-1234567890"
   docker exec mikopbx_tests-refactoring cat /etc/asterisk/pjsip.conf | grep -A 20 "\[9991\]"
   ```

3. **Check Worker Processing:**
   ```bash
   docker exec mikopbx_tests-refactoring tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -E "(WorkerModelsEvents|PJSIPConf|ReloadPJSIP)"
   ```

4. **Test Asterisk Config:**
   ```bash
   docker exec mikopbx_tests-refactoring asterisk -rx "pjsip show endpoints"
   docker exec mikopbx_tests-refactoring asterisk -rx "pjsip show endpoint SIP-PROVIDER-1234567890"
   ```

5. **Manual Config Regeneration:**
   ```bash
   docker exec mikopbx_tests-refactoring php -f /usr/www/src/Core/System/Triggers/Main.php generate_pjsip_conf
   ```

**COMPLETE FIX CHECKLIST:**

1. Verify manualattributes field is saved correctly in database
2. Check parseManualAttributes() correctly parses multi-section format
3. Ensure applyManualAttributesForSection() applies attributes to correct sections
4. Verify template inheritance doesn't prevent manual attributes
5. Check config generation timing (wait long enough for worker)
6. Test Asterisk config syntax is valid
7. Verify section detection in test matches actual config structure
8. Ensure parameter extraction handles all formatting variations

---

### Technical Reference Details

#### Test Configuration System

**File**: `tests/api/config.py`

**Key Classes**:
- `TestConfig` - Centralized configuration loader
- Reads from `.env` file (or environment variables)
- Supports multiple execution modes: docker, api, ssh, local

**Critical Properties**:
```python
config.api_url           # http://192.168.107.2/pbxcore/api/v3
config.api_username      # admin
config.api_password      # 123456789MikoPBX#1
config.execution_mode    # 'docker'
config.container_name    # 'mikopbx_tests-refactoring'
config.database_path     # '/cf/conf/mikopbx.db'
config.cdr_database_path # '/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db'
```

**Script Path Logic**:
```python
def get_script_path(self, script_name: str) -> str:
    if self.is_remote_execution():  # ssh or api
        return f'/storage/usbdisk1/mikopbx/python-tests/scripts/{script_name}'
    else:  # docker or local
        return f'/offload/rootfs/usr/www/tests/api/scripts/{script_name}'
```

#### Database Schemas

**m_CustomFiles** (`src/Common/Models/CustomFiles.php`):
```sql
CREATE TABLE m_CustomFiles (
    id INTEGER PRIMARY KEY,
    filepath TEXT NOT NULL,        -- e.g., '/etc/asterisk/pjsip.conf'
    content TEXT,                  -- Base64-decoded custom content
    mode TEXT DEFAULT '0',         -- '0'=none, '1'=append, '2'=override, '3'=script
    changed TEXT DEFAULT '1',      -- '1'=pending worker, '0'=applied
    description TEXT
);
```

**m_Providers** (SIP/IAX providers):
```sql
CREATE TABLE m_Providers (
    id INTEGER PRIMARY KEY,
    uniqid TEXT UNIQUE,            -- e.g., 'SIP-PROVIDER-1234567890'
    type TEXT,                     -- 'SIP' or 'IAX'
    description TEXT,
    host TEXT,
    username TEXT,
    secret TEXT,
    port INTEGER,
    manualattributes TEXT,         -- Multi-section PJSIP attributes
    disabled TEXT DEFAULT '0'
);
```

**m_Sip** (Extensions):
```sql
CREATE TABLE m_Sip (
    id INTEGER PRIMARY KEY,
    number TEXT UNIQUE,            -- Extension number (e.g., '201')
    secret TEXT,                   -- MD5 hashed SIP password
    manualattributes TEXT,         -- Multi-section PJSIP attributes
    transport TEXT DEFAULT 'udp',
    dtmfmode TEXT DEFAULT 'auto',
    enableRecording TEXT DEFAULT '0'
);
```

**m_Users** (Employees):
```sql
CREATE TABLE m_Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    language TEXT DEFAULT 'en-en'
);
```

**m_Extensions**:
```sql
CREATE TABLE m_Extensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE NOT NULL,
    userid INTEGER,                -- Foreign key to m_Users
    type TEXT,                     -- 'SIP', 'IAX', 'QUEUE', etc.
    FOREIGN KEY (userid) REFERENCES m_Users(id)
);
```

#### Worker System Components

**WorkerSafeScriptsCore** - Master supervisor
- **Location**: `src/Core/Workers/WorkerSafeScriptsCore.php`
- **Function**: Monitors all workers, restarts crashed workers
- **Check Interval**: 5 seconds
- **Check Methods**:
  - `CHECK_BY_BEANSTALK` - Ping/pong via Beanstalkd queue
  - `CHECK_BY_REDIS` - Heartbeat via Redis keys
  - `CHECK_BY_AMI` - Asterisk Manager Interface events
  - `CHECK_BY_PID_NOT_ALERT` - Simple process existence check

**WorkerModelsEvents** - Model change listener
- **Location**: `src/Core/Workers/WorkerModelsEvents.php`
- **Queue**: Beanstalkd (listens to model change events)
- **Debounce**: 10 seconds (batches rapid changes)
- **State Persistence**: Saves planned actions to Redis on restart
- **Planned Actions**:
  - `ApplyCustomFilesAction` - Apply custom file changes
  - `ReloadPJSIPAction` - Regenerate pjsip.conf and reload
  - `ReloadDialplanAction` - Regenerate extensions.conf
  - `ReloadIAXAction` - Regenerate iax.conf

**WorkerApiCommands** - REST API job processor
- **Location**: `src/PBXCoreREST/Workers/WorkerApiCommands.php`
- **Queue**: Redis (`api:requests`)
- **Pool Size**: 3 workers (configurable via `maxProc`)
- **Job Flow**:
  1. Controller queues job to Redis
  2. Worker pops job from queue
  3. Worker processes job (calls Processor → Action)
  4. Worker stores result in Redis (`api:results:{jobId}`)
  5. Controller retrieves result from Redis
  6. Result returned to client

#### File Locations

**Test Files**:
- Tests: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/api/`
- Scripts: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/api/scripts/`
- Fixtures: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/api/fixtures/`
- Helpers: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/api/helpers/`

**Container Paths** (docker mode):
- Script path: `/offload/rootfs/usr/www/tests/api/scripts/seed_cdr_database.sh`
- Main DB: `/cf/conf/mikopbx.db`
- CDR DB: `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db`
- Config files: `/etc/asterisk/` (pjsip.conf, extensions.conf, etc.)
- Logs: `/storage/usbdisk1/mikopbx/log/system/messages`

**MikoPBX Source**:
- REST API: `src/PBXCoreREST/`
- Models: `src/Common/Models/`
- Workers: `src/Core/Workers/`
- Config Generators: `src/Core/Asterisk/Configs/`
- Utilities: `src/Core/System/`

---

### Implementation Priority Order

**CRITICAL (Must Fix First):**
1. **Script Permissions** - Blocks all CDR tests
   - Fix: `chmod +x tests/api/scripts/seed_cdr_database.sh`
   - Impact: 30+ CDR tests depend on seeding

**HIGH (Core Functionality):**
2. **Employee Creation** - Blocks extension/employee tests
   - Investigate fixture format and field mapping
   - Check validation errors in API responses
   - Verify multi-entity save completes

3. **Custom Files Worker** - Blocks configuration tests
   - Check WorkerModelsEvents is running
   - Verify Beanstalkd service active
   - Increase test wait time if needed

**MEDIUM (Advanced Features):**
4. **Manual Attributes** - Advanced PJSIP configuration
   - Check manual attributes parsing logic
   - Verify config generation timing
   - Test section detection in verification code

---

### Debugging Commands Quick Reference

**Check Script Permissions:**
```bash
ls -la tests/api/scripts/seed_cdr_database.sh
chmod +x tests/api/scripts/seed_cdr_database.sh
```

**Check Container Status:**
```bash
docker ps | grep mikopbx_tests-refactoring
docker exec mikopbx_tests-refactoring ps aux | grep Worker
```

**Check Databases:**
```bash
docker exec mikopbx_tests-refactoring sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Users ORDER BY id DESC LIMIT 1"
docker exec mikopbx_tests-refactoring sqlite3 /storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db "SELECT COUNT(*) FROM cdr"
```

**Check Worker Logs:**
```bash
docker exec mikopbx_tests-refactoring tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -E "(Worker|Error)"
```

**Run Individual Test:**
```bash
pytest tests/api/test_00a_cdr_seed.py -v -s
pytest tests/api/test_14_extensions_create_single.py::test_create_single_employee -v -s
pytest tests/api/test_09_custom_files.py::TestCustomFilesAppendMode::test_02_verify_file_applied -v -s
```

**Check API Response:**
```python
import requests
response = requests.post('http://192.168.107.2/pbxcore/api/v3/employees',
    json=data,
    headers={'Authorization': 'Bearer <token>'})
print(response.json())
```

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
- [2025-12-06] Created task directory structure
