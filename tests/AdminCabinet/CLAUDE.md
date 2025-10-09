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

### JWT-based Authentication with Cookie Persistence

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
- Survives browser restarts

### Test Authentication Flow

#### First Test (Full Login)
```php
// 1. User fills login form with username/password
// 2. JavaScript submits to /pbxcore/api/v3/auth:login
// 3. Server returns accessToken (saved to memory) + sets refreshToken cookie
// 4. Browser navigates to dashboard
// 5. CookieManager.saveCookies() saves all cookies including refreshToken
```

#### Subsequent Tests (Cookie Restoration)
```php
// 1. CookieManager.loadCookies() restores refreshToken cookie
// 2. Browser navigates to page
// 3. TokenManager.initialize() calls /auth:refresh using refreshToken cookie
// 4. Server returns new accessToken (saved to memory)
// 5. User is authenticated without entering password
```

### Login Process Details
- **Primary credentials**: From test configuration (`admin` / `123456789MikoPBX#1`)
- **Fallback password**: `password2` parameter for changed passwords
- **Session indicator**: `#top-menu-search` element presence
- **Cookie storage**: Enables session reuse across test runs via refreshToken
- **Auto-recovery**: If refreshToken expires, tests fall back to full login

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
   - Check that refreshToken cookie is being saved/restored
   - Verify TokenManager has time to complete /auth:refresh (add sleep(2) after page load)
   - Check BrowserStack logs for 401 Unauthorized errors
   - Ensure cookie domain matches test environment

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

### Verifying JWT Flow in Tests

**Check Cookie Storage Location**
```bash
# Default: /tmp/selenium_cookies/
# Override: Set SELENIUM_COOKIE_DIR environment variable
echo $SELENIUM_COOKIE_DIR
ls -la /tmp/selenium_cookies/
```

**Verify refreshToken Cookie in Saved Cookies**
```bash
# After first test run, check saved cookie file
cat /tmp/selenium_cookies/cookies_*.json | jq '.[] | select(.name=="refreshToken")'

# Expected output:
{
  "name": "refreshToken",
  "value": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "domain": "your-pbx-domain",
  "path": "/",
  "httpOnly": true,
  "secure": true
}
```

**Monitor BrowserStack Console Logs**

In BrowserStack session, check browser console for:
```
[LOGIN] API Response: {result: true, hasData: true, hasAccessToken: true}
[LOGIN] Storing access token in TokenManager...
[LOGIN] Token stored, redirecting...

// On subsequent page loads:
TokenManager.initialize() -> /auth:refresh -> success
```

**Common JWT Test Failures**

| Symptom | Cause | Solution |
|---------|-------|----------|
| Tests fail on 2nd run | refreshToken not saved | Check CookieManager.saveCookies() called after login |
| Stuck on login page | TokenManager timeout | Add sleep(2) after navigate in tryLoginWithCookies() |
| 401 Unauthorized | refreshToken expired | Delete cookie file, force fresh login |
| Token not in headers | AJAX before TokenManager ready | Ensure window.tokenManagerReady promise |

### Manual Verification Steps

**1. Test Cookie Persistence**
```php
// In your test:
$this->cookieManager->saveCookies();
$cookies = self::$driver->manage()->getCookies();
$hasRefreshToken = false;
foreach ($cookies as $cookie) {
    if ($cookie->getName() === 'refreshToken') {
        $hasRefreshToken = true;
        self::annotate("RefreshToken found: " . substr($cookie->getValue(), 0, 20) . "...");
    }
}
$this->assertTrue($hasRefreshToken, 'RefreshToken cookie not found');
```

**2. Verify TokenManager Initialization**
```php
// Add to test after navigation:
$script = "return window.TokenManager && window.TokenManager.isAuthenticated();";
$isAuth = self::$driver->executeScript($script);
self::annotate("TokenManager authenticated: " . ($isAuth ? 'YES' : 'NO'));
$this->assertTrue($isAuth, 'TokenManager not authenticated');
```

**3. Check Network Activity**
```php
// In BrowserStack, enable network logs via capabilities:
'browserstack.networkLogs' => 'true'

// Then check for:
// - POST /pbxcore/api/v3/auth:login (first test)
// - POST /pbxcore/api/v3/auth:refresh (subsequent tests)
// - All other requests should have Authorization: Bearer header
```

### Best Practices for JWT Tests

1. **Always allow time for TokenManager**
   ```php
   $this->waitForAjax();
   sleep(2); // TokenManager.initialize() async call
   $this->waitForAjax();
   ```

2. **Use BrowserStack annotations**
   ```php
   self::annotate('Attempting JWT token refresh');
   self::annotate('Session restored successfully');
   ```

3. **Clean cookie storage between test suites**
   ```bash
   # Before running full suite:
   rm -rf /tmp/selenium_cookies/
   ```

4. **Monitor token expiration in long tests**
   - Access token: 15 min (auto-refreshed at 13 min)
   - Refresh token: 30 days
   - Long-running tests (>13 min) will auto-refresh transparently