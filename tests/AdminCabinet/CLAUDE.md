# MikoPBX AdminCabinet Tests Documentation

This documentation provides an overview of the AdminCabinet test architecture, patterns, and best practices for writing browser automation tests in MikoPBX.

## Testing Framework

### Core Technologies
- **PHPUnit** - Primary testing framework
- **Facebook WebDriver (Selenium)** - Browser automation
- **BrowserStack** - Cloud-based cross-browser testing
- **Guzzle HTTP Client** - API requests to BrowserStack

## Directory Structure

```
tests/AdminCabinet/
├── Lib/                    # Base classes and traits
│   ├── MikoPBXTestsBase   # Main base class for all tests
│   ├── BrowserStackTest   # BrowserStack integration
│   └── Traits/            # Reusable trait components
├── Tests/                 # Test classes
│   ├── Data/             # Test data factories
│   ├── Extensions/       # Extension-related tests
│   ├── Traits/           # Test-specific traits
│   └── [Feature]Test.php # Individual test files
└── Utils/                # Helper classes
```

## Architecture Overview

### Base Classes
- **BrowserStackTest**: Provides BrowserStack integration and WebDriver setup
- **MikoPBXTestsBase**: Extends BrowserStackTest with MikoPBX-specific functionality
- All test classes should extend `MikoPBXTestsBase`

### Traits System
Tests use traits to organize and share functionality:
- **LoginTrait**: Authentication and session management
- **FormInteractionsTrait**: Form field manipulation
- **NavigationTrait**: Page navigation helpers
- **AssertionTrait**: Custom assertion methods

### Test Data Management
- **Data Factories**: Located in `Tests/Data/` for generating test entities
- **Example**: `CallQueueDataFactory`, `ExtensionsDataFactory`
- Factories provide consistent test data across tests

## Authentication System

### JWT-based Authentication

MikoPBX uses a modern JWT authentication system with two tokens:

**Access Token (15 minutes)**
- Short-lived JWT token for API requests
- Stored **only in browser memory** (TokenManager) - NOT in localStorage/cookies
- Automatically included in all AJAX requests via `Authorization: Bearer` header
- Auto-refreshed 2 minutes before expiration

**Refresh Token (30 days)**
- Long-lived token stored in **httpOnly cookie** (XSS protection)
- Set by server during login (`/pbxcore/api/v3/auth:login`)
- Used to obtain new access tokens (`/pbxcore/api/v3/auth:refresh`)
- Cannot be accessed or restored via JavaScript/WebDriver (security restriction)

### Test Authentication Flow

Each test session performs a fresh login:
```php
// 1. User fills login form with username/password
// 2. JavaScript submits to /pbxcore/api/v3/auth:login
// 3. Server returns accessToken (saved to memory) + sets refreshToken cookie
// 4. User is authenticated for this browser session
// 5. Cookies persist naturally within the session
```

**Important:** Cookie persistence between test sessions doesn't work due to httpOnly restrictions.
WebDriver cannot restore httpOnly cookies. To share sessions within a test suite, use
`processIsolation="false"` in phpunit.xml.

### Login Process Details
- **Primary credentials**: From test configuration (`admin` / `123456789MikoPBX#1`)
- **Fallback password**: `password2` parameter for changed passwords
- **Session indicator**: `#top-menu-search` element presence
- **Session sharing**: Use `processIsolation="false"` to share session across tests in same suite

## Writing Tests

### Test Class Structure
```php
class YourFeatureTest extends MikoPBXTestsBase
{
    public function testFeatureName(): void
    {
        // 1. Arrange - prepare test data
        $testData = $this->generateTestData();
        
        // 2. Act - perform actions
        $this->navigateToSection('section-name');
        $this->fillForm($testData);
        $this->submitForm();
        
        // 3. Assert - verify results
        $this->assertResultsAsExpected();
    }
}
```

### Common Patterns

#### Navigation
```php
// Navigate to specific section
$this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

// Open modification form
$this->clickModifyButtonOnRowWithText('Test Extension');
```

