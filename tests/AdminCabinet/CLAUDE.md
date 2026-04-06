# CLAUDE.md - MikoPBX AdminCabinet Browser Tests

PHPUnit + Selenium WebDriver browser automation tests with BrowserStack cloud testing.

## File Inventory

```
tests/AdminCabinet/
├── phpunit.xml                        # Main config (20+ suites, JUnit/HTML output)
├── phpunit-audiofiles.xml             # Audio files suite config
├── debug-unit.xml                     # Debug configuration
│
├── Lib/                               # Base classes and core functionality
│   ├── BrowserStackTest.php           # WebDriver setup, BrowserStack integration
│   ├── MikoPBXTestsBase.php           # Main base class (extends BrowserStackTest)
│   ├── BrowserStackReportUploader.php # Report upload utilities
│   ├── globals.php                    # Global test configuration
│   ├── Exceptions/
│   │   └── TestException.php          # Custom test exception
│   └── Traits/                        # 7 core traits
│       ├── AssertionTrait.php         # assertInputFieldValueEqual, assertCheckboxState
│       ├── DropdownInteractionTrait.php # selectDropdownItem, assertDropdownSelection (27KB)
│       ├── ElementInteractionTrait.php  # clickElement, waitForElement
│       ├── FormInteractionTrait.php     # changeInputField, changeCheckBoxState, submitForm
│       ├── NavigationTrait.php          # clickSidebarMenuItemByHref, openAccordionOnThePage
│       ├── ScreenshotTrait.php          # takeScreenshot
│       └── TableSearchTrait.php         # searchTableByInputName, extensionExistsBySearch
│
├── Tests/                             # 130 test files
│   ├── Data/                          # 17 data factories
│   │   ├── AmiUserDataFactory.php
│   │   ├── AudioFilesDataFactory.php
│   │   ├── CallQueueDataFactory.php
│   │   ├── ConferenceRoomsDataFactory.php
│   │   ├── DialplanApplicationsDataFactory.php
│   │   ├── EmployeeDataFactory.php    # 22 employee profiles
│   │   ├── FirewallRulesDataFactory.php
│   │   ├── IAXProviderDataFactory.php
│   │   ├── IncomingCallRulesDataFactory.php
│   │   ├── IVRMenuDataFactory.php
│   │   ├── ModuleDataFactory.php
│   │   ├── MOHAudioFilesDataFactory.php
│   │   ├── OutgoingCallRulesDataFactory.php
│   │   ├── OutOfWorkPeriodsDataFactory.php
│   │   ├── PBXSettingsDataFactory.php
│   │   ├── SIPProviderDataFactory.php
│   │   └── StorageDataFactory.php
│   │
│   ├── Traits/                        # 10 test-specific traits
│   │   ├── AmiPermissionsTrait.php
│   │   ├── AudioFilesTrait.php
│   │   ├── EntityCreationTrait.php
│   │   ├── FirewallRulesTrait.php
│   │   ├── IncomingCallRulesTrait.php
│   │   ├── LoginTrait.php
│   │   ├── ModuleXPathsTrait.php
│   │   ├── OutgoingCallRulesTrait.php
│   │   ├── OutOfWorkPeriodsTrait.php
│   │   └── TabNavigationTrait.php
│   │
│   ├── Extensions/                    # 22 individual employee tests
│   ├── AudioFiles/                    # 5 tests
│   ├── ConferenceRooms/               # 10 tests
│   ├── DialplanApplications/          # 11 tests
│   ├── CallQueues/                    # 2 tests
│   ├── MOHFiles/                      # 4 tests
│   ├── OutOfWorkPeriods/              # 5 tests
│   ├── OutgoingCallRules/             # 4 tests
│   ├── IncomingCallRules/             # 3 tests
│   ├── IAXProviders/                  # 4 tests
│   ├── SIPProviders/                  # 4 tests
│   ├── FirewallRules/                 # 3 tests
│   ├── AMIUsers/                      # 2 tests
│   ├── PBXExtensions/                 # 7 module tests
│   ├── Special/                       # 1 test
│   │
│   └── [Root-level tests]             # ~30 orchestration tests
│       ├── LoginTest.php
│       ├── CreateExtensionsTest.php   # Abstract base
│       ├── ChangeExtensionsSettingsTest.php
│       ├── DeleteExtensionTest.php
│       ├── CreateAudioFileTest.php
│       ├── CreateConferenceRoomsTest.php
│       ├── CreateCallQueueTest.php
│       ├── CreateSIPProviderTest.php
│       ├── CreateIAXProviderTest.php
│       ├── CreateIncomingCallRuleTest.php
│       ├── CreateOutgoingCallRuleTest.php
│       ├── CreateIVRMenuTest.php
│       ├── CreateDialPlanApplicationTest.php
│       ├── CreateOutOfWorkPeriodTest.php
│       ├── CreateFirewallRuleTest.php
│       ├── CreateAmiUserTest.php
│       ├── CreateFail2BanRulesTest.php
│       ├── InstallModuleTest.php
│       ├── FillPBXSettingsTest.php
│       ├── FillDataTimeSettingsTest.php
│       ├── ChangeWeakPasswordTest.php
│       ├── ChangeLicenseKeyTest.php
│       ├── NetworkInterfacesTest.php
│       ├── StorageRetentionPeriodTest.php
│       ├── StorageS3SettingsTest.php
│       ├── CustomFileChangeTest.php
│       ├── DeleteAllSettingsTest.php
│       └── CheckDropdown*Tests.php    # 6 dropdown verification tests
│
├── Scripts/                           # 16 files
│   ├── Generate*.php                  # 15 test generators (from data factories)
│   ├── run-tests-and-upload.sh        # Main test runner
│   ├── test-upload-report.php         # Report upload helper
│   └── upload-junit-to-browserstack.sh
│
├── config/
│   ├── local.conf.json                # Local test configuration
│   ├── local.conf.json.example
│   └── local.conf.json.template
│
└── assets/                            # Test resources
    ├── *.png                          # 26 UI reference screenshots
    └── *.wav                          # 3 test audio samples
```

