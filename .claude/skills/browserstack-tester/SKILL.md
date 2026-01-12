---
name: browserstack-tester
description: Тестирование веб-интерфейса MikoPBX через BrowserStack. Запуск PHPUnit тестов с Selenium WebDriver в облачных браузерах. Использовать для автоматизированного тестирования админ-панели, проверки форм, навигации и интерактивных элементов.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# BrowserStack Web UI Tester

Тестирование веб-интерфейса MikoPBX через BrowserStack. Запуск PHPUnit тестов с Selenium WebDriver в облачных браузерах. Использовать для автоматизированного тестирования админ-панели, проверки форм, навигации и интерактивных элементов.

## Prerequisites

**BrowserStack Local must be running on the host machine:**

```bash
# In a separate terminal on macOS host:
cd ~/PhpstormProjects/mikopbx/Core/tests/AdminCabinet
./start-browserstack-local.sh
```

This creates a secure tunnel between BrowserStack cloud browsers and local PBX server.

## Running Tests

### Basic Test Execution

```bash
# Run specific test file
docker exec -t mikopbx_tests-refactoring /bin/sh -c "
  cd /offload/rootfs/usr/www &&
  SERVER_PBX=https://172.16.32.72 \
  BROWSERSTACK_DAEMON_STARTED=true \
  BROWSERSTACK_LOCAL_IDENTIFIER=local_test \
  php vendor/bin/phpunit \
  --configuration tests/Unit/phpunit.xml \
  tests/AdminCabinet/Tests/YourTest.php"
```

### Run Specific Test Method

```bash
docker exec -t mikopbx_tests-refactoring /bin/sh -c "
  cd /offload/rootfs/usr/www &&
  SERVER_PBX=https://172.16.32.72 \
  BROWSERSTACK_DAEMON_STARTED=true \
  BROWSERSTACK_LOCAL_IDENTIFIER=local_test \
  php vendor/bin/phpunit \
  --configuration tests/Unit/phpunit.xml \
  tests/AdminCabinet/Tests/NetworkInterfacesTest.php \
  --filter testAddNewVLAN"
```

### Run Multiple Tests

```bash
# Use pipe (|) to run multiple test methods
--filter 'testAddNewVLAN|testStaticRoutes|testIPv6ManualConfiguration'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PBX` | PBX server URL | `https://172.16.32.72` |
| `BROWSERSTACK_DAEMON_STARTED` | Skip local tunnel start | `true` |
| `BROWSERSTACK_LOCAL_IDENTIFIER` | Tunnel identifier | `local_test` |

## Test Structure

All tests extend `MikoPBXTestsBase`:

```php
class MyFeatureTest extends MikoPBXTestsBase
{
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: My Feature Name");
    }

    public function testMyFeature(): void
    {
        // Navigate to page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/my-feature/modify/");
        $this->waitForAjax();

        // Interact with form
        $this->changeInputField('fieldName', 'value');
        $this->selectDropdownItem('dropdown-id', 'option-value');
        $this->changeCheckBoxState('checkbox-name', true);

        // Submit and verify
        $this->submitForm('form-id');
        $this->assertInputFieldValueEqual('fieldName', 'value');
    }
}
```

## Key Helper Methods

### Navigation
- `clickSidebarMenuItemByHref($href)` - Navigate via sidebar menu
- `changeTabOnCurrentPage($tabId)` - Switch tabs
- `waitForAjax()` - Wait for AJAX requests to complete

### Form Interactions
- `changeInputField($name, $value)` - Set input field value
- `selectDropdownItem($id, $value)` - Select dropdown option
- `changeCheckBoxState($name, $checked)` - Toggle checkbox
- `submitForm($formId)` - Submit form

### Assertions
- `assertInputFieldValueEqual($name, $expected)` - Check input value
- `assertCheckBoxStageIsEqual($name, $expected)` - Check checkbox state
- `assertMenuItemSelected($id, $value)` - Check dropdown selection

## Test Files Location

- **Test classes**: `tests/AdminCabinet/Tests/`
- **Base class**: `tests/AdminCabinet/Lib/MikoPBXTestsBase.php`
- **PHPUnit config**: `tests/Unit/phpunit.xml`
- **Test data factories**: `tests/AdminCabinet/Tests/Data/`

## BrowserStack Dashboard

View test recordings and logs at:
https://automate.browserstack.com/dashboard/

## Common Patterns

### Wait for Element
```php
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::id('element-id')
    )
);
```

### Find Element by XPath
```php
$element = self::$driver->findElement(
    WebDriverBy::xpath("//div[contains(@class, 'my-class')]")
);
```

### CSS Selector
```php
$rows = self::$driver->findElements(
    WebDriverBy::cssSelector('#my-table tbody tr:not(.template)')
);
```

## References

- [Test Patterns](reference/test-patterns.md) - Common testing patterns
- [Troubleshooting](reference/troubleshooting.md) - Common issues and solutions