#### Form Interactions
```php
// Change input field value
$this->changeInputField('fieldname', 'value');

// Select dropdown option
$this->selectDropdownItem('dropdown-id', 'option-value');

// Submit form
$this->submitForm('form-id');
```

#### Waiting for Elements
```php
// Wait for element to be visible
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::id('element-id')
    )
);

// Wait for AJAX to complete
$this->waitForAjax();
```

#### Assertions
```php
// Check field value
$this->assertInputFieldValueEqual('field-id', 'expected-value');

// Check element visibility
$this->assertTrue($element->isDisplayed());

// Check menu item selection
$this->assertMenuItemSelected('menu-item-href');
```

## Handling Critical Operations

### Modal Confirmations
Critical operations (delete, reset) typically use modal dialogs:

```php
// 1. Trigger action
$resetButton->click();

// 2. Wait for modal
$modalXpath = "//div[contains(@class, 'modal') and contains(@class, 'visible')]";
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::xpath($modalXpath)
    )
);

// 3. Confirm action
$confirmButton = self::$driver->findElement(
    WebDriverBy::id('confirm-button-id')
);
$confirmButton->click();

// 4. Wait for modal to close
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::invisibilityOfElementLocated(
        WebDriverBy::xpath($modalXpath)
    )
);
```

### Error Handling
- Use try-catch blocks for non-critical assertions
- Log actions using `annotate()` for BrowserStack session tracking
- Capture screenshots on failures automatically

## Best Practices

### 1. Test Independence
- Each test should be able to run independently
- Use `setUp()` and `tearDown()` for initialization/cleanup
- Don't rely on test execution order

### 2. Data Management
- Use factories for consistent test data
- Clean up created data when possible
- Avoid hardcoded test values

### 3. Waiting Strategies
- Always wait for elements before interacting
- Use explicit waits over implicit waits
- Wait for AJAX requests to complete

### 4. Locator Strategies
- Prefer ID and data attributes over XPath
- Use semantic selectors when possible
- Avoid brittle selectors based on text content

### 5. BrowserStack Integration
- Use `annotate()` to mark test steps in BrowserStack logs
- Set proper test names and build identifiers
- Utilize BrowserStack's debugging features

## Running Tests

### Local Execution
```bash
# Run all tests
./vendor/bin/phpunit tests/AdminCabinet/Tests/

# Run specific test
./vendor/bin/phpunit tests/AdminCabinet/Tests/YourFeatureTest.php

# Run with specific browser
BROWSER=chrome ./vendor/bin/phpunit tests/AdminCabinet/Tests/
```

### BrowserStack Execution
- Configure credentials in test configuration
- Tests automatically run on BrowserStack when credentials are provided
- Results visible in BrowserStack dashboard

## Debugging Tests

### Common Issues
1. **Element not found**: Add explicit waits
2. **Stale element**: Re-find element after page updates
3. **Timing issues**: Use `waitForAjax()` after actions
4. **Session issues (JWT)**:
   - Verify TokenManager has time to complete /auth:refresh (add sleep(1) after page load)
   - Check BrowserStack logs for 401 Unauthorized errors
   - Ensure each test process performs fresh login
   - For shared sessions, use `processIsolation="false"`

### Debug Tools
- BrowserStack session recordings
- Screenshots on failure
- Browser console logs
- Network logs in BrowserStack

## Creating New Tests

### Checklist for New Tests
1. Extend `MikoPBXTestsBase`
2. Use appropriate traits
3. Follow naming convention: `[Feature]Test.php`
4. Add proper test documentation
5. Use data factories for test data
6. Handle authentication properly
7. Clean up test data if needed
8. Add BrowserStack annotations
9. Test in multiple browsers
10. Verify test independence