## Architecture

### Inheritance Chain

```
PHPUnit\Framework\TestCase
  → BrowserStackTest          # WebDriver init, BrowserStack capabilities, annotations
    → MikoPBXTestsBase        # MikoPBX login, 8 trait compositions, retry logic
      → Individual Test        # Feature-specific test class
```

### MikoPBXTestsBase Traits

```php
class MikoPBXTestsBase extends BrowserStackTest
{
    use AssertionTrait;              // assertInputFieldValueEqual, assertCheckboxState
    use DropdownInteractionTrait;    // selectDropdownItem, assertDropdownSelection
    use ElementInteractionTrait;     // clickElement, waitForElement
    use FormInteractionTrait;        // changeInputField, submitForm
    use NavigationTrait;             // clickSidebarMenuItemByHref
    use ScreenshotTrait;             // takeScreenshot
    use TableSearchTrait;            // searchTableByInputName
    // + LoginTrait from Tests/Traits
}
```

### JWT Authentication

- **Access Token**: 15-min, stored in browser memory (TokenManager)
- **Refresh Token**: 30-day, httpOnly cookie (cannot be persisted by WebDriver)
- **Session sharing**: `processIsolation="false"` in phpunit.xml
- **Per-process login**: Each isolated process performs fresh login
- **Session indicator**: `#top-menu-search` element presence

## Test Organization

### Flow Pattern

```
Login → Create entities → Verify → Modify → Verify dropdowns → Delete → Cleanup
```

### Test Suites (phpunit.xml)

20+ suites organized by feature:
- TestMikoPBXPasswords, PBXSettings, StorageRetentionPeriod
- AudioFiles (pre/during/post creation)
- Extensions (with before/after creation)
- ConferenceRooms, DialplanApplications, CallQueues, IVRMenus
- Providers (SIP, IAX), Routes (Incoming, Outgoing)
- FirewallRules, AMIUsers, Modules
- CheckDropdowns (verification after all entities created)
- DeleteAll (cleanup)

### Data Factories

Static arrays providing consistent test data:

```php
// EmployeeDataFactory — 22 profiles
[
    'smith.james' => [
        'number' => '201', 'email' => 'smith@example.com',
        'secret' => 'SRTP123', 'dtmfmode' => 'auto',
        'fwd_ringlength' => '15', 'fwd_forwardingonbusy' => '202',
        'possibleToDelete' => true,
    ],
    // ... 21 more profiles
]
```

### Test Generators (Scripts/)

15 generators auto-create test classes from data factories:
- `GenerateExtensionTests.php` → `Tests/Extensions/SmithJamesTest.php`
- `GenerateCallQueueTests.php` → `Tests/CallQueues/Queue1Test.php`
- etc.

## Common Test Patterns

### Navigation

```php
$this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
$this->clickModifyButtonOnRowWithText('Test Extension');
```

### Form Interaction

```php
$this->changeInputField('fieldname', 'value');
$this->selectDropdownItem('dropdown-id', 'option-value');
$this->changeCheckBoxState('checkbox-id', true);
$this->submitForm('form-id');
```

### Assertions

```php
$this->assertInputFieldValueEqual('field-id', 'expected-value');
$this->assertTextAreaValueEqual('textarea-id', 'expected');
$this->assertCheckboxState('checkbox-id', true);
$this->assertMenuItemSelected('menu-item-href');
```

### Waiting

```php
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::id('element-id')
    )
);
$this->waitForAjax();
```

### Modal Confirmation

```php
$resetButton->click();
$modalXpath = "//div[contains(@class, 'modal') and contains(@class, 'visible')]";
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(WebDriverBy::xpath($modalXpath))
);
$confirmButton->click();
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::invisibilityOfElementLocated(WebDriverBy::xpath($modalXpath))
);
```

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

- **BrowserStack**: Session recordings, network logs, console logs
- **Screenshots**: Captured on failure via `ScreenshotTrait`
- **Annotations**: `self::annotate('step description')` for BrowserStack logs
- **TokenManager check**:
  ```php
  $isAuth = self::$driver->executeScript(
      "return window.TokenManager && window.TokenManager.isAuthenticated();"
  );
  ```

## Creating New Tests

1. Create data factory in `Tests/Data/` with static arrays
2. Create test generator in `Scripts/Generate*.php`
3. Run generator to create individual test files
4. Add test suite to `phpunit.xml`
5. Use `MikoPBXTestsBase` as base class
6. Use appropriate traits for form/navigation/assertion
7. Add `self::annotate()` calls for BrowserStack debugging
