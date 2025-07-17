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

### Cookie-based Session Management
```php
// Authentication flow in LoginTrait
1. Try to restore session from cookies
2. If failed, perform regular login
3. Use alternative password if primary fails
4. Save cookies for subsequent tests
```

### Login Process
- **Primary credentials**: From test configuration
- **Fallback password**: `password2` parameter for changed passwords
- **Session indicator**: `#top-menu-search` element presence
- **Cookie storage**: Enables session reuse across test runs

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
4. **Session issues**: Check cookie handling

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