### Example Test Template
```php
<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class NewFeatureTest extends MikoPBXTestsBase
{
    /**
     * Test setup
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setUpBeforeClass();
    }

    /**
     * Test feature functionality
     * 
     * @dataProvider featureDataProvider
     */
    public function testFeature(array $testData): void
    {
        self::annotate("Test: Feature Name");
        
        // Test implementation
    }

    /**
     * Data provider for test
     */
    public function featureDataProvider(): array
    {
        return [
            'scenario1' => [['data' => 'value']],
            'scenario2' => [['data' => 'other']],
        ];
    }
}
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- Parallel execution support
- Retry logic for flaky tests
- Detailed reporting
- BrowserStack integration for cross-browser testing
- Failure screenshots and logs

## Maintenance

### Keeping Tests Healthy
1. Regularly review and update selectors
2. Monitor test execution times
3. Fix flaky tests promptly
4. Update tests when UI changes
5. Remove obsolete tests
6. Keep test data factories current

### Performance Optimization
- Minimize page reloads
- Batch similar operations
- Use efficient selectors
- Leverage session caching
- Parallelize where possible

## JWT Authentication Troubleshooting

### Understanding httpOnly Cookie Limitation

**Important:** WebDriver cannot save or restore httpOnly cookies due to browser security restrictions. This means:
- Each test process requires a fresh login
- Cookies persist naturally within a single browser session
- To share sessions across multiple tests, use `processIsolation="false"` in phpunit.xml

### Monitoring JWT Flow in BrowserStack

**Check Browser Console Logs:**
```
[LOGIN] API Response: {result: true, hasData: true, hasAccessToken: true}
[LOGIN] Storing access token in TokenManager...
[LOGIN] Token stored, redirecting...

// On subsequent page loads within same session:
TokenManager.initialize() -> /auth:refresh -> success
```

**Common JWT Test Issues**

| Symptom | Cause | Solution |
|---------|-------|----------|
| Stuck on login page | TokenManager timeout | Add `waitForAjax()` after navigation |
| 401 Unauthorized | Token expired mid-test | Login timeout - tests should complete within 15 min |
| Token not in headers | AJAX before TokenManager ready | Ensure `waitForAjax()` before API calls |
| Login fails intermittently | Form not fully loaded | Add explicit wait for login form elements |

### Debugging Test Authentication

**1. Verify TokenManager Initialization**
```php
// Add to test after navigation:
$script = "return window.TokenManager && window.TokenManager.isAuthenticated();";
$isAuth = self::$driver->executeScript($script);
self::annotate("TokenManager authenticated: " . ($isAuth ? 'YES' : 'NO'));
$this->assertTrue($isAuth, 'TokenManager not authenticated');
```

**2. Check Network Activity in BrowserStack**
```php
// Enable network logs via capabilities:
'browserstack.networkLogs' => 'true'

// Expected requests:
// - POST /pbxcore/api/v3/auth:login (on login)
// - POST /pbxcore/api/v3/auth:refresh (on page load with valid refreshToken)
// - All AJAX requests should have Authorization: Bearer header
```

**3. Verify Login Form Presence**
```php
// Check if login form exists before attempting login:
$loginForm = self::$driver->findElement(WebDriverBy::id('login-form'));
$this->assertTrue($loginForm->isDisplayed(), 'Login form not visible');
```

### Best Practices for JWT Tests

1. **Allow time for TokenManager initialization**
   ```php
   $this->waitForAjax();
   sleep(1); // Give TokenManager time to complete /auth:refresh
   ```

2. **Use BrowserStack annotations for debugging**
   ```php
   self::annotate('Performing login');
   self::annotate('Navigating to extensions page');
   self::annotate('Form submitted successfully');
   ```

3. **Share sessions within test suite for performance**
   ```xml
   <!-- In phpunit.xml -->
   <phpunit processIsolation="false">
       <!-- Tests share same browser session, avoiding repeated logins -->
   </phpunit>
   ```

4. **Monitor token expiration in long tests**
   - Access token: 15 min (auto-refreshed at 13 min)
   - Refresh token: 30 days (persists within browser session)
   - Tests longer than 13 minutes will trigger automatic token refresh