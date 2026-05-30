# CLAUDE.md - MikoPBX AdminCabinet Browser Tests

PHPUnit + Selenium WebDriver browser automation tests with BrowserStack cloud testing.

For BrowserStack account/local-binary setup, see `BROWSERSTACK_SETUP.md`. For JUnit
upload details, see `JUNIT_UPLOAD_GUIDE.md`. For a quick overview, see `README.md`.

## File Inventory

```
tests/AdminCabinet/
├── phpunit.xml                # Main config (26 suites, JUnit/HTML output)
├── phpunit-audiofiles.xml     # Audio-files suite (shares one BrowserStack session)
├── debug-unit.xml             # Debug configuration
│
├── Lib/                       # Base classes and core functionality
│   ├── BrowserStackTest.php           # WebDriver setup, BrowserStack capabilities
│   ├── MikoPBXTestsBase.php           # Main base class (extends BrowserStackTest)
│   ├── BrowserStackReportUploader.php # Report upload utilities
│   ├── globals.php                    # Global test configuration
│   ├── Exceptions/TestException.php   # Custom test exception
│   └── Traits/                        # Core interaction traits (see below)
│
├── Tests/                     # Test files, organized by feature
│   ├── Data/                  # One DataFactory per feature (static test data)
│   ├── Traits/                # Test-specific traits (Login, EntityCreation,
│   │                          #   TabNavigation, ModuleXPaths, per-feature helpers)
│   ├── Extensions/            # Per-employee tests (generated)
│   ├── AudioFiles/  MOHFiles/  ConferenceRooms/  CallQueues/  IVRMenus/
│   ├── DialplanApplications/  OutOfWorkPeriods/
│   ├── OutgoingCallRules/  IncomingCallRules/
│   ├── SIPProviders/  IAXProviders/  FirewallRules/  AMIUsers/  PBXExtensions/  Special/
│   ├── BrowserStackSmokeTest.php # Smoke test: open + log in to MikoPBX
│   └── [Root-level tests]     # Orchestration tests (Login, Create*, Fill*, Change*,
│                              #   Delete*, NetworkInterfaces, Storage*, CheckDropdown*)
│
├── Scripts/                   # Generate*.php test generators + runner/upload shell scripts
│                              #   run-browserstack-arch-matrix.sh + ensure-browserstack-targets.sh
│                              #   (ARM64/AMD64 BrowserStack arch matrix)
├── README.md                  # Quick overview of the AdminCabinet test suite
├── config/                    # local.conf.json (create from .example / .template)
└── assets/                    # UI reference screenshots (*.png) + test audio (*.wav)
```

Generated test classes (`Tests/Extensions/`, `Tests/CallQueues/`, etc.) are created by
the matching `Scripts/Generate*.php` from the `Tests/Data/*DataFactory.php` static arrays.

## Architecture

### Inheritance Chain

```
PHPUnit\Framework\TestCase
  → BrowserStackTest    # WebDriver init, BrowserStack capabilities, annotations
    → MikoPBXTestsBase  # MikoPBX login, trait compositions, retry logic
      → Individual Test # Feature-specific test class
```

`MikoPBXTestsBase` composes the core `Lib/Traits/` plus `LoginTrait` (from `Tests/Traits/`):

- `AssertionTrait` — assertInputFieldValueEqual, assertCheckboxState, assertTextAreaValueEqual, assertMenuItemSelected
- `DropdownInteractionTrait` — selectDropdownItem, assertDropdownSelection
- `ElementInteractionTrait` — findElementSafely, waitForElement, clickModifyButtonOnRowWithID
- `FormInteractionTrait` — changeInputField, changeCheckBoxState, submitForm
- `NavigationTrait` — clickSidebarMenuItemByHref, openAccordionOnThePage
- `ScreenshotTrait` — takeScreenshot
- `TableSearchTrait` — searchEntityInTable, extensionExistsBySearch
- `LoginTrait` — fresh per-process login

### JWT Authentication & session sharing (gotcha)

- **Access Token**: 15-min, stored in browser memory (TokenManager).
- **Refresh Token**: 30-day, httpOnly cookie — WebDriver cannot persist it across
  isolated PHP processes.
- Because of that, tests rely on **processIsolation being off** so a single browser
  session stays alive (PHPUnit's default; set explicitly as `processIsolation="false"`
  in `phpunit-audiofiles.xml` to share one BrowserStack session). Each isolated process
  that does start performs a fresh login.
- **Session indicator**: presence of the `#top-menu-search` element.

## Test Organization

### Flow Pattern

```
Login → Create entities → Verify → Modify → Verify dropdowns → Delete → Cleanup
```

### Test Suites (phpunit.xml)

26 suites organized by feature: passwords, BrowserStackSmoke, PBXSettings, StorageRetentionPeriod,
AudioFiles (pre/during/post creation), Extensions (before/after creation),
ConferenceRooms, DialplanApplications, CallQueues, IVRMenus, Providers (SIP, IAX),
Routes (Incoming, Outgoing), FirewallRules, AMIUsers, Modules, CheckDropdowns
(verification after all entities exist), DeleteAll (cleanup).

### Data Factories

`Tests/Data/*DataFactory.php` expose static arrays of consistent test data, keyed by
entity. Example shape (`EmployeeDataFactory`):

```php
'smith.james' => [
    'number' => 201, 'username' => 'Smith James',
    'mobile' => '89261111111', 'email' => '',
    'secret' => '5b66b92d5714f921cfcde78a4fda0f58',
    'sip_enableRecording' => true, 'sip_dtmfmode' => 'auto',
    'sip_networkfilterid' => 'none', 'sip_transport' => 'udp,tcp',
    'fwd_ringlength' => '45', 'fwd_forwardingonbusy' => '89261111111',
    'possibleToDelete' => false,
],
```

## Common Test Patterns

```php
// Navigation
$this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
$this->clickModifyButtonOnRowWithText('Test Extension');

// Form interaction
$this->changeInputField('fieldname', 'value');
$this->selectDropdownItem('dropdown-id', 'option-value');
$this->changeCheckBoxState('checkbox-id', true);
$this->submitForm('form-id');

// Assertions
$this->assertInputFieldValueEqual('field-id', 'expected-value');
$this->assertCheckboxState('checkbox-id', true);

// Waiting
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(WebDriverBy::id('element-id'))
);
$this->waitForAjax();
```

Modal confirmation: wait for `//div[contains(@class,'modal') and contains(@class,'visible')]`
to become visible, click confirm, then wait for the same XPath to become invisible.

## Running Tests

```bash
# All tests
./vendor/bin/phpunit -c tests/AdminCabinet/phpunit.xml

# Specific suite
./vendor/bin/phpunit -c tests/AdminCabinet/phpunit.xml --testsuite Extensions

# Specific test
./vendor/bin/phpunit tests/AdminCabinet/Tests/Extensions/SmithJamesTest.php

# With BrowserStack (configured in local.conf.json)
BROWSERSTACK_USERNAME=user BROWSERSTACK_ACCESS_KEY=key ./vendor/bin/phpunit ...

# Run and upload results
bash tests/AdminCabinet/Scripts/run-tests-and-upload.sh
```

## Debugging

- **BrowserStack**: session recordings, network logs, console logs.
- **Screenshots**: captured on failure via `ScreenshotTrait`.
- **Annotations**: `self::annotate('step description')` adds BrowserStack log markers.
- **TokenManager check**:
  ```php
  $isAuth = self::$driver->executeScript(
      "return window.TokenManager && window.TokenManager.isAuthenticated();"
  );
  ```

## Creating New Tests

1. Create a data factory in `Tests/Data/` with static arrays.
2. Create a test generator in `Scripts/Generate*.php`.
3. Run the generator to create individual test files.
4. Add the test suite to `phpunit.xml`.
5. Extend `MikoPBXTestsBase`; use the relevant form/navigation/assertion traits.
6. Add `self::annotate()` calls for BrowserStack debugging.
